import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Every folder open used to hit WebDAV with a PROPFIND even when the user had
// just been in that folder. 30s is the freshness compromise: direct cloud
// uploads appear within one window, while our own delete path invalidates
// immediately (see /api/photos/delete).
const TTL_MS = 30_000;

const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '.data');
const LISTING_DIR = path.join(CACHE_DIR, 'listing');

export type ListingState = 'HIT' | 'STALE' | 'MISS';

interface Entry<T> {
  fetchedAt: number;
  data: T;
}

export interface CachedListing<T> {
  data: T;
  state: ListingState;
}

// One in-flight refresh per key: ten users opening the same cold folder must
// produce one PROPFIND, not ten.
const inflight = new Map<string, Promise<Entry<unknown>>>();

function fileFor(key: string): string {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(LISTING_DIR, `${hash}.json`);
}

function readEntry<T>(key: string): Entry<T> | null {
  try {
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ fileFor(key), 'utf8');
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !('data' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeEntry<T>(key: string, entry: Entry<T>): Promise<void> {
  const target = fileFor(key);
  await fsp.mkdir(/*turbopackIgnore: true*/ LISTING_DIR, { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(entry));
  // rename is atomic within one filesystem: a reader never sees a half file.
  await fsp.rename(tmp, target);
}

function refresh<T>(key: string, fetcher: () => Promise<T>): Promise<Entry<T>> {
  const existing = inflight.get(key) as Promise<Entry<T>> | undefined;
  if (existing) return existing;
  const job = (async () => {
    const data = await fetcher();
    const entry: Entry<T> = { fetchedAt: Date.now(), data };
    await writeEntry(key, entry);
    return entry;
  })().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, job);
  return job;
}

export async function getListing<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<CachedListing<T>> {
  const entry = readEntry<T>(key);
  if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
    return { data: entry.data, state: 'HIT' };
  }
  if (entry) {
    // Serve stale immediately and refresh behind the response. A failed
    // refresh leaves the old file in place, so the next request retries.
    void refresh(key, fetcher).catch(() => {});
    return { data: entry.data, state: 'STALE' };
  }
  const fresh = await refresh(key, fetcher);
  return { data: fresh.data, state: 'MISS' };
}

export function invalidateListing(key: string): void {
  try {
    fs.rmSync(/*turbopackIgnore: true*/ fileFor(key), { force: true });
  } catch {
    // A missing cache file is already the desired state.
  }
}

import { NextResponse } from 'next/server';
import { getWebDAVClient, getWebDAVConfig } from '@/lib/webdav';

// A probe that can hang as long as the outage it is meant to catch is useless.
const WEBDAV_TIMEOUT_MS = 5_000;

// Never let a CDN or browser cache a stale "ok" while the gallery is down.
const NO_STORE = { 'Cache-Control': 'no-store' };

// Neither route segment may be evaluated at build time: the answer depends on
// the WebDAV server's state right now, not on the bundle's.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('WebDAV probe timed out')), ms);
  });

  return Promise.race([promise, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function checkWebdav(): Promise<'ok' | 'error'> {
  try {
    // stat is Depth:0 — the cheapest request that proves PHOTOS_DIR is readable.
    const client = getWebDAVClient();
    await withTimeout(client.stat(process.env.PHOTOS_DIR || '/Photos'), WEBDAV_TIMEOUT_MS);
    return 'ok';
  } catch (error) {
    // The webdav client embeds the server URL in its error messages, and this
    // route is public: log only the HTTP status (or that it was unreachable),
    // never the message. The library's own error names are minified to "J" in
    // the standalone bundle, so they are useless here.
    const status = (error as { status?: unknown }).status;
    console.warn(
      '[health] WebDAV probe failed:',
      typeof status === 'number' ? `HTTP ${status}` : 'unreachable',
    );
    return 'error';
  }
}

export async function GET() {
  if (!getWebDAVConfig()) {
    // Demo mode: there is nothing to probe, but the app itself is alive.
    return NextResponse.json(
      { status: 'ok', webdav: 'not_configured' },
      { headers: NO_STORE },
    );
  }

  const webdav = await checkWebdav();
  if (webdav === 'error') {
    return NextResponse.json(
      { status: 'degraded', webdav },
      { status: 503, headers: NO_STORE },
    );
  }

  return NextResponse.json({ status: 'ok', webdav }, { headers: NO_STORE });
}

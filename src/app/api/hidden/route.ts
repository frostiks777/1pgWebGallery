import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_DIR    = process.env.CACHE_DIR || path.join(process.cwd(), '.data');
const DIR_META_DIR = path.join(CACHE_DIR, 'dir-meta');

function sanitizeDir(dir: string): string {
  if (!dir) return '__root__';
  return dir.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function getMetaFile(dir: string): string {
  if (!fs.existsSync(DIR_META_DIR)) fs.mkdirSync(DIR_META_DIR, { recursive: true });
  return path.join(DIR_META_DIR, `${sanitizeDir(dir)}.json`);
}

interface DirMeta {
  hidden: string[];
  panoramas: string[];
}

function readMeta(dir: string): DirMeta {
  try {
    const file = getMetaFile(dir);
    if (!fs.existsSync(file)) return { hidden: [], panoramas: [] };
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      hidden:    Array.isArray(parsed.hidden)    ? parsed.hidden    : [],
      panoramas: Array.isArray(parsed.panoramas) ? parsed.panoramas : [],
    };
  } catch {
    return { hidden: [], panoramas: [] };
  }
}

function writeMeta(dir: string, meta: DirMeta): void {
  try {
    const file = getMetaFile(dir);
    fs.writeFileSync(file, JSON.stringify(meta), 'utf8');
  } catch (err) {
    console.error('[Hidden] Failed to write dir meta:', err);
  }
}

export async function GET(request: NextRequest) {
  const dir = request.nextUrl.searchParams.get('dir') ?? '';
  const meta = readMeta(dir);
  return NextResponse.json({ paths: meta.hidden });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const photoPath = body?.path;
    const dir       = typeof body?.dir === 'string' ? body.dir : '';
    if (!photoPath || typeof photoPath !== 'string') {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }
    const meta = readMeta(dir);
    if (!meta.hidden.includes(photoPath)) {
      meta.hidden = [...meta.hidden, photoPath];
      writeMeta(dir, meta);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body  = await request.json();
    const paths = body?.paths;
    const dir   = typeof body?.dir === 'string' ? body.dir : '';
    if (!Array.isArray(paths)) {
      return NextResponse.json({ error: 'paths must be an array' }, { status: 400 });
    }
    const meta = readMeta(dir);
    meta.hidden = paths.filter((p): p is string => typeof p === 'string');
    writeMeta(dir, meta);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const dir  = request.nextUrl.searchParams.get('dir') ?? '';
  const meta = readMeta(dir);
  meta.hidden = [];
  writeMeta(dir, meta);
  return NextResponse.json({ success: true });
}

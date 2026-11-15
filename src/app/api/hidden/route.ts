import { NextRequest, NextResponse } from 'next/server';
import { readMeta, writeMeta, MAX_PATH_LENGTH, MAX_DIR_LENGTH, MAX_PATHS } from '@/lib/dir-meta';
import { isAuthRequired, validateAuthCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Same contract as covers (#151): anonymous GET degrades to an empty list,
  // mutations below are 401.
  if (isAuthRequired() && !validateAuthCookie(request)) {
    return NextResponse.json({ paths: [] });
  }
  const dir = (request.nextUrl.searchParams.get('dir') ?? '').slice(0, MAX_DIR_LENGTH);
  const meta = readMeta(dir);
  return NextResponse.json({ paths: meta.hidden });
}

export async function POST(request: NextRequest) {
  if (isAuthRequired() && !validateAuthCookie(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body      = await request.json();
    const photoPath = body?.path;
    const dir       = typeof body?.dir === 'string' ? body.dir.slice(0, MAX_DIR_LENGTH) : '';
    if (!photoPath || typeof photoPath !== 'string') {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }
    if (photoPath.length > MAX_PATH_LENGTH) {
      return NextResponse.json({ error: 'Path too long' }, { status: 400 });
    }
    const meta = readMeta(dir);
    if (meta.hidden.length >= MAX_PATHS) {
      return NextResponse.json({ error: 'Too many hidden items' }, { status: 400 });
    }
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
  if (isAuthRequired() && !validateAuthCookie(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body  = await request.json();
    const paths = body?.paths;
    const dir   = typeof body?.dir === 'string' ? body.dir.slice(0, MAX_DIR_LENGTH) : '';
    if (!Array.isArray(paths)) {
      return NextResponse.json({ error: 'paths must be an array' }, { status: 400 });
    }
    const meta = readMeta(dir);
    meta.hidden = paths
      .filter((p): p is string => typeof p === 'string' && p.length <= MAX_PATH_LENGTH)
      .slice(0, MAX_PATHS);
    writeMeta(dir, meta);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (isAuthRequired() && !validateAuthCookie(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dir  = (request.nextUrl.searchParams.get('dir') ?? '').slice(0, MAX_DIR_LENGTH);
  const meta = readMeta(dir);
  meta.hidden = [];
  writeMeta(dir, meta);
  return NextResponse.json({ success: true });
}

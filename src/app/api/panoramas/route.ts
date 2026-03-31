import { NextRequest, NextResponse } from 'next/server';
import { readMeta, writeMeta, MAX_PATH_LENGTH, MAX_DIR_LENGTH, MAX_PATHS } from '@/lib/dir-meta';

export async function GET(request: NextRequest) {
  const dir  = (request.nextUrl.searchParams.get('dir') ?? '').slice(0, MAX_DIR_LENGTH);
  const meta = readMeta(dir);
  return NextResponse.json({ paths: meta.panoramas });
}

export async function POST(request: NextRequest) {
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
    if (meta.panoramas.length >= MAX_PATHS) {
      return NextResponse.json({ error: 'Too many panorama items' }, { status: 400 });
    }
    if (!meta.panoramas.includes(photoPath)) {
      meta.panoramas = [...meta.panoramas, photoPath];
      writeMeta(dir, meta);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body      = await request.json();
    const photoPath = body?.path;
    const dir       = typeof body?.dir === 'string' ? body.dir.slice(0, MAX_DIR_LENGTH) : '';
    if (!photoPath || typeof photoPath !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (photoPath.length > MAX_PATH_LENGTH) {
      return NextResponse.json({ error: 'Path too long' }, { status: 400 });
    }
    const meta = readMeta(dir);
    meta.panoramas = meta.panoramas.filter((p) => p !== photoPath);
    writeMeta(dir, meta);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

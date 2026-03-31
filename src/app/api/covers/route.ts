import { NextRequest, NextResponse } from 'next/server';
import { readMeta, writeMeta, MAX_PATH_LENGTH, MAX_DIR_LENGTH, MAX_COVERS } from '@/lib/dir-meta';

export async function GET(request: NextRequest) {
  const dir = (request.nextUrl.searchParams.get('dir') ?? '').slice(0, MAX_DIR_LENGTH);
  const meta = readMeta(dir);
  return NextResponse.json({ paths: meta.covers });
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
    if (meta.covers.includes(photoPath)) {
      return NextResponse.json({ success: true, covers: meta.covers });
    }
    if (meta.covers.length >= MAX_COVERS) {
      meta.covers = [...meta.covers.slice(1), photoPath];
    } else {
      meta.covers = [...meta.covers, photoPath];
    }
    writeMeta(dir, meta);
    return NextResponse.json({ success: true, covers: meta.covers });
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
    meta.covers = meta.covers.filter((p) => p !== photoPath);
    writeMeta(dir, meta);
    return NextResponse.json({ success: true, covers: meta.covers });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body  = await request.json();
    const paths = body?.paths;
    const dir   = typeof body?.dir === 'string' ? body.dir.slice(0, MAX_DIR_LENGTH) : '';
    if (!Array.isArray(paths)) {
      return NextResponse.json({ error: 'paths must be an array' }, { status: 400 });
    }
    const meta = readMeta(dir);
    meta.covers = paths
      .filter((p): p is string => typeof p === 'string' && p.length <= MAX_PATH_LENGTH)
      .slice(0, MAX_COVERS);
    writeMeta(dir, meta);
    return NextResponse.json({ success: true, covers: meta.covers });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

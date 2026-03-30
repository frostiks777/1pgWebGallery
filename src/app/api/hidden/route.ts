import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_DIR   = process.env.CACHE_DIR || path.join('/tmp', 'photo-gallery-cache');
const HIDDEN_FILE = path.join(CACHE_DIR, 'hidden.json');

function readHidden(): string[] {
  try {
    if (!fs.existsSync(HIDDEN_FILE)) return [];
    const raw = fs.readFileSync(HIDDEN_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHidden(paths: string[]): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(HIDDEN_FILE, JSON.stringify(paths), 'utf8');
  } catch (err) {
    console.error('[Hidden] Failed to write hidden.json:', err);
  }
}

export async function GET() {
  return NextResponse.json({ paths: readHidden() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const photoPath = body?.path;
    if (!photoPath || typeof photoPath !== 'string') {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }
    const current = readHidden();
    if (!current.includes(photoPath)) {
      writeHidden([...current, photoPath]);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const paths = body?.paths;
    if (!Array.isArray(paths)) {
      return NextResponse.json({ error: 'paths must be an array' }, { status: 400 });
    }
    writeHidden(paths.filter((p): p is string => typeof p === 'string'));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  writeHidden([]);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getWebDAVConfig, getFoldersFromDirectory } from '@/lib/webdav';
import { isAuthRequired, validateAuthCookie } from '@/lib/auth';

function resolveAndValidatePath(subPath: string | null, baseDir: string): string | null {
  if (!subPath) return baseDir;
  if (subPath.includes('..')) return null;
  const resolved = `${baseDir}/${subPath}`.replace(/\/+/g, '/');
  if (!resolved.startsWith(baseDir)) return null;
  return resolved;
}

export async function GET(request: NextRequest) {
  try {
    if (isAuthRequired() && !validateAuthCookie(request)) {
      return NextResponse.json({ success: true, folders: [] });
    }

    const config = getWebDAVConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'WebDAV not configured', folders: [] },
        { status: 200 }
      );
    }

    const baseDir = process.env.PHOTOS_DIR || '/Photos';
    const subPath = request.nextUrl.searchParams.get('path');
    const resolvedPath = resolveAndValidatePath(subPath, baseDir);

    if (!resolvedPath) {
      return NextResponse.json(
        { success: false, error: 'Invalid path', folders: [] },
        { status: 400 }
      );
    }

    const folders = await getFoldersFromDirectory(resolvedPath);

    return NextResponse.json({
      success: true,
      folders: folders.map(f => ({
        name: f.name,
        // Return path relative to baseDir so the client never deals with absolute WebDAV paths
        path: f.path.startsWith(baseDir)
          ? f.path.slice(baseDir.length).replace(/^\/+/, '')
          : f.name,
        previewPhotos: f.previewPhotos,
      })),
    });
  } catch (error) {
    console.error('[API/folders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folders.', folders: [] },
      { status: 500 }
    );
  }
}

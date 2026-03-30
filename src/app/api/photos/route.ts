import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { testWebDAVConnection } from '@/lib/webdav';

interface LocalPhoto {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  mimeType: string;
}

async function getLocalDemoPhotos(): Promise<LocalPhoto[]> {
  const demoDir = path.join(process.cwd(), 'public', 'demo-photos');
  
  try {
    if (!fs.existsSync(demoDir)) {
      return [];
    }
    
    const files = fs.readdirSync(demoDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const photos: LocalPhoto[] = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => {
        const filePath = path.join(demoDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          // For demo photos, use direct path to public folder (no /api/photos prefix)
          path: `/demo-photos/${file}`,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          mimeType: `image/${path.extname(file).slice(1)}`,
        };
      });
    
    // Sort by name first, then by date
    photos.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true });
      if (nameCompare !== 0) return nameCompare;
      return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
    });
    
    return photos;
  } catch (error) {
    console.error('Error reading local demo photos:', error);
    return [];
  }
}

function resolveAndValidatePath(subPath: string | null, baseDir: string): string | null {
  if (!subPath) return baseDir;
  // Prevent directory traversal: reject any path containing '..'
  if (subPath.includes('..')) return null;
  const resolved = `${baseDir}/${subPath}`.replace(/\/+/g, '/');
  // Ensure resolved path starts with baseDir
  if (!resolved.startsWith(baseDir)) return null;
  return resolved;
}

export async function GET(request: NextRequest) {
  try {
    // Check if WebDAV is configured
    const webdavUrl = process.env.WEBDAV_URL;
    const webdavUsername = process.env.WEBDAV_USERNAME;
    const webdavPassword = process.env.WEBDAV_PASSWORD;
    
    if (webdavUrl && webdavUsername && webdavPassword) {
      const baseDir = process.env.PHOTOS_DIR || '/Photos';
      const subPath = request.nextUrl.searchParams.get('path');
      const photosDir = resolveAndValidatePath(subPath, baseDir);

      if (!photosDir) {
        return NextResponse.json({ success: false, mode: 'webdav', error: 'Invalid path', photos: [] }, { status: 400 });
      }

      // Test connection first
      const connectionTest = await testWebDAVConnection(photosDir);

      if (!connectionTest.success) {
        return NextResponse.json({
          success: false,
          mode: 'webdav',
          error: 'Failed to connect to photo storage.',
          photos: [],
        }, { status: 200 });
      }

      // Use WebDAV
      try {
        const { getPhotosFromDirectory } = await import('@/lib/webdav');
        const photos = await getPhotosFromDirectory(photosDir);

        console.log(`[API] Loaded ${photos.length} photos from WebDAV`);

        return NextResponse.json({
          success: true,
          mode: 'webdav',
          photos: photos.map(photo => ({
            name: photo.name,
            path: photo.path,
            size: photo.size,
            lastModified: photo.lastModified.toISOString(),
            mimeType: photo.mimeType,
          })),
        });
      } catch (webdavError) {
        console.error('[API] WebDAV error:', webdavError);
        return NextResponse.json({
          success: false,
          mode: 'webdav',
          error: 'Failed to fetch photos from storage.',
          photos: [],
        }, { status: 200 });
      }
    } else {
      // Use local demo photos
      const photos = await getLocalDemoPhotos();

      return NextResponse.json({
        success: true,
        mode: 'demo',
        photos: photos,
      });
    }
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch photos.', photos: [] },
      { status: 500 }
    );
  }
}

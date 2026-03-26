import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    
    console.log(`[Photo API] Request for: /${pathSegments.join('/')}`);
    
    // Check if this is a demo photo request
    if (pathSegments[0] === 'demo-photos') {
      // Serve local demo photo
      const localPath = path.join(process.cwd(), 'public', ...pathSegments);
      
      console.log(`[Photo API] Demo photo, local path: ${localPath}`);
      
      if (!fs.existsSync(localPath)) {
        console.error(`[Photo API] Demo photo not found: ${localPath}`);
        return NextResponse.json(
          { error: 'Photo not found' },
          { status: 404 }
        );
      }
      
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeTypes[ext] || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    
    // For WebDAV photos, check if WebDAV is configured
    const webdavUrl = process.env.WEBDAV_URL;
    const webdavUsername = process.env.WEBDAV_USERNAME;
    const webdavPassword = process.env.WEBDAV_PASSWORD;
    
    if (!webdavUrl || !webdavUsername || !webdavPassword) {
      console.error('[Photo API] WebDAV not configured');
      return NextResponse.json(
        { error: 'WebDAV not configured. Cannot fetch photo.' },
        { status: 503 }
      );
    }
    
    // Use WebDAV for non-demo photos
    // The path from WebDAV filename already includes the full path like /2025-09-11_AA/Photos/image.jpg
    const photoPath = '/' + pathSegments.join('/');
    console.log(`[Photo API] Fetching from WebDAV: ${photoPath}`);
    
    try {
      const { getPhotoAsBase64 } = await import('@/lib/webdav');
      const base64 = await getPhotoAsBase64(photoPath);
      
      // Extract the base64 data without the prefix
      const base64Data = base64.split(',')[1];
      const mimeType = base64.split(';')[0].split(':')[1];
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log(`[Photo API] Successfully fetched photo, size: ${buffer.length} bytes`);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fetchError) {
      console.error(`[Photo API] Error fetching from WebDAV:`, fetchError);
      return NextResponse.json(
        { error: `Failed to fetch photo: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Photo API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}

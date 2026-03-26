import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');
    
    if (!photoPath) {
      return NextResponse.json(
        { error: 'Missing path parameter. Use ?path=/path/to/photo.jpg' },
        { status: 400 }
      );
    }
    
    console.log(`[Photo File API] Request for: ${photoPath}`);
    
    // Decode URL encoding
    const decodedPath = decodeURIComponent(photoPath);
    const pathSegments = decodedPath.split('/').filter(Boolean);
    
    console.log(`[Photo File API] Decoded path: ${decodedPath}`);
    console.log(`[Photo File API] Path segments:`, pathSegments);
    
    // Check if this is a demo photo request
    if (pathSegments[0] === 'demo-photos') {
      const localPath = path.join(process.cwd(), 'public', ...pathSegments);
      
      console.log(`[Photo File API] Demo photo, local path: ${localPath}`);
      
      if (!fs.existsSync(localPath)) {
        console.error(`[Photo File API] Demo photo not found: ${localPath}`);
        return NextResponse.json(
          { error: 'Photo not found', path: localPath },
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
    
    // For WebDAV photos
    const webdavUrl = process.env.WEBDAV_URL;
    const webdavUsername = process.env.WEBDAV_USERNAME;
    const webdavPassword = process.env.WEBDAV_PASSWORD;
    
    if (!webdavUrl || !webdavUsername || !webdavPassword) {
      return NextResponse.json(
        { error: 'WebDAV not configured' },
        { status: 503 }
      );
    }
    
    console.log(`[Photo File API] Fetching from WebDAV: ${decodedPath}`);
    
    try {
      const { getPhotoAsBase64 } = await import('@/lib/webdav');
      const base64 = await getPhotoAsBase64(decodedPath.startsWith('/') ? decodedPath : '/' + decodedPath);
      
      const base64Data = base64.split(',')[1];
      const mimeType = base64.split(';')[0].split(':')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log(`[Photo File API] Successfully fetched, size: ${buffer.length} bytes`);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fetchError) {
      console.error(`[Photo File API] Error:`, fetchError);
      return NextResponse.json(
        { error: `Failed to fetch: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Photo File API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}

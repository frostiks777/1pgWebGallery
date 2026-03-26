import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Cache directory for medium images
const CACHE_DIR = path.join(process.cwd(), '.cache', 'medium');

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (error) {
  console.error('[Medium] Error creating cache directory:', error);
}

// Generate a cache key from photo path
function getCacheKey(photoPath: string): string {
  const hash = crypto
    .createHash('md5')
    .update(photoPath)
    .digest('hex');
  return hash;
}

// Get cached image path
function getCachedPath(photoPath: string): string {
  const cacheKey = getCacheKey(photoPath);
  const ext = path.extname(photoPath).toLowerCase() || '.jpg';
  return path.join(CACHE_DIR, `${cacheKey}${ext}`);
}

// Check if image is cached and fresh
function getCachedImage(photoPath: string): { buffer: Buffer; contentType: string } | null {
  try {
    const cachePath = getCachedPath(photoPath);
    
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (age < maxAge) {
        const ext = path.extname(photoPath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
        return {
          buffer: fs.readFileSync(cachePath),
          contentType
        };
      } else {
        try {
          fs.unlinkSync(cachePath);
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (error) {
    console.error(`[Medium] Error reading cache:`, error);
  }
  
  return null;
}

// Save image to cache
function cacheImage(photoPath: string, buffer: Buffer): void {
  try {
    // Ensure directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const cachePath = getCachedPath(photoPath);
    fs.writeFileSync(cachePath, buffer);
    console.log(`[Medium] Cached: ${photoPath}`);
  } catch (error) {
    console.error(`[Medium] Error caching:`, error);
  }
}

// Get content type from extension
function getContentType(photoPath: string): string {
  const ext = path.extname(photoPath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');
    
    if (!photoPath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }
    
    const decodedPath = decodeURIComponent(photoPath);
    
    // Check cache first
    const cached = getCachedImage(decodedPath);
    if (cached) {
      return new NextResponse(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=2592000, immutable',
          'X-Cache': 'HIT',
        },
      });
    }
    
    // Check if demo photo
    const pathSegments = decodedPath.split('/').filter(Boolean);
    let imageBuffer: Buffer;
    
    if (pathSegments[0] === 'demo-photos') {
      const localPath = path.join(process.cwd(), 'public', ...pathSegments);
      
      if (!fs.existsSync(localPath)) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }
      
      imageBuffer = fs.readFileSync(localPath);
    } else {
      // WebDAV photo
      const webdavUrl = process.env.WEBDAV_URL;
      const webdavUsername = process.env.WEBDAV_USERNAME;
      const webdavPassword = process.env.WEBDAV_PASSWORD;
      
      if (!webdavUrl || !webdavUsername || !webdavPassword) {
        return NextResponse.json({ error: 'WebDAV not configured' }, { status: 503 });
      }
      
      try {
        const { getPhotoAsBase64 } = await import('@/lib/webdav');
        const base64 = await getPhotoAsBase64(decodedPath.startsWith('/') ? decodedPath : '/' + decodedPath);
        const base64Data = base64.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error(`[Medium] Error fetching from WebDAV:`, error);
        return NextResponse.json(
          { error: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }
    
    // Cache the image
    cacheImage(decodedPath, imageBuffer);
    
    const contentType = getContentType(decodedPath);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, immutable',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Medium] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get image' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Cache directory for thumbnails
const CACHE_DIR = path.join(process.cwd(), '.cache', 'thumbnails');
const THUMBNAIL_SIZE = 300; // Max width/height for thumbnails

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Generate a cache key from photo path
function getCacheKey(photoPath: string, size: number): string {
  const hash = crypto
    .createHash('md5')
    .update(`${photoPath}-${size}`)
    .digest('hex');
  return hash;
}

// Get cached thumbnail path
function getCachedThumbnailPath(photoPath: string, size: number): string {
  const ext = path.extname(photoPath).toLowerCase() || '.jpg';
  const cacheKey = getCacheKey(photoPath, size);
  return path.join(CACHE_DIR, `${cacheKey}${ext}`);
}

// Check if thumbnail is cached and fresh
function getCachedThumbnail(photoPath: string, size: number): Buffer | null {
  try {
    const cachePath = getCachedThumbnailPath(photoPath, size);
    
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (age < maxAge) {
        console.log(`[Thumbnail] Cache hit for: ${photoPath}`);
        return fs.readFileSync(cachePath);
      } else {
        console.log(`[Thumbnail] Cache expired for: ${photoPath}`);
        fs.unlinkSync(cachePath);
      }
    }
  } catch (error) {
    console.error(`[Thumbnail] Error reading cache:`, error);
  }
  
  return null;
}

// Save thumbnail to cache
function cacheThumbnail(photoPath: string, size: number, buffer: Buffer): void {
  try {
    const cachePath = getCachedThumbnailPath(photoPath, size);
    fs.writeFileSync(cachePath, buffer);
    console.log(`[Thumbnail] Cached: ${photoPath}`);
  } catch (error) {
    console.error(`[Thumbnail] Error caching:`, error);
  }
}

// Resize image using sharp
async function resizeImage(buffer: Buffer, maxSize: number): Promise<Buffer> {
  try {
    const sharp = await import('sharp');
    return await sharp(buffer)
      .resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error('[Thumbnail] Sharp error:', error);
    return buffer;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');
    const size = parseInt(searchParams.get('size') || '300', 10);
    
    if (!photoPath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }
    
    const decodedPath = decodeURIComponent(photoPath);
    console.log(`[Thumbnail] Request for: ${decodedPath}, size: ${size}`);
    
    // Check cache first
    const cached = getCachedThumbnail(decodedPath, size);
    if (cached) {
      return new NextResponse(cached, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=604800, immutable',
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
        console.error(`[Thumbnail] Error fetching from WebDAV:`, error);
        return NextResponse.json(
          { error: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }
    
    // Resize image for thumbnail
    const thumbnailBuffer = await resizeImage(imageBuffer, size);
    
    // Cache the thumbnail
    cacheThumbnail(decodedPath, size, thumbnailBuffer);
    
    return new NextResponse(thumbnailBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Thumbnail] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}

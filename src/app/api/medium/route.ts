import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Jimp } from 'jimp';

// Cache directory for medium-size images
const CACHE_DIR = path.join(process.cwd(), '.cache', 'medium');
const MEDIUM_SIZE = 1920; // Max width for medium images (good for viewing, ~1-3MB)

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

// Get cached medium image path
function getCachedPath(photoPath: string): string {
  const cacheKey = getCacheKey(photoPath);
  return path.join(CACHE_DIR, `${cacheKey}.jpg`);
}

// Check if medium image is cached and fresh
function getCachedMedium(photoPath: string): Buffer | null {
  try {
    const cachePath = getCachedPath(photoPath);
    
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (age < maxAge) {
        console.log(`[Medium] Cache hit for: ${photoPath}`);
        return fs.readFileSync(cachePath);
      } else {
        console.log(`[Medium] Cache expired for: ${photoPath}`);
        try {
          fs.unlinkSync(cachePath);
        } catch (e) {
          // Ignore deletion errors
        }
      }
    }
  } catch (error) {
    console.error(`[Medium] Error reading cache:`, error);
  }
  
  return null;
}

// Save medium image to cache
function cacheMedium(photoPath: string, buffer: Buffer): void {
  try {
    const cachePath = getCachedPath(photoPath);
    fs.writeFileSync(cachePath, buffer);
    console.log(`[Medium] Cached: ${photoPath} (${Math.round(buffer.length / 1024 / 1024)}MB)`);
  } catch (error) {
    console.error(`[Medium] Error caching:`, error);
  }
}

// Resize image using Jimp
async function resizeToMedium(buffer: Buffer): Promise<Buffer> {
  const image = await Jimp.read(buffer);
  
  const width = image.width;
  const height = image.height;
  
  // Only resize if larger than medium size
  if (width > MEDIUM_SIZE || height > MEDIUM_SIZE) {
    image.resize({ w: MEDIUM_SIZE });
  }
  
  // Get buffer with JPEG quality 85
  const result = await image.getBuffer('image/jpeg', { quality: 85 });
  console.log(`[Medium] Resized from ${width}x${height} to ${image.width}x${image.height}: ${Math.round(result.length / 1024 / 1024)}MB`);
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');
    
    if (!photoPath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }
    
    const decodedPath = decodeURIComponent(photoPath);
    console.log(`[Medium] Request for: ${decodedPath}`);
    
    // Check cache first
    const cached = getCachedMedium(decodedPath);
    if (cached) {
      return new NextResponse(cached, {
        headers: {
          'Content-Type': 'image/jpeg',
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
    
    console.log(`[Medium] Original image size: ${Math.round(imageBuffer.length / 1024 / 1024)}MB`);
    
    // Resize to medium
    const mediumBuffer = await resizeToMedium(imageBuffer);
    
    // Cache the medium image
    cacheMedium(decodedPath, mediumBuffer);
    
    return new NextResponse(mediumBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=2592000, immutable',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Medium] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate medium image' },
      { status: 500 }
    );
  }
}

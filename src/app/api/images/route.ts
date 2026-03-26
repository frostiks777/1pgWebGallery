import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Cache directory for optimized images
const CACHE_DIR = path.join(process.cwd(), '.cache', 'images');

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 400, height: 400 },
  medium: { width: 1200, height: 1200 },
  full: { width: 2400, height: 2400 },
} as const;

type ImageSize = keyof typeof IMAGE_SIZES;

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (error) {
  console.error('[Images API] Error creating cache directory:', error);
}

// Generate cache key from path and size
function getCacheKey(photoPath: string, size: ImageSize): string {
  const hash = crypto
    .createHash('md5')
    .update(`${photoPath}-${size}`)
    .digest('hex');
  return hash;
}

// Get cached image path
function getCachedPath(photoPath: string, size: ImageSize): string {
  const cacheKey = getCacheKey(photoPath, size);
  return path.join(CACHE_DIR, `${cacheKey}.webp`);
}

// Check if cached image exists and is fresh
function getCachedImage(photoPath: string, size: ImageSize): Buffer | null {
  try {
    const cachePath = getCachedPath(photoPath, size);
    
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (age < maxAge) {
        return fs.readFileSync(cachePath);
      } else {
        try {
          fs.unlinkSync(cachePath);
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (error) {
    console.error(`[Images API] Error reading cache:`, error);
  }
  
  return null;
}

// Save optimized image to cache
function cacheImage(photoPath: string, size: ImageSize, buffer: Buffer): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const cachePath = getCachedPath(photoPath, size);
    fs.writeFileSync(cachePath, buffer);
  } catch (error) {
    console.error(`[Images API] Error caching:`, error);
  }
}

// Optimize image with Sharp
async function optimizeImage(buffer: Buffer, size: ImageSize): Promise<Buffer> {
  const { width, height } = IMAGE_SIZES[size];
  
  try {
    return await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (error) {
    console.error('[Images API] Sharp optimization failed:', error);
    // Fallback: return original buffer
    return buffer;
  }
}

// Stream file from WebDAV using direct buffer method
async function fetchWebDAVImage(photoPath: string): Promise<Buffer> {
  const { createClient } = await import('webdav');
  const webdavUrl = process.env.WEBDAV_URL;
  const webdavUsername = process.env.WEBDAV_USERNAME;
  const webdavPassword = process.env.WEBDAV_PASSWORD;

  if (!webdavUrl || !webdavUsername || !webdavPassword) {
    throw new Error('WebDAV credentials not configured');
  }

  const client = createClient(webdavUrl, {
    username: webdavUsername,
    password: webdavPassword,
  });

  const normalizedPath = photoPath.startsWith('/') ? photoPath : '/' + photoPath;
  
  try {
    const arrayBuffer = await client.getFileContents(normalizedPath, {
      format: 'binary',
    }) as ArrayBuffer;
    
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`[Images API] WebDAV fetch failed for ${normalizedPath}:`, error);
    throw error;
  }
}

// Main GET handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');
    const sizeParam = searchParams.get('size') || 'medium';
    
    if (!photoPath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }
    
    const size = (sizeParam in IMAGE_SIZES ? sizeParam : 'medium') as ImageSize;
    const decodedPath = decodeURIComponent(photoPath);
    
    // Check cache first
    const cached = getCachedImage(decodedPath, size);
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'HIT',
        },
      });
    }
    
    // Fetch original image
    const pathSegments = decodedPath.split('/').filter(Boolean);
    let originalBuffer: Buffer;
    
    if (pathSegments[0] === 'demo-photos') {
      // Local demo photo
      const localPath = path.join(process.cwd(), 'public', ...pathSegments);
      
      if (!fs.existsSync(localPath)) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }
      
      originalBuffer = fs.readFileSync(localPath);
    } else {
      // WebDAV photo
      try {
        originalBuffer = await fetchWebDAVImage(decodedPath);
      } catch (error) {
        console.error(`[Images API] Fetch failed:`, error);
        return NextResponse.json(
          { error: `Failed to fetch image: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }
    
    // Optimize image
    const optimizedBuffer = await optimizeImage(originalBuffer, size);
    
    // Cache optimized image
    cacheImage(decodedPath, size, optimizedBuffer);
    
    return new NextResponse(new Uint8Array(optimizedBuffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Images API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 }
    );
  }
}

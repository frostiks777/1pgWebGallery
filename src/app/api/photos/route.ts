import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

export async function GET() {
  try {
    // Check if WebDAV is configured
    const webdavUrl = process.env.WEBDAV_URL;
    const webdavUsername = process.env.WEBDAV_USERNAME;
    const webdavPassword = process.env.WEBDAV_PASSWORD;
    
    if (webdavUrl && webdavUsername && webdavPassword) {
      // Use WebDAV
      const { getPhotosFromDirectory } = await import('@/lib/webdav');
      const photosDir = process.env.PHOTOS_DIR || '/Photos';
      const photos = await getPhotosFromDirectory(photosDir);
      
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
    } else {
      // Use local demo photos
      const photos = await getLocalDemoPhotos();
      
      return NextResponse.json({
        success: true,
        mode: 'demo',
        photos: photos,
        message: 'Using demo mode. Configure WebDAV credentials to use your cloud photos.',
      });
    }
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch photos',
        photos: []
      },
      { status: 500 }
    );
  }
}

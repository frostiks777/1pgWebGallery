import { createClient, WebDAVClient, FileStat } from 'webdav';

let webdavClient: WebDAVClient | null = null;

export interface PhotoInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  mimeType: string;
  thumbnail?: string;
}

export function getWebDAVClient(): WebDAVClient {
  if (!webdavClient) {
    const url = process.env.WEBDAV_URL;
    const username = process.env.WEBDAV_USERNAME;
    const password = process.env.WEBDAV_PASSWORD;

    if (!url || !username || !password) {
      throw new Error('WebDAV credentials not configured. Please set WEBDAV_URL, WEBDAV_USERNAME, and WEBDAV_PASSWORD in environment variables.');
    }

    webdavClient = createClient(url, {
      username,
      password,
    });
  }

  return webdavClient;
}

export async function getPhotosFromDirectory(directory: string = '/'): Promise<PhotoInfo[]> {
  const client = getWebDAVClient();
  
  try {
    const files = await client.getDirectoryContents(directory);
    
    if (!Array.isArray(files)) {
      return [];
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif'];
    
    const photos: PhotoInfo[] = files
      .filter((file: FileStat) => {
        if (file.type !== 'file') return false;
        const ext = file.basename.toLowerCase().substring(file.basename.lastIndexOf('.'));
        return imageExtensions.includes(ext);
      })
      .map((file: FileStat) => ({
        name: file.basename,
        path: file.filename,
        size: file.size || 0,
        lastModified: new Date(file.lastmod),
        mimeType: file.mime || 'image/jpeg',
      }));

    // Sort by name first, then by date
    photos.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true });
      if (nameCompare !== 0) return nameCompare;
      return a.lastModified.getTime() - b.lastModified.getTime();
    });

    return photos;
  } catch (error) {
    console.error('Error fetching photos from WebDAV:', error);
    throw error;
  }
}

export async function getPhotoAsBase64(photoPath: string): Promise<string> {
  const client = getWebDAVClient();
  
  try {
    const buffer = await client.getFileContents(photoPath, { format: 'binary' }) as ArrayBuffer;
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error fetching photo:', error);
    throw error;
  }
}

export async function getPhotoThumbnail(photoPath: string, maxSize: number = 300): Promise<string> {
  return getPhotoAsBase64(photoPath);
}

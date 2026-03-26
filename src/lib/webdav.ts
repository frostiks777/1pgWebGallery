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

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    url: string;
    photosDir: string;
    directoryExists?: boolean;
    fileCount?: number;
  };
}

export function getWebDAVConfig(): WebDAVConfig | null {
  const url = process.env.WEBDAV_URL;
  const username = process.env.WEBDAV_USERNAME;
  const password = process.env.WEBDAV_PASSWORD;

  if (!url || !username || !password) {
    return null;
  }

  return { url, username, password };
}

export function getWebDAVClient(): WebDAVClient {
  if (!webdavClient) {
    const config = getWebDAVConfig();

    if (!config) {
      throw new Error('WebDAV credentials not configured. Please set WEBDAV_URL, WEBDAV_USERNAME, and WEBDAV_PASSWORD in environment variables.');
    }

    console.log(`[WebDAV] Creating client for URL: ${config.url}`);
    
    webdavClient = createClient(config.url, {
      username: config.username,
      password: config.password,
    });
  }

  return webdavClient;
}

export async function testWebDAVConnection(photosDir: string = '/'): Promise<ConnectionTestResult> {
  const config = getWebDAVConfig();
  
  if (!config) {
    return {
      success: false,
      message: 'WebDAV credentials not configured. Please set WEBDAV_URL, WEBDAV_USERNAME, and WEBDAV_PASSWORD in environment variables.',
    };
  }

  try {
    console.log(`[WebDAV] Testing connection to ${config.url}...`);
    
    // Create a fresh client for testing
    const client = createClient(config.url, {
      username: config.username,
      password: config.password,
    });

    // Try to list the root directory first
    let rootContents;
    try {
      rootContents = await client.getDirectoryContents('/');
      console.log(`[WebDAV] Root directory accessible, found ${Array.isArray(rootContents) ? rootContents.length : 0} items`);
    } catch (rootError) {
      console.error('[WebDAV] Cannot access root directory:', rootError);
      return {
        success: false,
        message: `Cannot access WebDAV root directory. Check URL and credentials. Error: ${rootError instanceof Error ? rootError.message : 'Unknown error'}`,
        details: {
          url: config.url,
          photosDir,
        },
      };
    }

    // Try to access the photos directory
    let photosDirExists = false;
    let filesInDir = 0;
    
    try {
      const dirContents = await client.getDirectoryContents(photosDir);
      photosDirExists = true;
      filesInDir = Array.isArray(dirContents) ? dirContents.length : 0;
      console.log(`[WebDAV] Photos directory "${photosDir}" accessible, found ${filesInDir} items`);
    } catch (dirError) {
      console.error(`[WebDAV] Cannot access photos directory "${photosDir}":`, dirError);
      
      // List available directories
      const availableDirs = Array.isArray(rootContents) 
        ? rootContents.filter((f: FileStat) => f.type === 'directory').map((f: FileStat) => f.filename)
        : [];
      
      return {
        success: false,
        message: `Photos directory "${photosDir}" not found. Available directories: ${availableDirs.slice(0, 5).join(', ')}${availableDirs.length > 5 ? '...' : ''}. Set PHOTOS_DIR environment variable to the correct path.`,
        details: {
          url: config.url,
          photosDir,
          directoryExists: false,
        },
      };
    }

    return {
      success: true,
      message: `Successfully connected to WebDAV. Found ${filesInDir} items in "${photosDir}".`,
      details: {
        url: config.url,
        photosDir,
        directoryExists: photosDirExists,
        fileCount: filesInDir,
      },
    };
  } catch (error) {
    console.error('[WebDAV] Connection test failed:', error);
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        url: config.url,
        photosDir,
      },
    };
  }
}

export async function getPhotosFromDirectory(directory: string = '/'): Promise<PhotoInfo[]> {
  const client = getWebDAVClient();
  
  try {
    console.log(`[WebDAV] Fetching photos from: ${directory}`);
    const files = await client.getDirectoryContents(directory);
    
    if (!Array.isArray(files)) {
      console.log(`[WebDAV] No files found or invalid response`);
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

    console.log(`[WebDAV] Found ${photos.length} photos out of ${files.length} files`);

    // Sort by name first, then by date
    photos.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true });
      if (nameCompare !== 0) return nameCompare;
      return a.lastModified.getTime() - b.lastModified.getTime();
    });

    return photos;
  } catch (error) {
    console.error('[WebDAV] Error fetching photos:', error);
    throw error;
  }
}

export async function getPhotoAsBase64(photoPath: string): Promise<string> {
  const client = getWebDAVClient();
  
  try {
    console.log(`[WebDAV] Fetching photo: ${photoPath}`);
    const buffer = await client.getFileContents(photoPath, { format: 'binary' }) as ArrayBuffer;
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`[WebDAV] Error fetching photo ${photoPath}:`, error);
    throw error;
  }
}

export async function getPhotoThumbnail(photoPath: string, maxSize: number = 300): Promise<string> {
  return getPhotoAsBase64(photoPath);
}

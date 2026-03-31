import { createClient, WebDAVClient, FileStat, AuthType } from 'webdav';

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
  const config = getWebDAVConfig();

  if (!config) {
    throw new Error('WebDAV credentials not configured. Please set WEBDAV_URL, WEBDAV_USERNAME, and WEBDAV_PASSWORD in environment variables.');
  }

  return createClient(config.url, {
    username: config.username,
    password: config.password,
    authType: AuthType.Password,
  });
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
      authType: AuthType.Password,
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
        message: 'Cannot access WebDAV root directory. Check URL and credentials.',
        details: { photosDir },
      };
    }

    // Try to access the photos directory
    let photosDirExists = false;
    let filesInDir = 0;

    try {
      const dirContents = await client.getDirectoryContents(photosDir);
      photosDirExists = true;
      filesInDir = Array.isArray(dirContents) ? dirContents.length : 0;
      console.log(`[WebDAV] Photos directory accessible, found ${filesInDir} items`);
    } catch (dirError) {
      console.error(`[WebDAV] Cannot access photos directory:`, dirError);

      // Log available directories server-side only (not returned to client)
      if (Array.isArray(rootContents)) {
        const availableDirs = rootContents
          .filter((f: FileStat) => f.type === 'directory')
          .map((f: FileStat) => f.filename);
        console.log(`[WebDAV] Available root dirs: ${availableDirs.slice(0, 5).join(', ')}`);
      }

      return {
        success: false,
        message: 'Photos directory not found. Check PHOTOS_DIR environment variable.',
        details: { photosDir, directoryExists: false },
      };
    }

    return {
      success: true,
      message: `Successfully connected to WebDAV. Found ${filesInDir} items in photos directory.`,
      details: {
        photosDir,
        directoryExists: photosDirExists,
        fileCount: filesInDir,
      },
    };
  } catch (error) {
    console.error('[WebDAV] Connection test failed:', error);
    return {
      success: false,
      message: 'WebDAV connection failed.',
      details: { photosDir },
    };
  }
}

export interface FolderInfo {
  name: string;
  path: string;
  previewPhotos: string[];
}

export async function getFirstPhotosFromDirectory(
  directory: string,
  limit: number = 3,
): Promise<string[]> {
  const client = getWebDAVClient();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];
  try {
    const contents = await client.getDirectoryContents(directory);
    if (!Array.isArray(contents)) return [];
    return contents
      .filter((f: FileStat) =>
        f.type === 'file' &&
        imageExts.includes(f.basename.toLowerCase().substring(f.basename.lastIndexOf('.')))
      )
      .slice(0, limit)
      .map((f: FileStat) => f.filename);
  } catch { return []; }
}

export async function getFoldersFromDirectory(directory: string = '/'): Promise<FolderInfo[]> {
  const client = getWebDAVClient();
  const thumbsDirName = process.env.COLOCATED_THUMBS_DIR || '.thumbs';

  try {
    console.log(`[WebDAV] Fetching folders from: ${directory}`);
    const contents = await client.getDirectoryContents(directory);

    if (!Array.isArray(contents)) {
      return [];
    }

    const baseFolders = contents
      .filter((item: FileStat) => {
        if (item.type !== 'directory') return false;
        if (item.basename === thumbsDirName) return false;
        if (item.basename.startsWith('.')) return false;
        return true;
      })
      .map((item: FileStat) => ({
        name: item.basename,
        path: item.filename,
      }));

    baseFolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const folders: FolderInfo[] = baseFolders.map((f) => ({
      ...f,
      previewPhotos: [],
    }));

    console.log(`[WebDAV] Found ${folders.length} folders in ${directory}`);
    return folders;
  } catch (error) {
    console.error('[WebDAV] Error fetching folders:', error);
    throw error;
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
    
    // Counter for logging
    let loggedCount = 0;
    
    const photos: PhotoInfo[] = files
      .filter((file: FileStat) => {
        if (file.type !== 'file') return false;
        const ext = file.basename.toLowerCase().substring(file.basename.lastIndexOf('.'));
        return imageExtensions.includes(ext);
      })
      .map((file: FileStat) => {
        // Log the first few paths to debug
        if (loggedCount < 3) {
          console.log(`[WebDAV] Photo path: ${file.filename}, basename: ${file.basename}`);
          loggedCount++;
        }
        
        return {
          name: file.basename,
          path: file.filename, // Full path from WebDAV root
          size: file.size || 0,
          lastModified: new Date(file.lastmod),
          mimeType: file.mime || 'image/jpeg',
        };
      });

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

export async function getPhotoBuffer(photoPath: string): Promise<Buffer> {
  const client = getWebDAVClient();
  
  try {
    console.log(`[WebDAV] Fetching photo: ${photoPath}`);
    
    // Get the file as ArrayBuffer
    const buffer = await client.getFileContents(photoPath, { 
      format: 'binary' 
    }) as ArrayBuffer;
    
    console.log(`[WebDAV] Received ${buffer.byteLength} bytes for ${photoPath}`);
    
    return Buffer.from(buffer);
  } catch (error) {
    console.error(`[WebDAV] Error fetching photo ${photoPath}:`, error);
    throw error;
  }
}

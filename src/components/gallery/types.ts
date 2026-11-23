export interface Photo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  mimeType: string;
  /** Path to a companion video (same filename stem) if one was found alongside this photo. Powers the hover/open trailer preview. */
  videoPath?: string;
  /** Video is over VIDEO_PREVIEW_MAX_MB, so no poster will be generated. Render a placeholder instead of requesting one (#180). */
  posterUnavailable?: boolean;
}

export type CollageLayout = 
  | 'masonry' 
  | 'bento' 
  | 'honeycomb' 
  | 'wave'
  | 'minimalism'
  | 'album';

export interface GalleryProps {
  photos: Photo[];
  layout: CollageLayout;
  onPhotoClick: (photo: Photo, index: number) => void;
}

export interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

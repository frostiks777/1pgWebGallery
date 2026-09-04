export interface Photo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  mimeType: string;
  /** Path to a companion video (same filename stem) if one was found alongside this photo. Powers the hover/open trailer preview. */
  videoPath?: string;
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

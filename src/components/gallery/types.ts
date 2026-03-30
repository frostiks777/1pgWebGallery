export interface Photo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  mimeType: string;
}

export type CollageLayout = 
  | 'masonry' 
  | 'bento' 
  | 'honeycomb' 
  | 'wave'
  | 'empire'
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

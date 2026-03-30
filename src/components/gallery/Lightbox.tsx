'use client';

import { Photo } from './types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut, Loader2, EyeOff } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onHidePhoto?: (photo: Photo) => void;
}

function LightboxContent({ 
  photos, 
  initialIndex, 
  isOpen, 
  onClose,
  onHidePhoto,
}: { 
  photos: Photo[]; 
  initialIndex: number; 
  isOpen: boolean; 
  onClose: () => void;
  onHidePhoto?: (photo: Photo) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const thumbStripRef = useRef<HTMLDivElement>(null);
  const thumbRefs     = useRef<Map<number, HTMLButtonElement>>(new Map());
  const isFirstRender = useRef(true);

  const currentPhoto = photos[index];
  const imageUrl     = currentPhoto ? `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=medium` : '';
  const fullImageUrl = currentPhoto ? `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=full` : '';

  // Auto-scroll the thumbnail strip so the active thumb is always visible.
  useEffect(() => {
    const scroll = () => {
      const el = thumbRefs.current.get(index);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const t = setTimeout(scroll, 200);
      return () => clearTimeout(t);
    }
    scroll();
  }, [index]);

  const handlePrev = useCallback(() => {
    setIndex((prev) => {
      const next = (prev - 1 + photos.length) % photos.length;
      setIsLoading(true);
      setHasError(false);
      setZoom(1);
      return next;
    });
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setIndex((prev) => {
      const next = (prev + 1) % photos.length;
      setIsLoading(true);
      setHasError(false);
      setZoom(1);
      return next;
    });
  }, [photos.length]);

  const handleZoomIn  = () => setZoom((z) => Math.min(z + 0.5, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5));

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowLeft':  handlePrev(); break;
      case 'ArrowRight': handleNext(); break;
      case 'Escape':     onClose();    break;
      case '+': case '=': setZoom((z) => Math.min(z + 0.5, 3)); break;
      case '-':           setZoom((z) => Math.max(z - 0.5, 0.5)); break;
    }
  }, [isOpen, onClose, handlePrev, handleNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prefetch adjacent images
  useEffect(() => {
    if (!isOpen || !currentPhoto) return;
    const prefetch = (i: number) => {
      if (i >= 0 && i < photos.length) {
        const img = new Image();
        img.fetchPriority = 'low';
        img.src = `/api/images?path=${encodeURIComponent(photos[i].path)}&size=medium`;
      }
    };
    prefetch(index + 1);
    prefetch(index - 1);
  }, [index, isOpen, currentPhoto, photos]);

  if (!currentPhoto) return null;

  return (
    <DialogContent
      className="p-0 bg-black/95 border-none overflow-hidden"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '95vw',
        height: '95dvh',
        maxWidth: '95vw',
        maxHeight: '95dvh',
      }}
      showCloseButton={false}
    >
      <DialogTitle className="sr-only">
        Photo viewer - {currentPhoto.name}
      </DialogTitle>

      {/* Header */}
      <div className="flex-none flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-black/40 z-50 shrink-0">
        <div className="min-w-0 flex-1 mr-2 text-white">
          <p className="font-medium text-sm truncate">{currentPhoto.name}</p>
          <p className="text-xs text-white/60">
            {index + 1} / {photos.length} &bull; {new Date(currentPhoto.lastModified).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-white hover:bg-white/20 h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white text-xs min-w-[2.5rem] text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-white hover:bg-white/20 h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onHidePhoto && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onHidePhoto(currentPhoto)}
              className="text-white hover:bg-white/20 h-8 w-8"
              title="Скрыть фото"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
          <a href={fullImageUrl} download={currentPhoto.name} className="inline-flex">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" title="Download full size">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image container — fills remaining space between header and thumbnail strip */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {/* Navigation buttons */}
        {photos.length > 1 && (
          <>
            <Button
              variant="ghost" size="icon" onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-10 w-10"
            >
              <ChevronLeft className="h-7 w-7" />
            </Button>
            <Button
              variant="ghost" size="icon" onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-10 w-10"
            >
              <ChevronRight className="h-7 w-7" />
            </Button>
          </>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white/60 text-sm">Loading image...</p>
          </div>
        )}
        {hasError ? (
          <div className="flex flex-col items-center justify-center gap-4 text-white">
            <X className="w-12 h-12 text-red-400" />
            <p className="text-base">Failed to load image</p>
            <Button variant="outline" onClick={() => { setHasError(false); setIsLoading(true); }}>
              Retry
            </Button>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={currentPhoto.name}
            className={`max-w-full max-h-full object-contain transition-all duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ transform: `scale(${zoom})` }}
            fetchPriority="high"
            onLoad={() => setIsLoading(false)}
            onError={() => { setHasError(true); setIsLoading(false); }}
          />
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="flex-none bg-gradient-to-t from-black/80 to-black/40 px-3 py-2 shrink-0">
        <div
          ref={thumbStripRef}
          className="flex gap-2 overflow-x-auto max-w-full pb-1 scrollbar-lightbox px-[calc(50%-24px)]"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.path}
              ref={(el) => {
                if (el) thumbRefs.current.set(i, el);
                else thumbRefs.current.delete(i);
              }}
              onClick={() => {
                if (i !== index) {
                  setIsLoading(true);
                  setHasError(false);
                  setZoom(1);
                  setIndex(i);
                }
              }}
              className={`flex-shrink-0 w-10 h-10 rounded-md overflow-hidden transition-all duration-200 ${
                i === index
                  ? 'ring-2 ring-white scale-110'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={`/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`}
                alt={photo.name}
                className="w-full h-full object-cover"
                loading="lazy"
                fetchPriority="low"
              />
            </button>
          ))}
        </div>
      </div>
    </DialogContent>
  );
}

export function Lightbox({ photos, currentIndex, isOpen, onClose, onHidePhoto }: LightboxProps) {
  const contentKey = useMemo(() => `${isOpen}-${currentIndex}`, [isOpen, currentIndex]);

  if (!isOpen || photos.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <LightboxContent
        key={contentKey}
        photos={photos}
        initialIndex={currentIndex}
        isOpen={isOpen}
        onClose={onClose}
        onHidePhoto={onHidePhoto}
      />
    </Dialog>
  );
}

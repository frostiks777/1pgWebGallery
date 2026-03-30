'use client';

import { Photo } from './types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut, Loader2, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const thumbStripRef = useRef<HTMLDivElement>(null);
  const thumbRefs     = useRef<Map<number, HTMLButtonElement>>(new Map());
  const dialogRef     = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const currentPhoto = photos[index];
  const imageUrl     = currentPhoto ? `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=medium` : '';
  const fullImageUrl = currentPhoto ? `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=full` : '';

  // Auto-scroll the thumbnail strip so the active thumb is always visible.
  // On initial mount we delay 200ms to let the Dialog entrance animation finish
  // before scrollIntoView is called; on subsequent index changes scroll immediately.
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

  // Sync isFullscreen state with native fullscreen events
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      const el = dialogRef.current ?? document.documentElement;
      try { await el.requestFullscreen(); } catch {}
    } else {
      try { await document.exitFullscreen(); } catch {}
    }
  }, []);

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
      case 'f': case 'F': toggleFullscreen(); break;
      case '+': case '=': setZoom((z) => Math.min(z + 0.5, 3)); break;
      case '-':           setZoom((z) => Math.max(z - 0.5, 0.5)); break;
    }
  }, [isOpen, onClose, handlePrev, handleNext, toggleFullscreen]);

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
        img.src = `/api/images?path=${encodeURIComponent(photos[i].path)}&size=medium`;
      }
    };
    prefetch(index + 1);
    prefetch(index - 1);
  }, [index, isOpen, currentPhoto, photos]);

  if (!currentPhoto) return null;

  const fullscreenClasses = isFullscreen
    ? 'w-screen h-screen max-w-screen max-h-screen rounded-none'
    : 'max-w-[95vw] max-h-[95vh]';

  return (
    <DialogContent
      ref={dialogRef}
      className={`${fullscreenClasses} p-0 bg-black/95 border-none`}
      showCloseButton={false}
    >
      <DialogTitle className="sr-only">
        Photo viewer - {currentPhoto.name}
      </DialogTitle>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white">
          <p className="font-medium">{currentPhoto.name}</p>
          <p className="text-sm text-white/70">
            {index + 1} / {photos.length} &bull; {new Date(currentPhoto.lastModified).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-white hover:bg-white/20">
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-white hover:bg-white/20">
            <ZoomIn className="h-5 w-5" />
          </Button>
          {onHidePhoto && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onHidePhoto(currentPhoto)}
              className="text-white hover:bg-white/20"
              title="Скрыть фото"
            >
              <EyeOff className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
            title={isFullscreen ? 'Компактный режим (F)' : 'Во весь экран (F)'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          <a href={fullImageUrl} download={currentPhoto.name} className="inline-flex">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" title="Download full size">
              <Download className="h-5 w-5" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost" size="icon" onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost" size="icon" onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Image container */}
      <div className="flex items-center justify-center w-full h-full overflow-hidden" style={{ minHeight: isFullscreen ? '100vh' : '95vh' }}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white/70 text-sm">Loading image...</p>
          </div>
        )}
        {hasError ? (
          <div className="flex flex-col items-center justify-center gap-4 text-white">
            <X className="w-16 h-16 text-red-400" />
            <p className="text-lg">Failed to load image</p>
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
            onLoad={() => setIsLoading(false)}
            onError={() => { setHasError(true); setIsLoading(false); }}
          />
        )}
      </div>

      {/* Thumbnail strip — ALL photos, scrollable, auto-scrolls to active */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div
          ref={thumbStripRef}
          className="flex gap-2 overflow-x-auto max-w-full pb-2 scrollbar-thin px-[calc(50%-24px)]"
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
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 ${
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

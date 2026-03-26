'use client';

import { Photo } from './types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

function LightboxContent({ 
  photos, 
  initialIndex, 
  isOpen, 
  onClose 
}: { 
  photos: Photo[]; 
  initialIndex: number; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const handlePrev = useCallback(() => {
    setIsLoading(true);
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setIsLoading(true);
    setIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5));

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        handlePrev();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        setZoom((z) => Math.min(z + 0.5, 3));
        break;
      case '-':
        setZoom((z) => Math.max(z - 0.5, 0.5));
        break;
    }
  }, [isOpen, onClose, handlePrev, handleNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentPhoto = photos[index];

  if (!currentPhoto) return null;

  return (
    <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
      {/* Visually hidden title for accessibility */}
      <DialogTitle className="sr-only">
        Photo viewer - {currentPhoto.name}
      </DialogTitle>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white">
          <p className="font-medium">{currentPhoto.name}</p>
          <p className="text-sm text-white/70">
            {index + 1} / {photos.length} • {new Date(currentPhoto.lastModified).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="text-white hover:bg-white/20"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="text-white hover:bg-white/20"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <a
            href={`/api/photos${currentPhoto.path}`}
            download={currentPhoto.name}
            className="inline-flex"
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Download className="h-5 w-5" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Image container */}
      <div className="flex items-center justify-center w-full h-[95vh] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          src={`/api/photos${currentPhoto.path}`}
          alt={currentPhoto.name}
          className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ transform: `scale(${zoom})` }}
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Thumbnails */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex justify-center gap-2 overflow-x-auto max-w-full pb-2 scrollbar-thin">
          {photos.map((photo, i) => (
            <button
              key={photo.path}
              onClick={() => {
                setIsLoading(true);
                setIndex(i);
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-200 ${
                i === index
                  ? 'ring-2 ring-white scale-110'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={`/api/photos${photo.path}`}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </DialogContent>
  );
}

export function Lightbox({ photos, currentIndex, isOpen, onClose }: LightboxProps) {
  // Use key to reset state when currentIndex changes
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
      />
    </Dialog>
  );
}

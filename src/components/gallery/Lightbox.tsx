'use client';

import { Photo } from './types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Loader2,
  EyeOff,
  Trash2,
  Star,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { formatSyntheticMeta } from '@/lib/photo-meta';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

function LightboxContent({
  photos,
  initialIndex,
  isOpen,
  onClose,
  onHidePhoto,
  onDeletePhoto,
  coverPaths,
  onToggleCover,
}: {
  photos: Photo[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const thumbStripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const isFirstRender = useRef(true);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const currentPhoto = photos[index];
  const imageUrl = currentPhoto ? `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=medium` : '';
  const fullImageUrl = currentPhoto ? `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=full` : '';
  const isCover = currentPhoto ? (coverPaths ?? []).includes(currentPhoto.path) : false;

  const expectedUrl = useRef(imageUrl);

  useEffect(() => {
    expectedUrl.current = imageUrl;
    setHasError(false);
    setIsLoading(true);
  }, [imageUrl]);

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
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setZoom(1);
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % photos.length);
    setZoom(1);
  }, [photos.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5));

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
    },
    [isOpen, onClose, handlePrev, handleNext],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  const metaLine = formatSyntheticMeta(currentPhoto);

  return (
    <DialogContent
      overlayClassName="gallery-lightbox-overlay"
      className="gallery-lightbox-content border-none bg-transparent p-0 shadow-none"
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
      <DialogTitle className="sr-only">Photo viewer — {currentPhoto.name}</DialogTitle>

      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
        <div className="mr-2 min-w-0 flex-1 text-white">
          <p className="truncate text-sm font-medium">{currentPhoto.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-9 w-9 text-white hover:bg-white/15"
            aria-label="Уменьшить"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[2.5rem] text-center font-mono text-xs tabular-nums text-white/80">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-9 w-9 text-white hover:bg-white/15"
            aria-label="Увеличить"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onHidePhoto && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onHidePhoto(currentPhoto)}
              className="h-9 w-9 text-white hover:bg-white/15"
              aria-label="Скрыть фото"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
          {onDeletePhoto && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeletePhoto(currentPhoto)}
              className="h-9 w-9 text-red-300 hover:bg-red-500/25"
              aria-label="Удалить фото"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {onToggleCover && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleCover(currentPhoto)}
              className={
                isCover
                  ? 'h-9 w-9 text-amber-400 hover:bg-amber-500/20'
                  : 'h-9 w-9 text-white hover:bg-white/15'
              }
              aria-label={isCover ? 'Убрать с обложки' : 'Сделать обложкой папки'}
            >
              <Star className={`h-4 w-4 ${isCover ? 'fill-current' : ''}`} />
            </Button>
          )}
          <a href={fullImageUrl} download={currentPhoto.name} className="inline-flex">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/15" aria-label="Скачать">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 font-mono text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/20">
        {photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute top-1/2 left-2 z-10 h-10 w-10 -translate-y-1/2 text-white hover:bg-white/15"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="h-7 w-7" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute top-1/2 right-2 z-10 h-10 w-10 -translate-y-1/2 text-white hover:bg-white/15"
              aria-label="Следующее фото"
            >
              <ChevronRight className="h-7 w-7" />
            </Button>
          </>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--amber)]" />
            <p className="text-sm text-white/60">Loading image...</p>
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-white">
            <X className="h-12 w-12 text-red-400" />
            <p className="text-base">Failed to load image</p>
            <Button variant="outline" onClick={() => { setHasError(false); setIsLoading(true); }}>
              Retry
            </Button>
          </div>
        )}
        <img
          src={imageUrl}
          alt={currentPhoto.name}
          className={`max-h-[85vh] max-w-[90vw] object-contain transition-all duration-300 ${
            isLoading || hasError ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ transform: `scale(${zoom})` }}
          fetchPriority="high"
          onLoad={() => {
            if (expectedUrl.current === imageUrl) setIsLoading(false);
          }}
          onError={() => {
            if (expectedUrl.current === imageUrl) {
              setHasError(true);
              setIsLoading(false);
            }
          }}
        />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black/50 px-4 py-2 text-center font-mono text-[11px] tracking-wide text-[rgba(233,228,217,0.75)]">
        {currentPhoto.name} · {metaLine} · «frame {index + 1}/{photos.length}»
      </div>

      <div className="shrink-0 bg-gradient-to-t from-black/80 to-black/40 px-3 py-2">
        <div
          ref={thumbStripRef}
          className="scrollbar-lightbox flex max-w-full gap-2 overflow-x-auto px-[calc(50%-24px)] pb-1"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.path}
              type="button"
              ref={(el) => {
                if (el) thumbRefs.current.set(i, el);
                else thumbRefs.current.delete(i);
              }}
              onClick={() => {
                if (i !== index) {
                  setZoom(1);
                  setIndex(i);
                }
              }}
              className={`h-10 w-10 shrink-0 overflow-hidden rounded-md transition-all duration-200 ${
                i === index ? 'scale-110 ring-2 ring-[var(--amber)]' : 'opacity-50 hover:opacity-80'
              }`}
              aria-label={`Миниатюра ${photo.name}`}
            >
              <img
                src={`/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`}
                alt=""
                className="h-full w-full object-cover"
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

export function Lightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onHidePhoto,
  onDeletePhoto,
  coverPaths,
  onToggleCover,
}: LightboxProps) {
  const contentKey = useMemo(() => `${isOpen}-${currentIndex}-${photos.length}`, [isOpen, currentIndex, photos.length]);

  if (!isOpen || photos.length === 0) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <LightboxContent
        key={contentKey}
        photos={photos}
        initialIndex={currentIndex}
        isOpen={isOpen}
        onClose={onClose}
        onHidePhoto={onHidePhoto}
        onDeletePhoto={onDeletePhoto}
        coverPaths={coverPaths}
        onToggleCover={onToggleCover}
      />
    </Dialog>
  );
}

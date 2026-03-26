'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid3X3, 
  LayoutGrid, 
  Hexagon, 
  Waves, 
  RefreshCw, 
  ImageOff, 
  Loader2,
  Cloud,
  SortAsc,
  SortDesc,
  Crown,
  Minus,
  Palmtree,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MasonryLayout,
  BentoLayout,
  HoneycombLayout,
  WaveLayout,
  EmpireLayout,
  MinimalismLayout,
  MediterraneanLayout,
  Lightbox,
  Photo,
  CollageLayout,
} from '@/components/gallery';

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

interface PhotosResponse {
  success: boolean;
  mode: 'demo' | 'webdav';
  photos: Photo[];
  error?: string;
}

const layoutOptions: { value: CollageLayout; label: string; icon: React.ReactNode }[] = [
  { value: 'masonry', label: 'Masonry', icon: <Grid3X3 className="h-4 w-4" /> },
  { value: 'bento', label: 'Bento', icon: <LayoutGrid className="h-4 w-4" /> },
  { value: 'honeycomb', label: 'Honeycomb', icon: <Hexagon className="h-4 w-4" /> },
  { value: 'wave', label: 'Wave', icon: <Waves className="h-4 w-4" /> },
  { value: 'empire', label: 'Empire', icon: <Crown className="h-4 w-4" /> },
  { value: 'minimalism', label: 'Minimal', icon: <Minus className="h-4 w-4" /> },
  { value: 'mediterranean', label: 'Med', icon: <Palmtree className="h-4 w-4" /> },
];

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'demo' | 'webdav'>('demo');
  const [layout, setLayout] = useState<CollageLayout>('masonry');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const fetchPhotos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/photos');
      const data: PhotosResponse = await response.json();
      
      setMode(data.mode);
      
      if (!data.success) {
        setError(data.error || 'Failed to fetch photos');
        setPhotos([]);
        setOriginalPhotos([]);
      } else {
        setOriginalPhotos(data.photos);
        setPhotos(data.photos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
      setPhotos([]);
      setOriginalPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  useEffect(() => {
    const sorted = [...originalPhotos].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        case 'name-desc':
          return b.name.localeCompare(a.name, undefined, { numeric: true });
        case 'date-asc':
          return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        case 'date-desc':
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        default:
          return 0;
      }
    });
    setPhotos(sorted);
  }, [sortOption, originalPhotos]);

  const handlePhotoClick = useCallback((photo: Photo, index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  }, []);

  const renderLayout = useMemo(() => {
    switch (layout) {
      case 'masonry':
        return <MasonryLayout photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'bento':
        return <BentoLayout photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'honeycomb':
        return <HoneycombLayout photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'wave':
        return <WaveLayout photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'empire':
        return <EmpireLayout photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'minimalism':
        return <MinimalismLayout photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'mediterranean':
        return <MediterraneanLayout photos={photos} onPhotoClick={handlePhotoClick} />;
      default:
        return <MasonryLayout photos={photos} onPhotoClick={handlePhotoClick} />;
    }
  }, [layout, photos, handlePhotoClick]);

  const isStyleLayout = useMemo(
    () => ['empire', 'minimalism', 'mediterranean'].includes(layout),
    [layout]
  );

  return (
    <TooltipProvider>
      <div className={`min-h-screen flex flex-col ${isStyleLayout ? '' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-lg ${mode === 'webdav' ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/20' : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'}`}>
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Photo Gallery
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {mode === 'webdav' ? 'WebDAV' : 'Demo'}
                    </p>
                    {mode === 'webdav' && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        ●
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Sort */}
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                  <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-9">
                    <SelectValue placeholder="Sort..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc"><SortAsc className="h-3 w-3 inline mr-1" />Name ↑</SelectItem>
                    <SelectItem value="name-desc"><SortDesc className="h-3 w-3 inline mr-1" />Name ↓</SelectItem>
                    <SelectItem value="date-asc"><SortAsc className="h-3 w-3 inline mr-1" />Date ↑</SelectItem>
                    <SelectItem value="date-desc"><SortDesc className="h-3 w-3 inline mr-1" />Date ↓</SelectItem>
                  </SelectContent>
                </Select>

                {/* Refresh */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={fetchPhotos}
                      disabled={isLoading}
                      className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-9 w-9"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Layout Selector - Single Row */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
              {layoutOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={layout === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout(option.value)}
                  className={`flex items-center gap-1.5 h-8 px-2.5 transition-all ${
                    layout === option.value
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                      : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                >
                  {option.icon}
                  <span className="hidden sm:inline text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 ${isStyleLayout ? '' : 'container mx-auto px-4 py-6'}`}>
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400">Loading photos...</p>
              </motion.div>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center min-h-[50vh]"
            >
              <Card className="max-w-md w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-red-200 dark:border-red-900">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Error</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{error}</p>
                      <Button size="sm" onClick={fetchPhotos}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty */}
          {!isLoading && !error && photos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center min-h-[50vh]"
            >
              <Card className="max-w-sm w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="pt-6 text-center">
                  <ImageOff className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No Photos</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">The directory is empty.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Gallery */}
          {!isLoading && !error && photos.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {!isStyleLayout && (
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    {photos.length} photos
                  </Badge>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={layout}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderLayout}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        {/* Footer */}
        {!isStyleLayout && (
          <footer className="mt-auto border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                Photo Gallery • {photos.length > 0 && `${photos.length} photos`}
              </p>
            </div>
          </footer>
        )}

        {/* Lightbox */}
        <Lightbox
          photos={photos}
          currentIndex={currentPhotoIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
}

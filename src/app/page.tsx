'use client';

import { useState, useEffect } from 'react';
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
  Settings,
  Crown,
  Minus,
  Palmtree,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

interface ConnectionDetails {
  url: string;
  photosDir: string;
  directoryExists?: boolean;
  fileCount?: number;
}

interface PhotosResponse {
  success: boolean;
  mode: 'demo' | 'webdav';
  photos: Photo[];
  error?: string;
  message?: string;
  connectionDetails?: ConnectionDetails;
}

const layoutOptions: { value: CollageLayout; label: string; icon: React.ReactNode; group: 'grid' | 'artistic' | 'style' }[] = [
  // Grid layouts
  { value: 'masonry', label: 'Masonry', icon: <Grid3X3 className="h-4 w-4" />, group: 'grid' },
  { value: 'bento', label: 'Bento Grid', icon: <LayoutGrid className="h-4 w-4" />, group: 'grid' },
  { value: 'honeycomb', label: 'Honeycomb', icon: <Hexagon className="h-4 w-4" />, group: 'artistic' },
  { value: 'wave', label: 'Wave', icon: <Waves className="h-4 w-4" />, group: 'artistic' },
  // Style layouts
  { value: 'empire', label: 'Empire', icon: <Crown className="h-4 w-4" />, group: 'style' },
  { value: 'minimalism', label: 'Minimalism', icon: <Minus className="h-4 w-4" />, group: 'style' },
  { value: 'mediterranean', label: 'Mediterranean', icon: <Palmtree className="h-4 w-4" />, group: 'style' },
];

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [mode, setMode] = useState<'demo' | 'webdav'>('demo');
  const [layout, setLayout] = useState<CollageLayout>('masonry');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const fetchPhotos = async () => {
    setIsLoading(true);
    setError(null);
    setConnectionDetails(null);
    
    try {
      const response = await fetch('/api/photos');
      const data: PhotosResponse = await response.json();
      
      setMode(data.mode);
      
      if (!data.success) {
        setError(data.error || 'Failed to fetch photos');
        if (data.connectionDetails) {
          setConnectionDetails(data.connectionDetails);
        }
        setPhotos([]);
        setOriginalPhotos([]);
      } else {
        setOriginalPhotos(data.photos);
        setPhotos(data.photos);
        if (data.connectionDetails) {
          setConnectionDetails(data.connectionDetails);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
      setPhotos([]);
      setOriginalPhotos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

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

  const handlePhotoClick = (photo: Photo, index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const renderLayout = () => {
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
  };

  // Check if current layout is a style layout (has its own background)
  const isStyleLayout = ['empire', 'minimalism', 'mediterranean'].includes(layout);

  return (
    <TooltipProvider>
      <div className={`min-h-screen flex flex-col ${isStyleLayout ? '' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-lg ${mode === 'webdav' ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/20' : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'}`}>
                  <Cloud className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Photo Gallery
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {mode === 'webdav' ? 'WebDAV Cloud' : 'Demo Mode'}
                    </p>
                    {mode === 'webdav' && connectionDetails && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        Connected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Sort Control */}
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">
                      <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4" />
                        Name (A-Z)
                      </div>
                    </SelectItem>
                    <SelectItem value="name-desc">
                      <div className="flex items-center gap-2">
                        <SortDesc className="h-4 w-4" />
                        Name (Z-A)
                      </div>
                    </SelectItem>
                    <SelectItem value="date-asc">
                      <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4" />
                        Date (Oldest)
                      </div>
                    </SelectItem>
                    <SelectItem value="date-desc">
                      <div className="flex items-center gap-2">
                        <SortDesc className="h-4 w-4" />
                        Date (Newest)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Refresh Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={fetchPhotos}
                      disabled={isLoading}
                      className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Photos</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Layout Selector */}
            <Separator className="my-4" />
            <div className="flex flex-col gap-3">
              {/* Grid Layouts */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 uppercase tracking-wider">
                  Grid:
                </span>
                {layoutOptions.filter(o => o.group === 'grid').map((option) => (
                  <Button
                    key={option.value}
                    variant={layout === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLayout(option.value)}
                    className={`flex items-center gap-2 transition-all ${
                      layout === option.value
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20'
                        : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                  >
                    {option.icon}
                    <span className="hidden sm:inline">{option.label}</span>
                  </Button>
                ))}
              </div>

              {/* Artistic Layouts */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 uppercase tracking-wider">
                  Art:
                </span>
                {layoutOptions.filter(o => o.group === 'artistic').map((option) => (
                  <Button
                    key={option.value}
                    variant={layout === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLayout(option.value)}
                    className={`flex items-center gap-2 transition-all ${
                      layout === option.value
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20'
                        : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                  >
                    {option.icon}
                    <span className="hidden sm:inline">{option.label}</span>
                  </Button>
                ))}
              </div>

              {/* Style Layouts */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 uppercase tracking-wider">
                  Style:
                </span>
                {layoutOptions.filter(o => o.group === 'style').map((option) => (
                  <Button
                    key={option.value}
                    variant={layout === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLayout(option.value)}
                    className={`flex items-center gap-2 transition-all ${
                      layout === option.value
                        ? layout === 'empire'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg shadow-amber-500/20'
                          : layout === 'minimalism'
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-500/20'
                          : 'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                  >
                    {option.icon}
                    <span className="hidden sm:inline">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 ${isStyleLayout ? '' : 'container mx-auto px-4 py-8'}`}>
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <Loader2 className="h-12 w-12 text-violet-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400">Loading photos...</p>
              </motion.div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center min-h-[50vh]"
            >
              <Card className="max-w-lg w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-red-200 dark:border-red-900">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Connection Error
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        {error}
                      </p>
                      
                      {connectionDetails && (
                        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Connection Details
                          </h4>
                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <p><span className="font-medium">WebDAV URL:</span> {connectionDetails.url}</p>
                            <p><span className="font-medium">Photos Directory:</span> {connectionDetails.photosDir}</p>
                            {connectionDetails.directoryExists !== undefined && (
                              <p>
                                <span className="font-medium">Directory Exists:</span>{' '}
                                <span className={connectionDetails.directoryExists ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {connectionDetails.directoryExists ? 'Yes' : 'No'}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button onClick={fetchPhotos} variant="default">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !error && photos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center min-h-[50vh]"
            >
              <Card className="max-w-md w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                    <Cloud className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    No Photos Found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    The configured directory is empty or does not exist.
                  </p>
                  {connectionDetails && (
                    <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                      <p>Directory: {connectionDetails.photosDir}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Photo Gallery */}
          {!isLoading && !error && photos.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Photo Count Badge - only for non-style layouts */}
              {!isStyleLayout && (
                <div className="flex items-center justify-between mb-6">
                  <Badge variant="secondary" className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    {photos.length} photo{photos.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}

              {/* Gallery Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={layout}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderLayout()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        {/* Footer */}
        {!isStyleLayout && (
          <footer className="mt-auto border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
                <p>
                  Photo Gallery • WebDAV Cloud Integration
                </p>
                <p>
                  {photos.length > 0 && `${photos.length} photos loaded`}
                </p>
              </div>
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

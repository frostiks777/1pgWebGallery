'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  XCircle,
  CircleCheck,
  CircleDashed,
  Folder,
  ChevronRight,
  Frame,
  ChevronUp,
  Eye,
  Sun,
  Moon,
  Lock,
  LogIn,
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
  AlbumLayout,
  Lightbox,
  Photo,
  CollageLayout,
} from '@/components/gallery';

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

interface FolderInfo {
  name: string;
  path: string;
}

interface PhotosResponse {
  success: boolean;
  mode: 'demo' | 'webdav';
  photos: Photo[];
  error?: string;
}

interface FoldersResponse {
  success: boolean;
  folders: FolderInfo[];
  error?: string;
}

const layoutOptions: { value: CollageLayout; label: string; icon: React.ReactNode; isNew?: boolean }[] = [
  { value: 'masonry',    label: 'Masonry',  icon: <Grid3X3   className="h-4 w-4" /> },
  { value: 'bento',      label: 'Bento',    icon: <LayoutGrid className="h-4 w-4" /> },
  { value: 'honeycomb',  label: 'Honeycomb',icon: <Hexagon   className="h-4 w-4" /> },
  { value: 'wave',       label: 'Wave',     icon: <Waves     className="h-4 w-4" /> },
  { value: 'empire',     label: 'Empire',   icon: <Crown     className="h-4 w-4" /> },
  { value: 'minimalism', label: 'Minimal',  icon: <Minus     className="h-4 w-4" /> },
  { value: 'album',      label: 'Album',    icon: <Frame     className="h-4 w-4" />, isNew: true },
];

const STYLE_LAYOUTS: CollageLayout[] = ['empire', 'minimalism', 'album'];

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

  // Hidden photos (per-directory)
  const [hiddenPaths, setHiddenPaths] = useState<string[]>([]);

  // Panorama photos (per-directory)
  const [panoramaPaths, setPanoramaPaths] = useState<string[]>([]);

  // Scroll-to-top visibility
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Auth state
  const [authRequired, setAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  const skipBeforeUnload = useRef(false);

  // Dark / light theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light';
    setTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  // Check auth status on mount
  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((data: { authenticated: boolean; required: boolean }) => {
        setAuthRequired(data.required);
        setIsAuthenticated(data.authenticated);
      })
      .catch(() => {});
  }, []);

  // Folder navigation state
  // currentPath is relative to PHOTOS_DIR, empty string = root
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [isFoldersLoading, setIsFoldersLoading] = useState(false);

  // Fetch per-directory metadata (hidden + panoramas) whenever folder changes
  useEffect(() => {
    const dirParam = currentPath ? `?dir=${encodeURIComponent(currentPath)}` : '?dir=';
    Promise.all([
      fetch(`/api/hidden${dirParam}`).then((r) => r.json()).catch(() => ({ paths: [] })),
      fetch(`/api/panoramas${dirParam}`).then((r) => r.json()).catch(() => ({ paths: [] })),
    ]).then(([hiddenData, panoramaData]) => {
      if (Array.isArray(hiddenData.paths))   setHiddenPaths(hiddenData.paths);
      if (Array.isArray(panoramaData.paths)) setPanoramaPaths(panoramaData.paths);
    });
  }, [currentPath]);

  // Scroll-to-top: show button after scrolling 300px
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Confirm before leaving / closing the page (skip on planned reloads)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (skipBeforeUnload.current) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Thumbnail generation state
  const [genStatus, setGenStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [genProgress, setGenProgress] = useState(0);
  const [genTooltip, setGenTooltip] = useState('Сгенерировать миниатюры для текущей папки');

  const pollGenerateStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/images/generate');
      const data = await res.json();
      if (data.running) {
        setGenStatus('running');
        setGenProgress(data.progress || 0);
        setGenTooltip(`Generating... ${data.done}/${data.total} (${data.progress}%)`);
      } else if (data.finishedAt) {
        setGenStatus('done');
        setGenProgress(100);
        const skipped = data.skipped || 0;
        const errors = data.errors || 0;
        setGenTooltip(`Done: ${data.done} processed, ${skipped} skipped${errors > 0 ? `, ${errors} errors` : ''}. Click to re-check.`);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (genStatus !== 'running') return;
    const iv = setInterval(pollGenerateStatus, 2000);
    return () => clearInterval(iv);
  }, [genStatus, pollGenerateStatus]);

  useEffect(() => { pollGenerateStatus(); }, [pollGenerateStatus]);

  const handleGenerate = useCallback(async () => {
    try {
      setGenStatus('running');
      setGenProgress(0);
      setGenTooltip('Starting...');
      await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath || undefined }),
      });
    } catch {
      setGenStatus('idle');
      setGenTooltip('Generate all thumbnails');
    }
  }, [currentPath]);

  const fetchFolders = useCallback(async (path: string) => {
    setIsFoldersLoading(true);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const response = await fetch(`/api/folders${params}`);
      const data: FoldersResponse = await response.json();
      setFolders(data.success ? data.folders : []);
    } catch {
      setFolders([]);
    } finally {
      setIsFoldersLoading(false);
    }
  }, []);

  const fetchPhotos = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const response = await fetch(`/api/photos${params}`);
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

  // Whenever path changes, fetch both folders and photos for that path
  useEffect(() => {
    fetchFolders(currentPath);
    fetchPhotos(currentPath);
  }, [currentPath, fetchFolders, fetchPhotos]);

  const handleAuthSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(false);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: authPassword }),
      });
      if (res.ok) {
        skipBeforeUnload.current = true;
        window.location.reload();
        return;
      } else {
        setAuthError(true);
        setTimeout(() => setAuthError(false), 2000);
      }
    } catch {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    } finally {
      setAuthLoading(false);
    }
  }, [authPassword]);

  useEffect(() => {
    const sorted = [...originalPhotos].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':  return a.name.localeCompare(b.name, undefined, { numeric: true });
        case 'name-desc': return b.name.localeCompare(a.name, undefined, { numeric: true });
        case 'date-asc':  return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        case 'date-desc': return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        default: return 0;
      }
    });
    setPhotos(sorted);
  }, [sortOption, originalPhotos]);

  const handlePhotoClick = useCallback((photo: Photo, index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  }, []);

  // folder.path is relative to PHOTOS_DIR (e.g. "Event1" or "Event1/Sub")
  const navigateInto = useCallback((folder: FolderInfo) => {
    setCurrentPath(folder.path);
  }, []);

  // Breadcrumbs: split current absolute path into segments for display.
  // The first breadcrumb is always "Home" (maps to path="").
  const breadcrumbs: { label: string; path: string }[] = useMemo(() => {
    if (!currentPath) return [{ label: 'Home', path: '' }];
    const segments = currentPath.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [{ label: 'Home', path: '' }];
    segments.forEach((seg, i) => {
      crumbs.push({
        label: seg,
        path: segments.slice(0, i + 1).join('/'),
      });
    });
    return crumbs;
  }, [currentPath]);

  const handleRefresh = useCallback(() => {
    fetchFolders(currentPath);
    fetchPhotos(currentPath);
  }, [currentPath, fetchFolders, fetchPhotos]);

  const handleHidePhoto = useCallback(async (photo: Photo) => {
    const currentVisible = photos.filter((p) => !hiddenPaths.includes(p.path));
    const hiddenIdx = currentVisible.findIndex((p) => p.path === photo.path);
    const newVisible = currentVisible.filter((p) => p.path !== photo.path);

    if (lightboxOpen) {
      if (newVisible.length === 0) {
        setLightboxOpen(false);
      } else {
        setCurrentPhotoIndex(Math.min(hiddenIdx, newVisible.length - 1));
      }
    }

    setHiddenPaths((prev) => (prev.includes(photo.path) ? prev : [...prev, photo.path]));
    try {
      await fetch('/api/hidden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: photo.path, dir: currentPath }),
      });
    } catch {}
  }, [currentPath, lightboxOpen, photos, hiddenPaths]);

  const handleShowAll = useCallback(async () => {
    setHiddenPaths([]);
    try {
      await fetch('/api/hidden', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [], dir: currentPath }),
      });
    } catch {}
  }, [currentPath]);

  const handleTogglePanorama = useCallback(async (photo: Photo) => {
    const isCurrentlyPanorama = panoramaPaths.includes(photo.path);
    setPanoramaPaths((prev) =>
      isCurrentlyPanorama ? prev.filter((p) => p !== photo.path) : [...prev, photo.path],
    );
    try {
      await fetch('/api/panoramas', {
        method: isCurrentlyPanorama ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: photo.path, dir: currentPath }),
      });
    } catch {}
  }, [currentPath, panoramaPaths]);

  // Photos visible to the user (hidden ones filtered out)
  const visiblePhotos = useMemo(
    () => photos.filter((p) => !hiddenPaths.includes(p.path)),
    [photos, hiddenPaths],
  );

  // Hidden photos that belong to the currently displayed folder only
  const hiddenInCurrentFolder = useMemo(
    () => originalPhotos.filter((p) => hiddenPaths.includes(p.path)),
    [originalPhotos, hiddenPaths],
  );

  const renderLayout = useMemo(() => {
    const commonProps = {
      photos: visiblePhotos,
      onPhotoClick: handlePhotoClick,
      onHidePhoto: handleHidePhoto,
      panoramaPaths,
      onTogglePanorama: handleTogglePanorama,
    };
    switch (layout) {
      case 'masonry':    return <MasonryLayout    {...commonProps} />;
      case 'bento':      return <BentoLayout      {...commonProps} />;
      case 'honeycomb':  return <HoneycombLayout  {...commonProps} />;
      case 'wave':       return <WaveLayout       {...commonProps} />;
      case 'empire':     return <EmpireLayout     {...commonProps} />;
      case 'minimalism': return <MinimalismLayout {...commonProps} />;
      case 'album':      return <AlbumLayout      {...commonProps} />;
      default:           return <MasonryLayout    {...commonProps} />;
    }
  }, [layout, visiblePhotos, handlePhotoClick, handleHidePhoto, panoramaPaths, handleTogglePanorama]);

  const isStyleLayout = useMemo(
    () => STYLE_LAYOUTS.includes(layout) && visiblePhotos.length > 0,
    [layout, visiblePhotos.length],
  );

  const isAtRoot = currentPath === '';

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

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Password field — visible only when auth is required and not yet authenticated */}
                {authRequired && !isAuthenticated && (
                  <form onSubmit={handleAuthSubmit} className="flex items-center gap-1.5">
                    <div className="relative">
                      <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Пароль"
                        className={`h-9 pl-7 pr-3 text-sm rounded-md border bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm outline-none focus:ring-2 transition-colors w-32
                          ${authError
                            ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-violet-300 dark:focus:ring-violet-700'
                          }
                          text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                        autoComplete="current-password"
                        disabled={authLoading}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={authLoading || !authPassword}
                      className="h-9 px-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                    >
                      {authLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <LogIn className="h-4 w-4" />}
                    </Button>
                  </form>
                )}
                {hiddenInCurrentFolder.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShowAll}
                        className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-9 gap-1.5 text-xs"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Показать все</span>
                        <span className="inline sm:hidden">{hiddenInCurrentFolder.length}</span>
                        <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                          ({hiddenInCurrentFolder.length})
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Показать {hiddenInCurrentFolder.length} скрытых фото</TooltipContent>
                  </Tooltip>
                )}
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                  <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-9">
                    <SelectValue placeholder="Sort..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc"><SortAsc  className="h-3 w-3 inline mr-1" />Name ↑</SelectItem>
                    <SelectItem value="name-desc"><SortDesc className="h-3 w-3 inline mr-1" />Name ↓</SelectItem>
                    <SelectItem value="date-asc"><SortAsc  className="h-3 w-3 inline mr-1" />Date ↑</SelectItem>
                    <SelectItem value="date-desc"><SortDesc className="h-3 w-3 inline mr-1" />Date ↓</SelectItem>
                  </SelectContent>
                </Select>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline" size="icon"
                      onClick={handleGenerate}
                      disabled={genStatus === 'running'}
                      className={`relative bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-9 w-9 ${
                        genStatus === 'done' ? 'border-green-300 dark:border-green-700' : ''
                      }`}
                    >
                      {genStatus === 'running' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                            {genProgress}
                          </span>
                        </>
                      ) : genStatus === 'done' ? (
                        <CircleCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <CircleDashed className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{genTooltip}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline" size="icon"
                      onClick={handleRefresh}
                      disabled={isLoading || isFoldersLoading}
                      className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-9 w-9"
                    >
                      <RefreshCw className={`h-4 w-4 ${(isLoading || isFoldersLoading) ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline" size="icon"
                      onClick={toggleTheme}
                      className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-9 w-9"
                    >
                      {theme === 'dark'
                        ? <Sun className="h-4 w-4" />
                        : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Breadcrumb bar — Windows Explorer style */}
            {mode === 'webdav' && (currentPath !== '' || folders.length > 0) && (
              <nav className="flex items-center gap-0.5 mt-2 mb-1 overflow-x-auto pb-1 scrollbar-none">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <span key={crumb.path + idx} className="flex items-center gap-0.5 shrink-0">
                      {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                      <Button
                        variant={isLast ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => !isLast && setCurrentPath(crumb.path)}
                        disabled={isLast}
                        className={`h-7 px-2 text-xs font-medium rounded-md ${
                          isLast
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-default'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {crumb.label}
                      </Button>
                    </span>
                  );
                })}
              </nav>
            )}

            {/* Layout Selector — only when showing photos */}
            {visiblePhotos.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
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
                    {option.isNew && (
                      <span className="text-[9px] font-bold uppercase leading-none px-1 py-0.5 rounded bg-violet-500 text-white">
                        new
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 ${isStyleLayout ? '' : 'container mx-auto px-4 py-6'}`}>

          {/* Folder grid */}
          {folders.length > 0 && (
            <div className="mb-8">
              {isFoldersLoading ? (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading folders...</span>
                </div>
              ) : (
                <>
                  {isAtRoot && photos.length === 0 ? null : (
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                      Folders
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {folders.map((folder) => (
                      <motion.button
                        key={folder.path}
                        onClick={() => navigateInto(folder)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-md transition-all text-left"
                      >
                        <Folder className="h-10 w-10 text-amber-400 group-hover:text-amber-500 transition-colors" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-snug line-clamp-2 w-full">
                          {folder.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[30vh]">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400">Loading photos...</p>
              </motion.div>
            </div>
          )}

          {!isLoading && error && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center min-h-[30vh]">
              <Card className="max-w-md w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-red-200 dark:border-red-900">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Error</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{error}</p>
                      <Button size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-3 w-3 mr-1" />Retry
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!isLoading && !error && visiblePhotos.length === 0 && folders.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center min-h-[30vh]">
              <Card className="max-w-sm w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="pt-6 text-center">
                  <ImageOff className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Empty Folder</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">No photos or subfolders found here.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!isLoading && !error && visiblePhotos.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {!isStyleLayout && (
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    {visiblePhotos.length} photos
                  </Badge>
                  {hiddenInCurrentFolder.length > 0 && (
                    <Badge variant="outline" className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-400 dark:text-slate-500">
                      {hiddenInCurrentFolder.length} скрыто
                    </Badge>
                  )}
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

        {!isStyleLayout && (
          <footer className="mt-auto border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                Photo Gallery{visiblePhotos.length > 0 && ` • ${visiblePhotos.length} photos`}
                {hiddenInCurrentFolder.length > 0 && ` • ${hiddenInCurrentFolder.length} скрыто`}
              </p>
            </div>
          </footer>
        )}

        <Lightbox
          photos={visiblePhotos}
          currentIndex={currentPhotoIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onHidePhoto={handleHidePhoto}
        />

        {/* Scroll to top button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-slate-900/80 dark:bg-white/80 text-white dark:text-slate-900 shadow-lg backdrop-blur-sm hover:bg-slate-800 dark:hover:bg-white transition-colors flex items-center justify-center"
              aria-label="Прокрутить вверх"
            >
              <ChevronUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

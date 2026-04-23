'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  ImageOff,
  Loader2,
  Folder,
  ChevronUp,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  TooltipProvider,
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
  GalleryChrome,
  GalleryCountRow,
  GalleryFooter,
  type GallerySortOption,
} from '@/components/gallery';

type SortOption = GallerySortOption;

const VALID_OBSIDIAN_MODES: CollageLayout[] = [
  'masonry',
  'bento',
  'honeycomb',
  'wave',
  'empire',
  'minimalism',
  'album',
];

interface FolderInfo {
  name: string;
  path: string;
  previewPhotos?: string[];
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

function layoutCountLabel(layout: CollageLayout): string {
  switch (layout) {
    case 'masonry':
      return 'MASONRY';
    case 'bento':
      return 'BENTO';
    case 'honeycomb':
      return 'HONEYCOMB';
    case 'wave':
      return 'WAVE';
    case 'empire':
      return 'EMPIRE';
    case 'minimalism':
      return 'MINIMAL';
    case 'album':
      return 'ALBUM';
    default:
      return 'MASONRY';
  }
}

function sortCountParts(opt: SortOption): { line: string; arrow: string } {
  switch (opt) {
    case 'name-asc':
      return { line: 'NAME', arrow: '↑' };
    case 'name-desc':
      return { line: 'NAME', arrow: '↓' };
    case 'date-asc':
      return { line: 'DATE', arrow: '↑' };
    case 'date-desc':
      return { line: 'DATE', arrow: '↓' };
  }
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'demo' | 'webdav'>('demo');
  const [layout, setLayout] = useState<CollageLayout>('masonry');
  const [preferReducedMotion, setPreferReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setPreferReducedMotion(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('obsidian:mode');
      if (raw && VALID_OBSIDIAN_MODES.includes(raw as CollageLayout)) {
        setLayout(raw as CollageLayout);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const layoutPersistReady = useRef(false);
  useEffect(() => {
    if (!layoutPersistReady.current) {
      layoutPersistReady.current = true;
      return;
    }
    try {
      localStorage.setItem('obsidian:mode', layout);
    } catch {
      /* ignore */
    }
  }, [layout]);
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Hidden photos (per-directory)
  const [hiddenPaths, setHiddenPaths] = useState<string[]>([]);

  // Photos marked for deletion (client-side pending list)
  const [deletePendingPaths, setDeletePendingPaths] = useState<string[]>([]);

  // Panorama photos (per-directory)
  const [panoramaPaths, setPanoramaPaths] = useState<string[]>([]);

  // Cover photos for the current folder (shown as folder preview in parent)
  const [coverPaths, setCoverPaths] = useState<string[]>([]);
  const [coversInitialized, setCoversInitialized] = useState(false);
  const MAX_COVERS = 3;

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

  useLayoutEffect(() => {
    const saved = localStorage.getItem('obsidian:theme') || localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light';
    setTheme(initial);
    const root = document.documentElement;
    root.setAttribute('data-theme', initial === 'dark' ? 'dark' : 'light');
    if (initial === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      root.setAttribute('data-theme', next === 'dark' ? 'dark' : 'light');
      if (next === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      try {
        localStorage.setItem('obsidian:theme', next);
        localStorage.setItem('theme', next);
      } catch {
        /* ignore quota */
      }
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

  // Fetch per-directory metadata (hidden + panoramas + covers) whenever folder changes
  useEffect(() => {
    setCoversInitialized(false);
    const dirParam = currentPath ? `?dir=${encodeURIComponent(currentPath)}` : '?dir=';
    Promise.all([
      fetch(`/api/hidden${dirParam}`).then((r) => r.json()).catch(() => ({ paths: [] })),
      fetch(`/api/panoramas${dirParam}`).then((r) => r.json()).catch(() => ({ paths: [] })),
      fetch(`/api/covers${dirParam}`).then((r) => r.json()).catch(() => ({ paths: [] })),
    ]).then(([hiddenData, panoramaData, coverData]) => {
      if (Array.isArray(hiddenData.paths))   setHiddenPaths(hiddenData.paths);
      if (Array.isArray(panoramaData.paths)) setPanoramaPaths(panoramaData.paths);
      if (Array.isArray(coverData.paths))    setCoverPaths(coverData.paths);
      setCoversInitialized(true);
    });
  }, [currentPath]);

  // Auto-populate covers on first visit to a folder that has none yet
  useEffect(() => {
    if (!coversInitialized || coverPaths.length > 0 || isLoading || photos.length === 0) return;
    const firstN = photos.slice(0, MAX_COVERS).map((p) => p.path);
    setCoverPaths(firstN);
    fetch('/api/covers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: firstN, dir: currentPath }),
    }).catch(() => {});
  }, [coversInitialized, coverPaths.length, isLoading, photos, currentPath, MAX_COVERS]);

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

  const scrollToTop = useCallback(() => {
    const start = window.scrollY;
    if (start === 0) return;
    const duration = 1000;
    const startTime = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, start * (1 - ease(p)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

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

  const handleDeletePhoto = useCallback((photo: Photo) => {
    const currentVisible = photos.filter(
      (p) => !hiddenPaths.includes(p.path) && !deletePendingPaths.includes(p.path),
    );
    const idx = currentVisible.findIndex((p) => p.path === photo.path);
    const newVisible = currentVisible.filter((p) => p.path !== photo.path);

    if (lightboxOpen) {
      if (newVisible.length === 0) {
        setLightboxOpen(false);
      } else {
        setCurrentPhotoIndex(Math.min(idx, newVisible.length - 1));
      }
    }

    setDeletePendingPaths((prev) => (prev.includes(photo.path) ? prev : [...prev, photo.path]));
    setHiddenPaths((prev) => (prev.includes(photo.path) ? prev : [...prev, photo.path]));
  }, [photos, hiddenPaths, deletePendingPaths, lightboxOpen]);

  const handleConfirmDelete = useCallback(async () => {
    if (deletePendingPaths.length === 0) return;
    if (!window.confirm(`Удалить ${deletePendingPaths.length} фото без возможности восстановления?`)) return;

    try {
      await fetch('/api/photos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: deletePendingPaths, dir: currentPath }),
      });
    } catch {}

    setPhotos((prev) => prev.filter((p) => !deletePendingPaths.includes(p.path)));
    setOriginalPhotos((prev) => prev.filter((p) => !deletePendingPaths.includes(p.path)));
    setHiddenPaths((prev) => prev.filter((p) => !deletePendingPaths.includes(p)));
    setDeletePendingPaths([]);
  }, [deletePendingPaths, currentPath]);

  const handleRestoreDeleted = useCallback(() => {
    setHiddenPaths((prev) => prev.filter((p) => !deletePendingPaths.includes(p)));
    setDeletePendingPaths([]);
  }, [deletePendingPaths]);

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

  const handleToggleCover = useCallback(async (photo: Photo) => {
    const isCurrentlyCover = coverPaths.includes(photo.path);
    if (isCurrentlyCover) {
      setCoverPaths((prev) => prev.filter((p) => p !== photo.path));
      try {
        await fetch('/api/covers', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: photo.path, dir: currentPath }),
        });
      } catch {}
    } else {
      setCoverPaths((prev) => {
        if (prev.length >= MAX_COVERS) return [...prev.slice(1), photo.path];
        return [...prev, photo.path];
      });
      try {
        await fetch('/api/covers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: photo.path, dir: currentPath }),
        });
      } catch {}
    }
  }, [currentPath, coverPaths, MAX_COVERS]);

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

  const deletePendingInFolder = useMemo(
    () => originalPhotos.filter((p) => deletePendingPaths.includes(p.path)),
    [originalPhotos, deletePendingPaths],
  );

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':  return a.name.localeCompare(b.name, undefined, { numeric: true });
        case 'name-desc': return b.name.localeCompare(a.name, undefined, { numeric: true });
        default:          return a.name.localeCompare(b.name, undefined, { numeric: true });
      }
    });
  }, [folders, sortOption]);

  const renderLayout = useMemo(() => {
    const commonProps = {
      photos: visiblePhotos,
      onPhotoClick: handlePhotoClick,
      onHidePhoto: handleHidePhoto,
      onDeletePhoto: handleDeletePhoto,
      panoramaPaths,
      onTogglePanorama: handleTogglePanorama,
      coverPaths,
      onToggleCover: handleToggleCover,
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
  }, [layout, visiblePhotos, handlePhotoClick, handleHidePhoto, handleDeletePhoto, panoramaPaths, handleTogglePanorama, coverPaths, handleToggleCover]);

  const isAtRoot = currentPath === '';

  const sortParts = sortCountParts(sortOption);

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <GalleryChrome
          mode={mode}
          layout={layout}
          onLayoutChange={setLayout}
          visiblePhotoCount={visiblePhotos.length}
          sortOption={sortOption}
          onSortChange={setSortOption}
          authRequired={authRequired}
          isAuthenticated={isAuthenticated}
          authPassword={authPassword}
          onAuthPasswordChange={setAuthPassword}
          onAuthSubmit={handleAuthSubmit}
          authLoading={authLoading}
          authError={authError}
          hiddenInCurrentFolder={hiddenInCurrentFolder.length}
          onShowAllHidden={hiddenInCurrentFolder.length > 0 ? handleShowAll : undefined}
          deletePendingCount={deletePendingInFolder.length}
          onRestoreDeleted={deletePendingInFolder.length > 0 ? handleRestoreDeleted : undefined}
          onConfirmDelete={deletePendingInFolder.length > 0 ? handleConfirmDelete : undefined}
          genStatus={genStatus}
          genProgress={genProgress}
          genTooltip={genTooltip}
          onGenerate={handleGenerate}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          isFoldersLoading={isFoldersLoading}
          theme={theme}
          onToggleTheme={toggleTheme}
          showLayoutChips={visiblePhotos.length > 0}
          breadcrumbs={breadcrumbs}
          onBreadcrumbNavigate={setCurrentPath}
          showBreadcrumbs={mode === 'webdav' && (currentPath !== '' || folders.length > 0)}
        />

        {visiblePhotos.length > 0 && !isLoading && !error && (
          <GalleryCountRow
            photoCount={visiblePhotos.length}
            layoutLabel={layoutCountLabel(layout)}
            sortLine={sortParts.line}
            sortArrow={sortParts.arrow}
          />
        )}

        <main className="flex-1">
          {/* Folder grid */}
          {folders.length > 0 && (
            <div className="gallery-grid-shell mb-8">
              {isFoldersLoading ? (
                <div className="flex items-center gap-2 text-[var(--obs-muted)] py-4 font-mono text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--amber)]" />
                  <span>Loading folders...</span>
                </div>
              ) : (
                <>
                  {isAtRoot && photos.length === 0 ? null : (
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--obs-muted)] mb-3">
                      Folders
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {sortedFolders.map((folder) => {
                      const previews = folder.previewPhotos ?? [];
                      return (
                        <motion.button
                          key={folder.path}
                          onClick={() => navigateInto(folder)}
                          whileHover={preferReducedMotion ? undefined : { scale: 1.03 }}
                          whileTap={preferReducedMotion ? undefined : { scale: 0.97 }}
                          className="group flex flex-col items-center gap-2 p-3 rounded-[var(--r-md)] border border-[var(--rule)] bg-[var(--bg-elev)]/80 hover:border-[var(--amber-border)] hover:shadow-[var(--shadow-card)] transition-all text-left"
                        >
                          {previews.length === 0 ? (
                            <Folder className="h-10 w-10 text-amber-400 group-hover:text-amber-500 transition-colors my-2" />
                          ) : previews.length === 1 ? (
                            <div className="w-full aspect-[4/3] rounded-[var(--r-sm)] overflow-hidden bg-black/20">
                              <img
                                src={`/api/images?path=${encodeURIComponent(previews[0])}&size=thumbnail`}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : previews.length === 2 ? (
                            <div className="w-full aspect-[4/3] rounded-[var(--r-sm)] overflow-hidden bg-black/20 grid grid-cols-2 gap-0.5">
                              <img
                                src={`/api/images?path=${encodeURIComponent(previews[0])}&size=thumbnail`}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <img
                                src={`/api/images?path=${encodeURIComponent(previews[1])}&size=thumbnail`}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-[4/3] rounded-[var(--r-sm)] overflow-hidden bg-black/20 grid grid-cols-[2fr_1fr] grid-rows-2 gap-0.5">
                              <img
                                src={`/api/images?path=${encodeURIComponent(previews[0])}&size=thumbnail`}
                                alt=""
                                className="w-full h-full object-cover row-span-2"
                                loading="lazy"
                              />
                              <img
                                src={`/api/images?path=${encodeURIComponent(previews[1])}&size=thumbnail`}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <img
                                src={`/api/images?path=${encodeURIComponent(previews[2])}&size=thumbnail`}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <span className="text-xs font-medium text-[var(--fg)] text-center leading-snug line-clamp-2 w-full">
                            {folder.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[30vh]">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-[var(--amber)] animate-spin" />
                <p className="text-[var(--obs-muted)] font-mono text-sm">Loading photos...</p>
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

          {!isLoading && !isFoldersLoading && !error && visiblePhotos.length === 0 && folders.length === 0 && (
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: preferReducedMotion ? 0 : 0.3 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={layout}
                  initial={preferReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={preferReducedMotion ? false : { opacity: 1, y: 0 }}
                  exit={preferReducedMotion ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: preferReducedMotion ? 0 : 0.15 }}
                  className={preferReducedMotion ? '' : 'gallery-layout-enter'}
                >
                  <div className="gallery-grid-shell">{renderLayout}</div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        <GalleryFooter />

        <Lightbox
          photos={visiblePhotos}
          currentIndex={currentPhotoIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onHidePhoto={handleHidePhoto}
          onDeletePhoto={handleDeletePhoto}
          coverPaths={coverPaths}
          onToggleCover={handleToggleCover}
        />

        {/* Scroll to top button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full border border-[var(--amber-border)] bg-[var(--amber-tint)] text-[var(--amber)] shadow-lg backdrop-blur-sm hover:bg-[rgba(230,168,90,0.2)] transition-colors flex items-center justify-center"
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

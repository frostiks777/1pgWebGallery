'use client';

import type { FormEvent, ReactNode } from 'react';
import { Loader2, CircleDashed, EyeOff, Undo2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CollageLayout } from './types';
import {
  IconAperture,
  IconMasonry,
  IconBento,
  IconHoneycomb,
  IconWave,
  IconEmpire,
  IconMinimal,
  IconAlbum,
  IconLogin,
  IconSort,
  IconCheck,
  IconRefresh,
  IconSun,
  IconMoon,
  IconMenu,
} from './obsidian-icons';

export type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

const LAYOUT_CHIPS: {
  value: CollageLayout;
  label: string;
  Icon: typeof IconMasonry;
  isNew?: boolean;
}[] = [
  { value: 'masonry', label: 'Masonry', Icon: IconMasonry },
  { value: 'bento', label: 'Bento', Icon: IconBento },
  { value: 'honeycomb', label: 'Honeycomb', Icon: IconHoneycomb },
  { value: 'wave', label: 'Wave', Icon: IconWave },
  { value: 'empire', label: 'Empire', Icon: IconEmpire },
  { value: 'minimalism', label: 'Minimal', Icon: IconMinimal },
  { value: 'album', label: 'Album', Icon: IconAlbum, isNew: true },
];

function sortLabel(opt: SortOption): { line: string; arrow: string } {
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

function cycleSort(prev: SortOption): SortOption {
  const order: SortOption[] = ['name-asc', 'name-desc', 'date-asc', 'date-desc'];
  const i = order.indexOf(prev);
  return order[(i + 1) % order.length];
}

function iconBtnClass(active?: boolean) {
  return cn(
    'h-[30px] w-[30px] shrink-0 inline-flex items-center justify-center rounded-[var(--r-md)] transition-all duration-[180ms]',
    active
      ? 'bg-[var(--amber-tint)] text-[var(--amber)]'
      : 'text-[var(--fg)] hover:bg-black/[0.06] dark:hover:bg-white/[0.05]',
  );
}

function ToolbarMeta({
  hiddenInCurrentFolder,
  onShowAllHidden,
  deletePendingCount,
  onRestoreDeleted,
  onConfirmDelete,
}: Pick<
  GalleryChromeProps,
  'hiddenInCurrentFolder' | 'onShowAllHidden' | 'deletePendingCount' | 'onRestoreDeleted' | 'onConfirmDelete'
>) {
  return (
    <>
      {hiddenInCurrentFolder > 0 && onShowAllHidden && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onShowAllHidden}
              className={cn(iconBtnClass(), 'max-md:min-h-11 max-md:min-w-11')}
              aria-label={`Показать ${hiddenInCurrentFolder} скрытых фото`}
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Показать {hiddenInCurrentFolder} скрытых</TooltipContent>
        </Tooltip>
      )}
      {deletePendingCount > 0 && onRestoreDeleted && onConfirmDelete && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRestoreDeleted}
                className={cn(iconBtnClass(), 'max-md:min-h-11 max-md:min-w-11')}
                aria-label="Восстановить помеченные к удалению"
              >
                <Undo2 className="h-4 w-4 text-[var(--amber)]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Восстановить</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="h-[30px] px-2 rounded-[var(--r-md)] text-[11px] font-mono bg-red-600/90 text-white hover:bg-red-600 max-md:min-h-11 inline-flex items-center gap-1"
                aria-label="Удалить навсегда"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>({deletePendingCount})</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Удалить навсегда</TooltipContent>
          </Tooltip>
        </>
      )}
    </>
  );
}

function ToolbarSortGenRefreshTheme({
  sortOption,
  onSortChange,
  genStatus,
  genProgress,
  genTooltip,
  onGenerate,
  onRefresh,
  isLoading,
  isFoldersLoading,
  theme,
  onToggleTheme,
}: Pick<
  GalleryChromeProps,
  | 'sortOption'
  | 'onSortChange'
  | 'genStatus'
  | 'genProgress'
  | 'genTooltip'
  | 'onGenerate'
  | 'onRefresh'
  | 'isLoading'
  | 'isFoldersLoading'
  | 'theme'
  | 'onToggleTheme'
>) {
  const sl = sortLabel(sortOption);
  const genActive = genStatus === 'running' || genStatus === 'done';
  return (
    <>
      <button
        type="button"
        onClick={() => onSortChange(cycleSort(sortOption))}
        className={cn(
          'flex items-center gap-1.5 h-[30px] px-2.5 rounded-[var(--r-md)] border border-[var(--surface-border)] bg-[var(--surface-0)]',
          'font-mono text-[11px] text-[var(--fg)] hover:bg-[var(--accent-tint-soft)] transition-all duration-[180ms] max-md:min-h-11',
        )}
        aria-label="Сортировка: переключить режим"
      >
        <IconSort className="shrink-0 opacity-80" />
        <span className="tracking-wide">{sl.line}</span>
        <span className="text-[var(--amber)] tabular-nums">{sl.arrow}</span>
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onGenerate}
            disabled={genStatus === 'running'}
            className={cn(iconBtnClass(genActive), 'relative max-md:min-h-11 max-md:min-w-11')}
            aria-label={genTooltip}
          >
            {genStatus === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold font-mono bg-[var(--amber)] text-[#1a0f05] rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
                  {genProgress}
                </span>
              </>
            ) : genStatus === 'done' ? (
              <IconCheck className="h-4 w-4 text-[var(--amber)]" />
            ) : (
              <CircleDashed className="h-4 w-4 opacity-70" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{genTooltip}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isFoldersLoading}
            className={cn(iconBtnClass(), 'max-md:min-h-11 max-md:min-w-11')}
            aria-label="Обновить"
          >
            <IconRefresh className={cn('h-4 w-4', (isLoading || isFoldersLoading) && 'animate-spin')} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggleTheme}
            className={cn(iconBtnClass(), 'max-md:min-h-11 max-md:min-w-11')}
            aria-label={theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
          >
            {theme === 'dark' ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}</TooltipContent>
      </Tooltip>
    </>
  );
}

export interface GalleryChromeProps {
  mode: 'demo' | 'webdav';
  layout: CollageLayout;
  onLayoutChange: (layout: CollageLayout) => void;
  visiblePhotoCount: number;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  authRequired: boolean;
  isAuthenticated: boolean;
  authPassword: string;
  onAuthPasswordChange: (v: string) => void;
  onAuthSubmit: (e: FormEvent) => void;
  authLoading: boolean;
  authError: boolean;
  hiddenInCurrentFolder: number;
  onShowAllHidden?: () => void;
  deletePendingCount: number;
  onRestoreDeleted?: () => void;
  onConfirmDelete?: () => void;
  genStatus: 'idle' | 'running' | 'done';
  genProgress: number;
  genTooltip: string;
  onGenerate: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isFoldersLoading: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  showLayoutChips: boolean;
  breadcrumbs?: { label: string; path: string }[];
  onBreadcrumbNavigate?: (path: string) => void;
  showBreadcrumbs: boolean;
}

export function GalleryChrome({
  mode,
  layout,
  onLayoutChange,
  visiblePhotoCount,
  sortOption,
  onSortChange,
  authRequired,
  isAuthenticated,
  authPassword,
  onAuthPasswordChange,
  onAuthSubmit,
  authLoading,
  authError,
  hiddenInCurrentFolder,
  onShowAllHidden,
  deletePendingCount,
  onRestoreDeleted,
  onConfirmDelete,
  genStatus,
  genProgress,
  genTooltip,
  onGenerate,
  onRefresh,
  isLoading,
  isFoldersLoading,
  theme,
  onToggleTheme,
  showLayoutChips,
  breadcrumbs,
  onBreadcrumbNavigate,
  showBreadcrumbs,
}: GalleryChromeProps) {
  const sortGenProps = {
    sortOption,
    onSortChange,
    genStatus,
    genProgress,
    genTooltip,
    onGenerate,
    onRefresh,
    isLoading,
    isFoldersLoading,
    theme,
    onToggleTheme,
  };

  const passwordBlock =
    authRequired && !isAuthenticated ? (
      <form onSubmit={onAuthSubmit} className="flex items-center gap-1.5 shrink-0">
        <label className="relative flex items-center w-[180px] max-w-[min(180px,50vw)] h-[30px] rounded-[var(--r-md)] border border-[var(--surface-border)] bg-[var(--surface-0)] px-2 max-md:w-full max-md:max-w-none max-md:min-h-11">
          <span
            className="font-mono text-[10px] tracking-[0.12em] text-[var(--pass-label-color)] shrink-0 mr-1.5"
            aria-hidden
          >
            PASS
          </span>
          <input
            type="password"
            value={authPassword}
            onChange={(e) => onAuthPasswordChange(e.target.value)}
            className={cn(
              'flex-1 min-w-0 bg-transparent border-0 outline-none font-mono text-sm tracking-[0.2em] text-[var(--fg)] placeholder:text-[var(--obs-muted-dim)]',
              authError && 'text-red-400',
            )}
            placeholder=""
            autoComplete="current-password"
            disabled={authLoading}
            aria-label="Пароль"
          />
        </label>
        <button
          type="submit"
          disabled={authLoading || !authPassword}
          className={cn(iconBtnClass(), 'max-md:min-h-11 max-md:min-w-11')}
          aria-label="Войти"
        >
          {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconLogin />}
        </button>
      </form>
    ) : null;

  const desktopToolbar = (
    <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
      {passwordBlock}
      <ToolbarMeta
        hiddenInCurrentFolder={hiddenInCurrentFolder}
        onShowAllHidden={onShowAllHidden}
        deletePendingCount={deletePendingCount}
        onRestoreDeleted={onRestoreDeleted}
        onConfirmDelete={onConfirmDelete}
      />
      <ToolbarSortGenRefreshTheme {...sortGenProps} />
    </div>
  );

  const mobileSheet = (
    <div className="flex md:hidden items-center gap-2">
      {passwordBlock}
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(iconBtnClass(), 'min-h-11 min-w-11')}
            aria-label="Открыть меню"
          >
            <IconMenu />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(100%,320px)] border-[var(--rule)] bg-[var(--bg-elev)]">
          <SheetHeader>
            <SheetTitle className="font-mono text-xs tracking-[0.18em] uppercase text-[var(--obs-muted)]">
              Menu
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-6">
            <div className="flex flex-wrap gap-2">
              <ToolbarSortGenRefreshTheme {...sortGenProps} />
            </div>
            <div className="flex flex-wrap gap-2">
              <ToolbarMeta
                hiddenInCurrentFolder={hiddenInCurrentFolder}
                onShowAllHidden={onShowAllHidden}
                deletePendingCount={deletePendingCount}
                onRestoreDeleted={onRestoreDeleted}
                onConfirmDelete={onConfirmDelete}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <header
      className="sticky top-0 z-50 border-b border-[var(--rule)]"
      style={{
        background: 'var(--header-bg)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="mx-auto max-w-[1440px] px-6 pt-[14px] pb-0 max-sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="gallery-logo-box flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[var(--r-lg)] text-[var(--amber)]"
              aria-hidden
            >
              <IconAperture />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--fg)] truncate">
                Photo Gallery
              </h1>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--obs-muted)] truncate"
                title={mode === 'webdav' ? 'WebDAV' : 'Demo'}
              >
                {mode === 'webdav' ? 'obsidian · webdav' : 'obsidian · demo'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end w-full lg:w-auto">
            {desktopToolbar}
            {mobileSheet}
          </div>
        </div>

        {showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && onBreadcrumbNavigate && (
          <nav
            className="flex items-center gap-0.5 mt-2 mb-1 overflow-x-auto pb-1 scrollbar-none border-t border-transparent"
            aria-label="Путь к папке"
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.path + String(idx)} className="flex items-center gap-0.5 shrink-0">
                  {idx > 0 && <span className="text-[var(--obs-muted-dim)] text-xs">/</span>}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => !isLast && onBreadcrumbNavigate(crumb.path)}
                    className={cn(
                      'h-7 px-2 text-xs font-medium rounded-[var(--r-sm)] font-mono tracking-wide',
                      isLast
                        ? 'text-[var(--fg)] cursor-default opacity-90'
                        : 'text-[var(--obs-muted)] hover:text-[var(--amber)] hover:bg-[rgba(255,255,255,0.05)]',
                    )}
                  >
                    {crumb.label}
                  </button>
                </span>
              );
            })}
          </nav>
        )}

        {showLayoutChips && visiblePhotoCount > 0 && (
          <div className="flex gap-1.5 py-[14px] pb-3 overflow-x-auto scrollbar-none -mx-1 px-1">
            {LAYOUT_CHIPS.map(({ value, label, Icon, isNew }) => {
              const active = layout === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onLayoutChange(value)}
                  className={cn(
                    'flex items-center gap-1.5 shrink-0 rounded-[var(--r-md)] px-3 py-[7px] text-[12px] transition-all duration-[180ms] border',
                    active
                      ? 'gallery-chip-active relative font-semibold text-[var(--accent-on)]'
                      : 'font-medium text-[var(--obs-muted)] bg-[var(--surface-0)] border-[var(--surface-border)] hover:bg-[var(--accent-tint-soft)] hover:border-[var(--amber-border)] hover:text-[var(--amber)]',
                  )}
                >
                  <Icon className="shrink-0 opacity-90" />
                  <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                  {isNew && (
                    <span
                      className={cn(
                        'ml-0.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] leading-none',
                        active
                          ? 'text-[var(--accent-on)] bg-[rgba(0,0,0,0.12)] dark:bg-[rgba(26,15,5,0.25)]'
                          : 'text-[var(--amber)] bg-[var(--accent-badge-bg)]',
                      )}
                    >
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

export function GalleryCountRow({
  photoCount,
  layoutLabel,
  sortLine,
  sortArrow,
}: {
  photoCount: number;
  layoutLabel: string;
  sortLine: string;
  sortArrow: string;
}): ReactNode {
  return (
    <div className="gallery-grid-shell pt-2 pb-1">
      <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--obs-muted)]">
        <span className="shrink-0 whitespace-nowrap">
          {photoCount} photos · {layoutLabel} · {sortLine} {sortArrow}
        </span>
        <span className="h-px flex-1 bg-[var(--rule)] min-w-[2rem]" aria-hidden />
        <span className="shrink-0 whitespace-nowrap">obsidian · v1</span>
      </div>
    </div>
  );
}

export function GalleryFooter(): ReactNode {
  return (
    <footer className="mt-auto border-t border-[var(--rule)] px-6 py-10 pb-7 max-sm:px-4 bg-[var(--bg)]">
      <div className="mx-auto max-w-[1440px] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 items-center text-center md:text-left">
        <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--obs-muted)] order-2 md:order-1 md:text-left">
          © photo.gallery · 1pg
        </p>
        <p
          className="text-sm italic text-[var(--obs-muted)] order-1 md:order-2"
          style={{ fontFamily: 'var(--serif)' }}
        >
          every frame a held breath.
        </p>
        <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--obs-muted)] order-3 md:text-right">
          <button
            type="button"
            className="hover:text-[var(--amber)] transition-colors"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ↑ TOP
          </button>
        </p>
      </div>
    </footer>
  );
}

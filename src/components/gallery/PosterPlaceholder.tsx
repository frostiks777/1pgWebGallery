import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shown for videos the server refuses to build a poster for, because the file is
// larger than VIDEO_PREVIEW_MAX_MB (#180). Rendering an <img> here would fire a
// request that can only answer 413; after the retry budget that card would sit
// on the generic "failed to load" cross, which reads as a broken photo. The
// placeholder carries no text on purpose: the card is a named button and WCAG
// 2.5.3 requires its accessible name to contain everything visibly written on it.
export function PosterPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-black/45 text-white/70',
        className,
      )}
      aria-hidden
    >
      <Play className="h-6 w-6 fill-current" />
    </div>
  );
}

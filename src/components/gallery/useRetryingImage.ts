'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// The server answers `503` + `Retry-After: 5` while the single ffmpeg slot is
// busy (src/app/api/images/route.ts), and that was supposed to be "a cheap try
// again that the client retries" — it wasn't, so a card could sit on
// "Failed to load" until a full page reload (#98).
//
// Delays: 5s is the server's own Retry-After (an `<img>` never exposes response
// status or headers, so it has to be mirrored here); the second one doubles it.
// Two retries cap one broken image at three requests — a page holds hundreds of
// thumbnails, and unbounded retries would turn a busy ffmpeg slot into a storm.
const RETRY_DELAYS_MS = [5_000, 10_000];

interface RetryingImageState {
  url: string;
  /** Bumped on every retry; part of the URL so React actually re-requests it. */
  token: number;
  /** Retries already spent for the current token. */
  failures: number;
  isLoading: boolean;
  hasError: boolean;
}

function freshState(url: string): RetryingImageState {
  return { url, token: 0, failures: 0, isLoading: true, hasError: false };
}

/**
 * Loads an image URL with automatic retries on failure and a manual `retry()`.
 *
 * A retry rewrites the URL (`&retry=N`) instead of reusing it: setting the same
 * `src` back onto an `<img>` does not re-request it, which is exactly why the
 * old "Retry" button in the lightbox did nothing.
 */
export function useRetryingImage(url: string) {
  const [state, setState] = useState<RetryingImageState>(() => freshState(url));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A new photo is a new lifecycle — carrying the previous one's error/attempts
  // over would show "Failed to load" on an image that was never loaded. Adjusted
  // during render (React's documented "state follows a prop" pattern) rather
  // than in an effect: `react-hooks/set-state-in-effect` is an error here, and
  // an effect would paint one frame with the old state.
  if (state.url !== url) {
    setState(freshState(url));
  }

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Drop a pending retry when the URL changes or the component goes away,
  // otherwise it would bump the token of whatever image is shown by then.
  useEffect(() => clearTimer, [url, clearTimer]);

  const src = useMemo(() => {
    if (state.token === 0) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}retry=${state.token}`;
  }, [url, state.token]);

  const onLoad = useCallback(() => {
    clearTimer();
    // A retry that finally succeeded restores the full budget, so the next
    // transient failure on this card is retried again.
    setState((s) => ({ ...s, isLoading: false, hasError: false, failures: 0 }));
  }, [clearTimer]);

  const onError = useCallback(() => {
    clearTimer();
    if (state.failures >= RETRY_DELAYS_MS.length) {
      setState((s) => ({ ...s, isLoading: false, hasError: true }));
      return;
    }
    const delay = RETRY_DELAYS_MS[state.failures];
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setState((s) =>
        s.url === url
          ? { ...s, token: s.token + 1, failures: s.failures + 1, isLoading: true }
          : s,
      );
    }, delay);
  }, [clearTimer, state.failures, url]);

  const retry = useCallback(() => {
    clearTimer();
    // Manual retry always fires immediately and restores the budget — the user
    // asked for it, so it shouldn't be limited by spent automatic attempts.
    setState((s) => ({
      ...s,
      token: s.token + 1,
      failures: 0,
      isLoading: true,
      hasError: false,
    }));
  }, [clearTimer]);

  return { src, isLoading: state.isLoading, hasError: state.hasError, onLoad, onError, retry };
}

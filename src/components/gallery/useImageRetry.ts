import { useState, useCallback } from 'react';

interface UseImageRetryOptions {
  imageUrl: string;
  maxRetries?: number;
  backoffMs?: number;
}

export function useImageRetry({
  imageUrl,
  maxRetries = 2,
  backoffMs = 5000,
}: UseImageRetryOptions) {
  const [retryCount, setRetryCount] = useState(0);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const src = retryCount > 0 ? `${imageUrl}&retry=${retryCount}` : imageUrl;

  const onError = useCallback(() => {
    if (retryCount < maxRetries) {
      const nextCount = retryCount + 1;
      const backoff = backoffMs * nextCount;
      const timerId = setTimeout(() => {
        setRetryCount(nextCount);
      }, backoff);
    } else {
      setIsError(true);
      setIsLoading(false);
    }
  }, [retryCount, maxRetries, backoffMs]);

  const retry = useCallback(() => {
    setRetryCount(1);
    setIsError(false);
    setIsLoading(true);
  }, []);

  return { src, onError, retry, isError, isLoading };
}
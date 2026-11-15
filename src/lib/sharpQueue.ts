// Bounded concurrency for sharp pipelines.
//
// `sharp.concurrency(1)` limits threads inside ONE pipeline, not the number of
// pipelines: 25 parallel requests still decode 25 originals at once on the
// one-core, 823 MB prod box — OOM or minute-long timeouts instead of a cheap
// `503` the client already retries (useRetryingImage, #98).
//
// 2 active pipelines keep the single core busy without two 12 MP decodes
// competing for cache. 20 waiting places cover a cold grid; the 21st waiter is
// rejected immediately, before it fetches an original, so the queue bounds
// memory as well as CPU.
//
// This must stay a single module-level queue: a copy per route would give
// 2 routes × 2 pipelines and 2 × 20 places, i.e. exactly the unbounded
// behaviour this file exists to remove.

const MAX_ACTIVE = 2;
const MAX_WAITING = 20;

export class SharpQueueFullError extends Error {
  constructor() {
    super('sharp queue is full');
    this.name = 'SharpQueueFullError';
  }
}

let active = 0;
const waiters: Array<() => void> = [];

/**
 * Runs `job` when a pipeline slot is free. Throws {@link SharpQueueFullError}
 * synchronously (before the job starts) when both slots and all waiting places
 * are taken, so the caller can answer `503 + Retry-After` instead of pinning
 * another original in memory.
 */
export async function withSharpSlot<T>(job: () => Promise<T>): Promise<T> {
  if (active < MAX_ACTIVE) {
    active += 1;
  } else if (waiters.length < MAX_WAITING) {
    // The releasing job hands its slot over, so `active` stays unchanged.
    await new Promise<void>((resolve) => waiters.push(resolve));
  } else {
    throw new SharpQueueFullError();
  }

  try {
    return await job();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else active -= 1;
  }
}

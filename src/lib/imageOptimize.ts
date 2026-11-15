// ─────────────────────────────────────────────────────────────────────────────
// Sharp initialisation — the CRITICAL piece for image optimisation.
//
// In standalone mode, Next.js cannot bundle native C++ addons.
// `serverExternalPackages: ['sharp']` in next.config.ts tells Next.js
// to keep sharp as an external require rather than trying to bundle it.
// If it still fails, we log loudly so the admin sees it immediately.
//
// This module is the ONLY place that initialises sharp. Both /api/images and
// /api/images/generate import it: `concurrency(1)` and `cache({ memory: 0 })`
// are process-global libvips settings, and the batch route used to load its own
// copy without them — so a batch that ran before the first gallery request got
// the default thread pool and the 50 MB decoded-image cache on the 823 MB box.
// ─────────────────────────────────────────────────────────────────────────────

let sharpLib: typeof import('sharp') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharpLib = require('sharp');
  sharpLib!.concurrency(1);
  // libvips keeps a 50 MB decoded-image cache by default (sharp/lib/utility.js:
  // "Default cache settings of 50MB, 20 files, 100 items"). On the ~800 MB prod
  // box that ceiling is pure overhead: every generated thumbnail is already
  // cached on disk (local .data/ or colocated .thumbs-v2/ on WebDAV), so a cache
  // hit only ever saves re-decoding the original inside the SAME request that
  // was going to encode it anyway.
  sharpLib!.cache({ memory: 0 });
  console.info('[Images] sharp loaded OK — image optimisation is ACTIVE');
} catch (err) {
  console.error('[Images] *** SHARP FAILED TO LOAD — images will NOT be optimised! ***');
  console.error('[Images] Error:', err instanceof Error ? err.message : String(err));
  console.error('[Images] Make sure "sharp" is installed: bun add sharp');
}

export function isSharpAvailable(): boolean {
  return sharpLib !== null;
}

/** `.webp` when sharp is usable, the original extension otherwise. */
export function thumbExt(): string {
  return sharpLib ? '.webp' : '.jpg';
}

/**
 * Image size presets — tuned for real-world photos (3000–6000 px originals).
 *
 * Best-practice quality values for WebP:
 *   thumbnail  — viewed at ≤400 px in a grid; quality 50-60 is indistinguishable
 *   medium     — lightbox view; quality 72 is a sweet-spot
 *   full       — download / zoom; quality 82 preserves fine detail
 *
 * `effort` controls the encoder compression level (0-6). Higher = slower
 * but smaller files.  We use max effort for tiny thumbnails and less for
 * large images where encoding time matters.
 *
 * Keep this in sync with IMAGE_CACHE_KEY_VERSION and the co-located folder
 * version in cacheVersions.ts — see the comment there.
 */
export const IMAGE_PRESETS = {
  thumbnail: { width: 450,  height: 450,  quality: 60, effort: 4 },
  medium:    { width: 1400, height: 1400, quality: 72, effort: 4 },
  full:      { width: 2400, height: 2400, quality: 82, effort: 2 },
} as const;

export type ImageSize = keyof typeof IMAGE_PRESETS;

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Core optimisation pipeline:
 *   1. Resize to target dimensions (fit: inside, no enlargement)
 *   2. Auto-rotate based on EXIF orientation
 *   3. Strip ALL metadata (EXIF, ICC, XMP) — saves 50-200 KB per photo
 *   4. Encode to WebP with per-size quality & effort settings
 *   5. If result is somehow bigger than input (edge case), return original
 *
 * `log: false` is for the batch job: it walks 14k+ photos and a success line
 * per image would drown journald, while the on-demand path benefits from the
 * ratio in its log.
 *
 * Errors are swallowed and the original is returned: a single unencodable file
 * must not turn a gallery request into a 500. Callers that need to distinguish
 * queue pressure must wrap this in withSharpSlot — that error is thrown before
 * this function runs.
 */
export async function optimizeImage(
  buf: Buffer,
  size: ImageSize,
  opts: { log?: boolean } = {},
): Promise<Buffer> {
  const { log = true } = opts;

  if (!sharpLib) {
    if (log) console.warn(`[Images] sharp not loaded — returning original (${fmtBytes(buf.byteLength)})`);
    return buf;
  }

  const preset = IMAGE_PRESETS[size];

  try {
    const pipeline = sharpLib(buf)
      .rotate()                        // auto-rotate from EXIF
      .resize(preset.width, preset.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .removeAlpha()                   // drop alpha for photos — saves bytes
      .webp({
        quality: preset.quality,
        effort: preset.effort,
        smartSubsample: true,          // chroma subsampling for smaller files
        nearLossless: false,
      })
      .withMetadata({})                // strip all EXIF/ICC/XMP

    const out = await pipeline.toBuffer();

    if (log) {
      const ratio   = out.byteLength / buf.byteLength;
      const pctSave = ((1 - ratio) * 100).toFixed(1);
      console.info(
        `[Images] ${size}: ${fmtBytes(buf.byteLength)} → ${fmtBytes(out.byteLength)} (−${pctSave}%, ratio ${ratio.toFixed(3)})`
      );
    }

    // Safety: if optimised version is somehow bigger, return original
    if (out.byteLength >= buf.byteLength) {
      if (log) console.warn(`[Images] ${size}: optimised is >= original — returning original`);
      return buf;
    }

    return out;
  } catch (err) {
    console.error('[Images] sharp pipeline failed:', err);
    return buf;
  }
}

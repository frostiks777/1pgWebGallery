// The image pipeline has three independent cache layers. They must move
// together when a preset changes: bumping only one leaves stale bytes served
// under a fresh key - D2/D3 in plan A0 were exactly that class of bug, fixed
// by hand across six call sites. Keep the three constants below in one place.
//
// 1. URL version (`v=4-<mtime>`) - what the browser and nginx cache on.
// 2. Local cache key suffix (`-v3`) - the md5 name of files in .data/.
// 3. Co-located folder on WebDAV (`.thumbs-v2`).

export const IMAGE_PRESET_VERSION = 4;
export const IMAGE_CACHE_KEY_VERSION = 'v3';
export const DEFAULT_COLOCATED_THUMBS_DIR = '.thumbs-v2';

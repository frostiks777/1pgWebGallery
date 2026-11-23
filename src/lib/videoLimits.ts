// One budget for the video poster flow. It used to be a private constant inside
// /api/images; the listing also needs it, and a copy in two places would drift
// into a storm of refused poster requests (#180, #184).
export const MAX_VIDEO_BYTES = Number(process.env.VIDEO_PREVIEW_MAX_MB || 300) * 1024 * 1024;

// Frozen against the duplicated lists that used to live in `webdav.ts` and
// `images/generate/route.ts`: the folder-preview copy forgot `.svg`, so an SVG
// appeared inside a folder but never as its cover (#155). One list, one check.
//
// `imageExtOf`, not `path.extname`, because the input is a WebDAV basename:
// `lastIndexOf` + slice keeps the same semantics as `videoExtOf` in videoExt.ts.
export const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif',
];

export function imageExtOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

export function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(imageExtOf(filename));
}

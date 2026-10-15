// Benchmark for #4 (sharp cache memory) and #5 (effort/quality).
// Mirrors optimizeImage() in src/app/api/images/route.ts exactly.
//
//   node bench-sharp.mjs bytes <variant>   -- size + time per preset on demo photos
//   node bench-sharp.mjs rss   <variant>   -- peak RSS on a synthetic 6000x4000 original
//
// variant = "base" | "new"

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PRESETS = {
  base: {
    thumbnail: { width: 800,  height: 800,  quality: 80, effort: 6 },
    medium:    { width: 1400, height: 1400, quality: 72, effort: 4 },
    full:      { width: 2400, height: 2400, quality: 82, effort: 2 },
  },
  new: {
    thumbnail: { width: 800,  height: 800,  quality: 76, effort: 3 },
    medium:    { width: 1400, height: 1400, quality: 70, effort: 3 },
    full:      { width: 2400, height: 2400, quality: 82, effort: 2 },
  },
  // Same presets as base, but libvips' decoded-image cache disabled (#4).
  nocache: {
    thumbnail: { width: 800,  height: 800,  quality: 80, effort: 6 },
    medium:    { width: 1400, height: 1400, quality: 72, effort: 4 },
    full:      { width: 2400, height: 2400, quality: 82, effort: 2 },
  },
  // #5 conservative: drop only the encoder effort, keep quality untouched.
  effortonly: {
    thumbnail: { width: 800,  height: 800,  quality: 80, effort: 3 },
    medium:    { width: 1400, height: 1400, quality: 72, effort: 4 },
    full:      { width: 2400, height: 2400, quality: 82, effort: 2 },
  },
};

const [mode, variant] = process.argv.slice(2);
const presets = PRESETS[variant];
if (!presets) { console.error('unknown variant'); process.exit(1); }

if (variant === 'nocache') sharp.cache({ memory: 0 });

function encode(buf, size) {
  const p = presets[size];
  return sharp(buf)
    .rotate()
    .resize(p.width, p.height, { fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .webp({ quality: p.quality, effort: p.effort, smartSubsample: true, nearLossless: false })
    .withMetadata({})
    .toBuffer();
}

if (mode === 'bytes') {
  const dir = 'public/demo-photos';
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
  const totals = {};
  for (const size of Object.keys(presets)) {
    let bytes = 0, ms = 0;
    for (const f of files) {
      const buf = fs.readFileSync(path.join(dir, f));
      const t = process.hrtime.bigint();
      const out = await encode(buf, size);
      ms += Number(process.hrtime.bigint() - t) / 1e6;
      bytes += out.byteLength;
    }
    totals[size] = { bytes, ms: Math.round(ms) };
  }
  console.log(JSON.stringify({ variant, totals }));
}

if (mode === 'rss') {
  // Emulate the documented real-world original: 3000-6000 px *of actual
  // detail*. A flat synthetic image compresses to nothing and decodes trivially,
  // which leaves libvips' cache unused and hides the very effect we measure.
  const W = 6000, H = 4000;
  const noise = Buffer.allocUnsafe(W * H * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() * 256) | 0;
  const big = await sharp(noise, { raw: { width: W, height: H, channels: 3 } })
    .blur(1.2)                       // photographic rather than TV static
    .jpeg({ quality: 92 })
    .toBuffer();

  let peak = 0;
  const track = () => { peak = Math.max(peak, process.memoryUsage().rss); };
  const t = setInterval(track, 10);

  // Same source decoded repeatedly: this is exactly the pattern that populates
  // libvips' decoded-image cache in production.
  for (let i = 0; i < 6; i++) {
    for (const size of Object.keys(presets)) await encode(big, size);
  }
  clearInterval(t);
  track();
  console.log(JSON.stringify({
    variant,
    sourceKB: Math.round(big.byteLength / 1024),
    peakRssMB: Math.round(peak / 1048576),
  }));
}

if (mode === 'time') {
  const W = 3000, H = 2000;
  const noise = Buffer.allocUnsafe(W * H * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() * 256) | 0;
  const big = await sharp(noise, { raw: { width: W, height: H, channels: 3 } })
    .blur(1.2).jpeg({ quality: 92 }).toBuffer();

  // Cold: each photo seen once — the real gallery case, nothing repeats.
  let cold = 0;
  for (let i = 0; i < 6; i++) {
    const t = process.hrtime.bigint();
    await encode(big, 'thumbnail');
    cold += Number(process.hrtime.bigint() - t) / 1e6;
  }
  // Warm: the same photo requested repeatedly — what the cache is for.
  const warmT = process.hrtime.bigint();
  for (let i = 0; i < 6; i++) await encode(big, 'thumbnail');
  const warm = Number(process.hrtime.bigint() - warmT) / 1e6;

  console.log(JSON.stringify({
    variant,
    sourceKB: Math.round(big.byteLength / 1024),
    coldMs: Math.round(cold),
    warmMs: Math.round(warm),
  }));
}
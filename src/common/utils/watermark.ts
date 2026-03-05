import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolve the watermark logo path.
 * In dev mode (ts-node/nest --watch): src/assets/twa-watermark.png
 * In production (compiled): dist/assets/twa-watermark.png
 */
function resolveLogoPath(): string {
  // Try relative to __dirname first (works in both dev and prod)
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', 'twa-watermark.png'), // dev: src/common/utils -> src/assets
    path.join(__dirname, '..', '..', '..', 'assets', 'twa-watermark.png'), // prod: dist/src/common/utils -> dist/assets
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Watermark logo not found. Tried: ${candidates.join(', ')}`);
}

/**
 * Apply a TWA logo watermark to an image buffer.
 * The logo is placed at the bottom-right corner at ~10% of the image width
 * with 70% opacity.
 *
 * Skips watermarking for non-raster images (SVG) or very small images (<200px wide).
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  mimeType?: string,
): Promise<Buffer> {
  // Skip SVG files — sharp can read them but we don't want to rasterize
  if (mimeType && mimeType.includes('svg')) {
    return imageBuffer;
  }

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  // Skip if image is too small or metadata is missing
  if (!metadata.width || !metadata.height || metadata.width < 200) {
    return imageBuffer;
  }

  // Resize logo to ~10% of the image width
  const logoWidth = Math.round(metadata.width * 0.1);
  const logoPath = resolveLogoPath();
  const resizedLogo = await sharp(logoPath)
    .resize(logoWidth)
    .ensureAlpha()
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoHeight = logoMeta.height || logoWidth;

  // Apply 70% opacity via dest-in blend with matching dimensions
  const logo = await sharp(resizedLogo)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${logoWidth}" height="${logoHeight}"><rect x="0" y="0" width="${logoWidth}" height="${logoHeight}" fill="white" opacity="0.7"/></svg>`,
        ),
        blend: 'dest-in',
      },
    ])
    .toBuffer();

  // Position: bottom-right with padding
  const padding = Math.round(metadata.width * 0.02);
  const left = metadata.width - logoWidth - padding;
  const top = metadata.height - logoHeight - padding;

  const result = await image
    .composite([
      {
        input: logo,
        left: Math.max(0, left),
        top: Math.max(0, top),
      },
    ])
    .toBuffer();

  return result;
}

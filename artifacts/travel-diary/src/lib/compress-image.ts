/**
 * Shared image compression utility.
 *
 * Strategy (learned from WeChat / Xiaohongshu / Instagram):
 *  1. Output WebP when the browser supports it — saves 25-35 % vs JPEG.
 *  2. Max long-edge 1200 px — sufficient for any mobile display (430 px × 3x DPR).
 *  3. Network-adaptive quality — drop quality on slow connections.
 *  4. Small files skip compression entirely (<= SKIP_BYTES).
 *  5. Canvas approach is faster and more memory-efficient than JS-only libraries.
 */

const MAX_EDGE   = 1200;
const SKIP_BYTES = 250 * 1024; // 250 KB — files already small enough

// Detect WebP encode support once and cache the result.
let _webpSupported: boolean | null = null;
function supportsWebP(): boolean {
  if (_webpSupported !== null) return _webpSupported;
  try {
    const c = document.createElement("canvas");
    c.width = 1; c.height = 1;
    _webpSupported = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    _webpSupported = false;
  }
  return _webpSupported;
}

/** Pick output quality based on connection speed (Network Information API). */
function adaptiveQuality(baseQuality: number): number {
  try {
    const conn = (navigator as any).connection;
    if (!conn) return baseQuality;
    const ect: string = conn.effectiveType ?? "";
    if (ect === "slow-2g" || ect === "2g") return Math.max(0.55, baseQuality - 0.20);
    if (ect === "3g")                       return Math.max(0.65, baseQuality - 0.10);
  } catch { /* ignore */ }
  return baseQuality;
}

/**
 * Compress an image file via OffscreenCanvas / HTMLCanvasElement.
 *
 * - Outputs WebP when supported, otherwise JPEG.
 * - Skips recompression if the output would be larger than the input.
 * - Returns the original file unchanged if the file is already small.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip tiny files — they're already small enough.
  if (file.size <= SKIP_BYTES) return file;

  if (typeof createImageBitmap !== "function") {
    throw new Error("createImageBitmap not supported");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width  * scale));
    const h = Math.max(1, Math.round(height * scale));

    const useWP = supportsWebP();
    const mime  = useWP ? "image/webp" : "image/jpeg";
    const quality = adaptiveQuality(useWP ? 0.82 : 0.85);

    // Prefer OffscreenCanvas (no main-thread layout) when available.
    const useOffscreen = typeof OffscreenCanvas !== "undefined";
    const canvas = useOffscreen
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
    if (!useOffscreen) {
      (canvas as HTMLCanvasElement).width  = w;
      (canvas as HTMLCanvasElement).height = h;
    }

    const ctx = (canvas as any).getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob: Blob = useOffscreen
      ? await (canvas as OffscreenCanvas).convertToBlob({ type: mime, quality })
      : await new Promise<Blob>((resolve, reject) =>
          (canvas as HTMLCanvasElement).toBlob(
            b => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            mime,
            quality,
          ),
        );

    // If compressed output is larger, keep the original (e.g. already-optimised PNGs).
    if (blob.size >= file.size) return file;

    const ext      = useWP ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.${ext}`, { type: mime });
  } finally {
    bitmap.close?.();
  }
}

/**
 * Convenience wrapper: try Canvas first, fall back to `browser-image-compression`
 * for environments where Canvas / createImageBitmap is unavailable.
 */
export async function compressImageWithFallback(
  file: File,
  fallbackOptions?: Record<string, unknown>,
): Promise<File> {
  try {
    return await compressImage(file);
  } catch {
    const { default: imageCompression } = await import("browser-image-compression");
    return imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: MAX_EDGE,
      useWebWorker: true,
      initialQuality: 0.80,
      maxIteration: 4,
      preserveExif: false,
      ...fallbackOptions,
    });
  }
}

/**
 * Convert a HEIC/HEIF file to JPEG in the browser.
 * Falls back to returning the original file if conversion fails or
 * the file is not HEIC/HEIF.
 *
 * heic2any is loaded lazily so it doesn't bloat the initial bundle.
 */
export function isHeic(file: File): boolean {
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif";
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  const heic2any = (await import("heic2any")).default;
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([resultBlob], `${baseName}.jpg`, { type: "image/jpeg" });
}

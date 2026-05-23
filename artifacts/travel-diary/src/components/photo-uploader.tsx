import React, { useRef, useState, useCallback } from "react";
import { useAddEntryPhoto, getGetEntryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Images, Loader2, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";

// ── Compression config ──────────────────────────────────────────────────────
// Two-tier strategy:
//   • < SKIP_BYTES        → direct upload, no resize
//   • >= SKIP_BYTES       → native canvas resize (createImageBitmap + toBlob),
//                           3-5× faster than browser-image-compression's
//                           binary-search; fall back to the library on error.
const SKIP_BYTES = 600 * 1024;        // 600 KB — direct upload threshold
const MAX_EDGE = 1600;                 // long-edge cap after resize
const JPEG_QUALITY = 0.8;

const FALLBACK_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: MAX_EDGE,
  useWebWorker: true,
  initialQuality: 0.75,
  maxIteration: 4,
  preserveExif: false,
};

// ── Concurrency limiters (P0) ───────────────────────────────────────────────
// Split into two pools so compression and uploads pipeline instead of blocking
// each other:
//   • compress: CPU-bound, 2 parallel is enough to saturate a mid-range phone
//   • upload:   network-bound, browsers cap same-origin HTTP at 6 anyway
const COMPRESS_CONCURRENCY = 2;
const UPLOAD_CONCURRENCY = 6;

function createSemaphore(max: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  return function acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        running++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            running--;
            if (queue.length) queue.shift()!();
          });
      };
      if (running < max) run();
      else queue.push(run);
    });
  };
}

// ── Native canvas compression (P1) ──────────────────────────────────────────
// Single-pass resize + JPEG encode. ~3-5× faster than binary-search libraries
// for typical phone photos (3-5 MB). Falls back to browser-image-compression
// if the browser lacks createImageBitmap / OffscreenCanvas or encoding fails.
async function compressViaCanvas(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("createImageBitmap unsupported");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const useOffscreen = typeof OffscreenCanvas !== "undefined";
    const canvas: HTMLCanvasElement | OffscreenCanvas = useOffscreen
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
    if (!useOffscreen) {
      (canvas as HTMLCanvasElement).width = w;
      (canvas as HTMLCanvasElement).height = h;
    }
    const ctx = (canvas as any).getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob: Blob = useOffscreen
      ? await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY })
      : await new Promise<Blob>((resolve, reject) => {
          (canvas as HTMLCanvasElement).toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/jpeg",
            JPEG_QUALITY,
          );
        });

    // If the "compressed" output is actually larger (rare, but possible for
    // already-tiny PNG icons), keep the original.
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close?.();
  }
}

async function compressImage(file: File): Promise<File> {
  try {
    return await compressViaCanvas(file);
  } catch {
    return await imageCompression(file, FALLBACK_OPTIONS);
  }
}

// ── Types ───────────────────────────────────────────────────────────────────
interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "compressing" | "uploading" | "saving" | "done" | "error";
  progress: number;
  errorMsg?: string;
}

interface PhotoUploaderProps {
  entryId: number;
  className?: string;
}

export function PhotoUploader({ entryId, className }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queryClient = useQueryClient();
  const addPhoto = useAddEntryPhoto();

  // Two pools per uploader instance — compress and upload pipeline independently
  const compressSem = useRef(createSemaphore(COMPRESS_CONCURRENCY)).current;
  const uploadSem = useRef(createSemaphore(UPLOAD_CONCURRENCY)).current;

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const processFile = useCallback(
    async (item: QueueItem) => {
      try {
        // ── Step 1: compress (skip if already small) ──────────────────
        // Compression pool is separate from upload pool, so a finished
        // compression frees its slot immediately for the next photo
        // while this one moves into the upload pool.
        updateItem(item.id, { status: "compressing", progress: 15 });

        const toUpload: File = await compressSem(async () => {
          if (item.file.size <= SKIP_BYTES) return item.file;
          return await compressImage(item.file);
        });
        updateItem(item.id, { progress: 35 });

        // ── Step 2-4: upload pipeline (presign → PUT → save) ──────────
        await uploadSem(async () => {
          updateItem(item.id, { status: "uploading", progress: 40 });
          const metaRes = await fetch("/api/storage/uploads/request-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: toUpload.name,
              size: toUpload.size,
              contentType: toUpload.type || "image/jpeg",
            }),
          });
          if (!metaRes.ok) throw new Error("获取上传地址失败");
          const { uploadURL, objectPath } = await metaRes.json();

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadURL);
            xhr.setRequestHeader("Content-Type", toUpload.type || "image/jpeg");
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = 40 + Math.round((e.loaded / e.total) * 50);
                updateItem(item.id, { progress: pct });
              }
            };
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("上传到存储失败")));
            xhr.onerror = () => reject(new Error("网络错误"));
            xhr.send(toUpload);
          });

          updateItem(item.id, { status: "saving", progress: 92 });
          const url = `/api/storage${objectPath}`;
          await new Promise<void>((resolve, reject) => {
            addPhoto.mutate(
              { id: entryId, data: { url } },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(entryId) });
                  resolve();
                },
                onError: (err) => reject(err),
              },
            );
          });
        });

        updateItem(item.id, { status: "done", progress: 100 });
        setTimeout(() => {
          setQueue((prev) => prev.filter((i) => i.id !== item.id));
          URL.revokeObjectURL(item.previewUrl);
        }, 1200);
      } catch (err) {
        updateItem(item.id, { status: "error", errorMsg: (err as Error).message });
        setTimeout(() => {
          setQueue((prev) => prev.filter((i) => i.id !== item.id));
          URL.revokeObjectURL(item.previewUrl);
        }, 3000);
      }
    },
    [entryId, addPhoto, queryClient, updateItem, compressSem, uploadSem],
  );

  const MAX_PHOTOS = 30;

  const handleFiles = (files: FileList) => {
    const sliced = Array.from(files).slice(0, MAX_PHOTOS);
    if (files.length > MAX_PHOTOS) {
      alert(`一次最多可选 ${MAX_PHOTOS} 张，已自动取前 ${MAX_PHOTOS} 张。`);
    }
    const newItems: QueueItem[] = sliced.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "compressing" as const,
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => processFile(item));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = "";
  };

  const anyBusy = queue.some((i) => i.status !== "done" && i.status !== "error");

  const statusLabel = (item: QueueItem) => {
    switch (item.status) {
      case "compressing": return item.file.size <= SKIP_BYTES ? "准备中..." : "压缩中...";
      case "uploading":   return `上传中 ${item.progress}%`;
      case "saving":      return "保存中...";
      case "done":        return "完成";
      case "error":       return item.errorMsg ?? "失败";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInputChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />

      {/* Upload queue grid */}
      {queue.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {queue.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 shadow-sm">
              <img src={item.previewUrl} alt="" className="w-full h-full object-cover opacity-70" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-1.5 p-2">
                {item.status === "done" ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : item.status === "error" ? (
                  <X className="w-6 h-6 text-red-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                )}
                <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-200",
                      item.status === "done" ? "bg-green-400" : item.status === "error" ? "bg-red-400" : "bg-white"
                    )}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="text-white text-[10px] text-center leading-tight truncate w-full px-1">
                  {statusLabel(item)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={anyBusy}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Images className="w-4 h-4" />
          选择多张照片
        </button>
        <button
          type="button"
          disabled={anyBusy}
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-4 h-4" />
          拍照上传
        </button>
        {anyBusy && (
          <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            上传中，请稍候
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">支持同时选择多张 · 大图自动压缩，小图直接上传</p>
    </div>
  );
}

import React, { useRef, useState, useCallback, useEffect } from "react";
import { getGetEntryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Images, Loader2, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";
import { convertHeicToJpeg, isHeic } from "@/lib/heic-convert";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Compression config ──────────────────────────────────────────────────────
const SKIP_BYTES = 600 * 1024;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

const FALLBACK_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: MAX_EDGE,
  useWebWorker: true,
  initialQuality: 0.75,
  maxIteration: 4,
  preserveExif: false,
};

// ── Concurrency limiters ────────────────────────────────────────────────────
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

// ── Native canvas compression ────────────────────────────────────────────────
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
  order: number;
  file: File;
  previewUrl: string;
  status: "compressing" | "uploading" | "saving" | "done" | "error";
  progress: number;
  errorMsg?: string;
}

// Resolved when the batch presign round-trip returns for this item
type PresignResult =
  | { uploadURL: string; objectPath: string }
  | { error: Error };

const SAVE_DEBOUNCE_MS = 250;

interface PhotoUploaderProps {
  entryId: number;
  className?: string;
}

export function PhotoUploader({ entryId, className }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queryClient = useQueryClient();

  const compressSem = useRef(createSemaphore(COMPRESS_CONCURRENCY)).current;
  const uploadSem = useRef(createSemaphore(UPLOAD_CONCURRENCY)).current;

  const pendingSaveRef = useRef<{ itemId: string; url: string; order: number }[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderCounterRef = useRef(0);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeItemSoon = useCallback((id: string, ms: number) => {
    setTimeout(() => {
      setQueue((prev) => {
        const found = prev.find((i) => i.id === id);
        if (found) {
          URL.revokeObjectURL(found.previewUrl);
          blobUrlsRef.current.delete(found.previewUrl);
        }
        return prev.filter((i) => i.id !== id);
      });
    }, ms);
  }, []);

  const flushSaves = useCallback(async () => {
    const pending = pendingSaveRef.current;
    if (!pending.length) return;
    pendingSaveRef.current = [];
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pending.sort((a, b) => a.order - b.order);
    const ids = pending.map((p) => p.itemId);
    try {
      const resp = await fetch(`${BASE}/api/entries/${entryId}/photos/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ urls: pending.map((p) => p.url) }),
      });
      if (!resp.ok) throw new Error("批量保存失败");
      queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(entryId) });
      ids.forEach((id) => {
        updateItem(id, { status: "done", progress: 100 });
        removeItemSoon(id, 1200);
      });
    } catch (err) {
      ids.forEach((id) =>
        updateItem(id, { status: "error", errorMsg: (err as Error).message }),
      );
      ids.forEach((id) => removeItemSoon(id, 3000));
    }
  }, [entryId, queryClient, updateItem, removeItemSoon]);

  const scheduleFlush = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSaves, SAVE_DEBOUNCE_MS);
  }, [flushSaves]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const pending = pendingSaveRef.current;
      if (pending.length) {
        pendingSaveRef.current = [];
        pending.sort((a, b) => a.order - b.order);
        try {
          fetch(`${BASE}/api/entries/${entryId}/photos/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            keepalive: true,
            body: JSON.stringify({ urls: pending.map((p) => p.url) }),
          }).catch(() => {});
        } catch {
          /* best-effort only */
        }
      }
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current.clear();
    };
  }, [entryId]);

  // ── Core item processor ─────────────────────────────────────────────────
  // Accepts a presignPromise that resolves as soon as the batch API returns.
  // Compression starts immediately — not blocked by the network round-trip.
  const processItem = useCallback(
    async (item: QueueItem, presignPromise: Promise<PresignResult>) => {
      try {
        // Step 1: HEIC → JPEG (starts right away, no waiting for presign)
        updateItem(item.id, { status: "compressing", progress: 8 });
        let sourceFile = item.file;
        if (isHeic(sourceFile)) {
          sourceFile = await convertHeicToJpeg(sourceFile);
          const jpegPreview = URL.createObjectURL(sourceFile);
          blobUrlsRef.current.add(jpegPreview);
          updateItem(item.id, { previewUrl: jpegPreview, progress: 20 });
        }

        // Step 2: Compress (semaphore-limited; runs parallel to presign fetch)
        updateItem(item.id, { progress: 15 });
        const toUpload = await compressSem(async () => {
          if (sourceFile.size <= SKIP_BYTES) return sourceFile;
          return compressImage(sourceFile);
        });
        updateItem(item.id, { progress: 38 });

        // Step 3: Wait for presigned URL — usually already resolved by now
        const presign = await presignPromise;
        if ("error" in presign) throw presign.error;
        const { uploadURL, objectPath } = presign;

        // Step 4: Upload with per-byte progress
        await uploadSem(async () => {
          updateItem(item.id, { status: "uploading", progress: 40 });
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadURL);
            xhr.setRequestHeader("Content-Type", toUpload.type || "image/jpeg");
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = 40 + Math.round((e.loaded / e.total) * 55);
                updateItem(item.id, { progress: pct });
              }
            };
            xhr.onload = () =>
              xhr.status >= 200 && xhr.status < 300
                ? resolve()
                : reject(new Error("上传到存储失败"));
            xhr.onerror = () => reject(new Error("网络错误"));
            xhr.send(toUpload);
          });
        });

        // Step 5: Debounced batch DB save
        updateItem(item.id, { status: "saving", progress: 97 });
        pendingSaveRef.current.push({
          itemId: item.id,
          url: `/api/storage${objectPath}`,
          order: item.order,
        });
        scheduleFlush();
      } catch (err) {
        updateItem(item.id, { status: "error", errorMsg: (err as Error).message });
        removeItemSoon(item.id, 3000);
      }
    },
    [compressSem, uploadSem, updateItem, scheduleFlush, removeItemSoon],
  );

  const MAX_PHOTOS = 30;

  const handleFiles = async (files: FileList) => {
    const sliced = Array.from(files).slice(0, MAX_PHOTOS);
    if (files.length > MAX_PHOTOS) {
      alert(`一次最多可选 ${MAX_PHOTOS} 张，已自动取前 ${MAX_PHOTOS} 张。`);
    }

    // 1. Show previews immediately with a small non-zero progress so users
    //    see something happening right away.
    const newItems: QueueItem[] = sliced.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      blobUrlsRef.current.add(previewUrl);
      return {
        id: `${Date.now()}-${Math.random()}`,
        order: orderCounterRef.current++,
        file,
        previewUrl,
        status: "compressing" as const,
        progress: 3, // non-zero → bar appears immediately
      };
    });
    setQueue((prev) => [...prev, ...newItems]);

    // 2. Create one Promise<PresignResult> per item — resolved once the
    //    batch API call returns. processItem awaits this after compression.
    const resolvers = new Map<string, (r: PresignResult) => void>();
    const presignPromises = new Map(
      newItems.map((it) => {
        let resolve!: (r: PresignResult) => void;
        const p = new Promise<PresignResult>((res) => { resolve = res; });
        resolvers.set(it.id, resolve);
        return [it.id, p] as [string, Promise<PresignResult>];
      }),
    );

    // 3. Kick off compression for every item immediately (parallel to presign)
    newItems.forEach((it) => processItem(it, presignPromises.get(it.id)!));

    // 4. Batch presign — fires in parallel with compression above
    try {
      const resp = await fetch(`${BASE}/api/storage/uploads/request-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          files: sliced.map((f) => ({
            name: isHeic(f) ? f.name.replace(/\.[^.]+$/, ".jpg") : f.name,
            size: f.size,
            contentType: isHeic(f) ? "image/jpeg" : (f.type || "image/jpeg"),
          })),
        }),
      });
      if (!resp.ok) throw new Error("获取上传地址失败");
      const { items } = (await resp.json()) as {
        items: { uploadURL: string; objectPath: string }[];
      };
      // Resolve each item's presign promise — processItem unblocks at Step 3
      newItems.forEach((it, i) => {
        resolvers.get(it.id)!({
          uploadURL: items[i]?.uploadURL ?? "",
          objectPath: items[i]?.objectPath ?? "",
        });
      });
    } catch (err) {
      // Reject all presign promises so processItem catches and marks error
      newItems.forEach((it) =>
        resolvers.get(it.id)!({ error: err as Error }),
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = "";
  };

  const anyBusy = queue.some((i) => i.status !== "done" && i.status !== "error");
  const doneCount = queue.filter((i) => i.status === "done").length;
  const errorCount = queue.filter((i) => i.status === "error").length;
  const totalCount = queue.length;

  const statusLabel = (item: QueueItem) => {
    switch (item.status) {
      case "compressing": return item.file.size <= SKIP_BYTES ? "准备中..." : "压缩中...";
      case "uploading":   return `上传 ${item.progress - 40 > 0 ? Math.round(((item.progress - 40) / 55) * 100) : 0}%`;
      case "saving":      return "保存中...";
      case "done":        return "完成";
      case "error":       return item.errorMsg ?? "失败";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={handleInputChange} />
      <input ref={cameraInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleInputChange} />

      {/* Aggregate progress summary */}
      {totalCount > 0 && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
          !anyBusy && errorCount === 0
            ? "bg-green-50 text-green-700 border border-green-200"
            : !anyBusy && errorCount > 0
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-muted/40 text-muted-foreground border border-border/40"
        )}>
          {anyBusy ? (
            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          ) : errorCount > 0 ? (
            <X className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {anyBusy
              ? `已完成 ${doneCount} / ${totalCount} 张`
              : errorCount > 0
              ? `${doneCount} 张成功，${errorCount} 张失败`
              : `${totalCount} 张全部上传完成`}
          </span>
          {anyBusy && (
            <div className="flex-1 h-1 bg-border/40 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%` }}
              />
            </div>
          )}
        </div>
      )}

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
                      "h-full rounded-full transition-all duration-300",
                      item.status === "done"
                        ? "bg-green-400"
                        : item.status === "error"
                        ? "bg-red-400"
                        : "bg-white",
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
      <p className="text-xs text-muted-foreground">支持同时选择多张，含 HEIC · 大图自动压缩，小图直接上传</p>
    </div>
  );
}

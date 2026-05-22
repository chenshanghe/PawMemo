import React, { useRef, useState, useCallback } from "react";
import { useAddEntryPhoto, getGetEntryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Images, Loader2, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";

const COMPRESS_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.85,
};

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

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const processFile = useCallback(
    async (item: QueueItem) => {
      try {
        // Step 1: compress
        updateItem(item.id, { status: "compressing", progress: 10 });
        const compressed = await imageCompression(item.file, COMPRESS_OPTIONS);

        // Step 2: get presigned URL
        updateItem(item.id, { status: "uploading", progress: 30 });
        const metaRes = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: compressed.name,
            size: compressed.size,
            contentType: compressed.type || "image/jpeg",
          }),
        });
        if (!metaRes.ok) throw new Error("获取上传地址失败");
        const { uploadURL, objectPath } = await metaRes.json();

        // Step 3: upload to GCS with progress simulation
        updateItem(item.id, { progress: 50 });
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          body: compressed,
          headers: { "Content-Type": compressed.type || "image/jpeg" },
        });
        if (!putRes.ok) throw new Error("上传到存储失败");

        updateItem(item.id, { status: "saving", progress: 90 });
        const url = `/api/storage${objectPath}`;

        // Step 4: save to DB
        await new Promise<void>((resolve, reject) => {
          addPhoto.mutate(
            { id: entryId, data: { url } },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(entryId) });
                resolve();
              },
              onError: (err) => reject(err),
            }
          );
        });

        updateItem(item.id, { status: "done", progress: 100 });
        // Remove from queue after brief success display
        setTimeout(() => {
          setQueue((prev) => prev.filter((i) => i.id !== item.id));
          URL.revokeObjectURL(item.previewUrl);
        }, 1500);
      } catch (err) {
        updateItem(item.id, { status: "error", errorMsg: (err as Error).message });
        setTimeout(() => {
          setQueue((prev) => prev.filter((i) => i.id !== item.id));
          URL.revokeObjectURL(item.previewUrl);
        }, 3000);
      }
    },
    [entryId, addPhoto, queryClient, updateItem]
  );

  const MAX_PHOTOS = 30;

  const handleFiles = async (files: FileList) => {
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

    // Process all in parallel
    await Promise.all(newItems.map((item) => processFile(item)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = "";
  };

  const anyBusy = queue.some((i) => i.status !== "done" && i.status !== "error");

  const statusLabel = (item: QueueItem) => {
    switch (item.status) {
      case "compressing": return "压缩中...";
      case "uploading": return `上传中 ${item.progress}%`;
      case "saving": return "保存中...";
      case "done": return "完成";
      case "error": return item.errorMsg ?? "失败";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Upload queue */}
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
                <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
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
      <p className="text-xs text-muted-foreground">自动压缩至 1MB 以内，支持同时选择多张</p>
    </div>
  );
}

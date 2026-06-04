import React, { useRef, useState, useEffect } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Camera, Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SKIP_BYTES = 600 * 1024;

const COMPRESS_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  initialQuality: 0.75,
  maxIteration: 4,
  preserveExif: false,
};

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
}

export function ImageUploader({ value, onChange, className, label = "上传图片" }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Local blob URL used as preview while the entry hasn't been saved yet.
  // We keep it alive until the user picks a new file, removes the image,
  // or the component unmounts — avoids a 404 from the server ACL check
  // (object not yet linked to any diary entry in the DB).
  const [preview, setPreview] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  // Revoke current blob URL and clear the ref
  const revokeCurrent = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => () => revokeCurrent(), []);

  const { uploadFile, isUploading, progress, error } = useUpload({
    basePath: `${BASE}/api/storage`,
    onSuccess: (res) => {
      // Notify parent of the server URL for saving, but keep showing the
      // local blob preview — the server object isn't in the DB yet so it
      // would 404 if we tried to display it directly.
      onChange(`/api/storage${res.objectPath}`);
    },
    onError: () => {
      revokeCurrent();
      setPreview(null);
    },
  });

  const handleFile = async (file: File) => {
    // Revoke any previous blob before creating a new one
    revokeCurrent();

    const localPreview = URL.createObjectURL(file);
    blobUrlRef.current = localPreview;
    setPreview(localPreview);

    let toUpload: File;
    if (file.size <= SKIP_BYTES) {
      toUpload = file;
    } else {
      setCompressing(true);
      try {
        toUpload = await imageCompression(file, COMPRESS_OPTIONS);
      } finally {
        setCompressing(false);
      }
    }

    // Replace with compressed blob preview
    revokeCurrent();
    const compressedPreview = URL.createObjectURL(toUpload);
    blobUrlRef.current = compressedPreview;
    setPreview(compressedPreview);

    await uploadFile(toUpload);
    // Keep compressedPreview alive — revokeCurrent() handles cleanup later
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleRemove = () => {
    revokeCurrent();
    setPreview(null);
    onChange("");
  };

  const busy = compressing || isUploading;
  const displaySrc = preview || value;

  const statusLabel = compressing
    ? "压缩中..."
    : isUploading
    ? `上传中 ${progress}%`
    : null;

  return (
    <div className={cn("space-y-2", className)}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />

      {displaySrc ? (
        <div className="relative group rounded-xl overflow-hidden aspect-[3/1] bg-muted/30 shadow-sm">
          <img
            src={displaySrc}
            alt="封面预览"
            className={cn("w-full h-full object-cover transition-opacity duration-300", busy && "opacity-60")}
          />
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 gap-2">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              {isUploading && (
                <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              )}
              <p className="text-white text-xs">{statusLabel}</p>
            </div>
          )}
          {!busy && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white/90 text-foreground px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-white">
                <Upload className="w-3.5 h-3.5" />更换图片
              </button>
              <button type="button" onClick={handleRemove} className="bg-white/90 text-destructive px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-white">
                <X className="w-3.5 h-3.5" />移除
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border/60 rounded-xl bg-muted/20 hover:bg-muted/30 hover:border-primary/40 transition-all duration-200 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-primary/70" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">拖拽图片到此处，或点击选择 · 大图自动压缩</p>
            </div>
            <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                <Upload className="w-3.5 h-3.5" />从相册选择
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                <Camera className="w-3.5 h-3.5" />拍照上传
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">上传失败：{error.message}</p>}
    </div>
  );
}

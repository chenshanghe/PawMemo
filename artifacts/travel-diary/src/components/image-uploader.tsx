import React, { useRef, useState } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Camera, Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
  accept?: string;
}

export function ImageUploader({
  value,
  onChange,
  className,
  label = "上传图片",
  accept = "image/*",
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { uploadFile, isUploading, progress, error } = useUpload({
    basePath: "/api/storage",
    onSuccess: (res) => {
      const url = `/api/storage${res.objectPath}`;
      onChange(url);
      setPreview(null);
    },
    onError: () => {
      setPreview(null);
    },
  });

  const handleFile = async (file: File) => {
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    await uploadFile(file);
    URL.revokeObjectURL(localPreview);
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

  const displaySrc = preview || value;

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
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

      {displaySrc ? (
        <div className="relative group rounded-xl overflow-hidden aspect-[3/1] bg-muted/30 shadow-sm">
          <img
            src={displaySrc}
            alt="封面预览"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isUploading && "opacity-60"
            )}
          />
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
              <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white text-xs mt-2">上传中 {progress}%</p>
            </div>
          )}
          {!isUploading && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/90 text-foreground px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-white"
              >
                <Upload className="w-3.5 h-3.5" />
                更换图片
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="bg-white/90 text-destructive px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-white"
              >
                <X className="w-3.5 h-3.5" />
                移除
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
              <p className="text-xs text-muted-foreground mt-0.5">拖拽图片到此处，或点击选择</p>
            </div>
            <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                从相册选择
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                拍照上传
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">上传失败：{error.message}</p>
      )}
    </div>
  );
}

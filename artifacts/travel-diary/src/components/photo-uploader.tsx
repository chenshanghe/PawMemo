import React, { useRef, useState } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { useAddEntryPhoto, getGetEntryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  entryId: number;
  className?: string;
}

export function PhotoUploader({ entryId, className }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const addPhoto = useAddEntryPhoto();

  const { uploadFile, isUploading, progress, error } = useUpload({
    basePath: "/api/storage",
    onSuccess: async (res) => {
      const url = `/api/storage${res.objectPath}`;
      addPhoto.mutate(
        { id: entryId, data: { url, caption: caption || undefined } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(entryId) });
            setCaption("");
            setPendingFile(null);
          },
        }
      );
    },
    onError: () => {
      setPendingFile(null);
    },
  });

  const handleFile = async (file: File) => {
    setPendingFile(file);
    await uploadFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const busy = isUploading || addPhoto.isPending;

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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

      {pendingFile && busy && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              src={URL.createObjectURL(pendingFile)}
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1.5 truncate">{pendingFile.name}</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
        </div>
      )}

      {error && <p className="text-xs text-destructive">上传失败：{error.message}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          从相册选择
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-4 h-4" />
          拍照上传
        </button>
      </div>
    </div>
  );
}

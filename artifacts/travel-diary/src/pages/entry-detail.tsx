import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetEntry,
  useDeleteEntry,
  useDeletePhoto,
  getListEntriesQueryKey,
  getGetEntryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MapPin, CalendarDays, Star, Pencil, Trash2, ArrowLeft, Image as ImageIcon, X
} from "lucide-react";
import { format } from "date-fns";

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-800",
  平静: "bg-blue-100 text-blue-800",
  感动: "bg-pink-100 text-pink-800",
  疲惫: "bg-gray-100 text-gray-700",
  兴奋: "bg-orange-100 text-orange-800",
  思念: "bg-purple-100 text-purple-800",
};

export default function EntryDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const { data: entry, isLoading } = useGetEntry(id, {
    query: { enabled: !!id, queryKey: getGetEntryQueryKey(id) },
  });
  const deleteEntry = useDeleteEntry();
  const deletePhoto = useDeletePhoto();

  const handleDeleteEntry = () => {
    deleteEntry.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
        setLocation("/entries");
      },
    });
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhoto.mutate({ photoId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(id) });
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-3xl animate-in fade-in duration-500">
          <Skeleton className="h-8 w-48 bg-muted/40" />
          <Skeleton className="h-72 w-full rounded-2xl bg-muted/40" />
          <Skeleton className="h-6 w-64 bg-muted/40" />
          <Skeleton className="h-48 w-full bg-muted/40" />
        </div>
      </Layout>
    );
  }

  if (!entry) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-xl font-serif font-bold mb-2">日记不存在</h3>
          <p className="text-muted-foreground text-sm mb-6">该日记可能已被删除。</p>
          <Link href="/entries"><Button variant="outline">返回日记列表</Button></Link>
        </div>
      </Layout>
    );
  }

  const travelDays = entry.endDate
    ? Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  return (
    <Layout>
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white p-2">
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxSrc} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Link href="/entries">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/entries/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除日记</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除「{entry.title}」吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Cover */}
        {entry.coverImage && (
          <div className="rounded-2xl overflow-hidden aspect-[21/9] shadow-lg">
            <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title & Meta */}
        <div className="space-y-4">
          <h1 className="text-4xl font-serif font-bold text-foreground leading-tight">{entry.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{entry.destination}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>{format(new Date(entry.startDate), 'yyyy年MM月dd日')}</span>
              {entry.endDate && (
                <span> — {format(new Date(entry.endDate), 'MM月dd日')}</span>
              )}
              <span className="text-primary ml-1">{travelDays} 天</span>
            </div>
            {entry.rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < entry.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            )}
            {entry.mood && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${MOODS[entry.mood] ?? "bg-muted text-muted-foreground"}`}>
                {entry.mood}
              </span>
            )}
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="border-border/50 text-muted-foreground">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {entry.content && (
          <Card className="border-border/40 bg-card/70 shadow-sm">
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif text-base">
                {entry.content}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {entry.photos && entry.photos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-foreground">旅途照片</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {entry.photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl shadow-sm bg-muted/30">
                  <img
                    src={photo.url}
                    alt={photo.caption ?? "旅途照片"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                    onClick={() => setLightboxSrc(photo.url)}
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs">{photo.caption}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

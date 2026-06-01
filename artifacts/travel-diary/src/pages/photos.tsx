import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Loader2, X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PhotoItem {
  id: number;
  url: string;
  caption: string | null;
  entryId: number;
  entryTitle: string;
  entryDestination: string;
  entryStartDate: string;
}

interface PhotosResponse {
  photos: PhotoItem[];
  total: number;
  hasMore: boolean;
}

function Lightbox({
  photos,
  index,
  onClose,
}: {
  photos: PhotoItem[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setCurrent((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose]);

  const photo = photos[current];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <img
        src={photo.url}
        alt={photo.caption ?? ""}
        className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 50) dx > 0 ? prev() : next();
          touchStartX.current = null;
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white text-center">
        {photo.caption && <p className="text-sm mb-1 text-white/80">{photo.caption}</p>}
        <p className="text-base font-semibold">{photo.entryTitle}</p>
        <p className="text-sm text-white/70 mb-3">📍 {photo.entryDestination}</p>
        <Link
          href={`/entries/${photo.entryId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/80 hover:bg-primary text-white text-xs font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          查看日记
        </Link>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        {current + 1} / {photos.length}
      </div>
    </div>
  );
}

export default function Photos() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [destination, setDestination] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const fetchPhotos = useCallback(async (p: number, dest: string, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "60" });
    if (dest) params.set("destination", dest);
    try {
      const r = await fetch(`${BASE}/api/me/photos?${params}`, { credentials: "include" });
      if (!r.ok) return;
      const data: PhotosResponse = await r.json();
      setPhotos((prev) => replace ? data.photos : [...prev, ...data.photos]);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos(1, destination, true);
    setPage(1);
  }, [destination, fetchPhotos]);

  // Load destination list for filter
  useEffect(() => {
    fetch(`${BASE}/api/stats/destinations`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((rows: { destination: string }[]) => setDestinations(rows.map((r) => r.destination)))
      .catch(() => {});
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPhotos(next, destination, false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">旅行相册</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total > 0 ? `共 ${total} 张旅途照片` : "还没有照片"}
            </p>
          </div>
          {/* Destination filter */}
          {destinations.length > 0 && (
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="text-sm border border-border/50 rounded-xl px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">全部目的地</option>
              {destinations.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="group break-inside-avoid relative rounded-xl overflow-hidden cursor-pointer shadow-sm bg-muted/20 mb-3"
                onClick={() => setLightboxIdx(idx)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-semibold line-clamp-1">{photo.entryTitle}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">📍 {photo.entryDestination}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
          </div>
        )}

        {/* Empty state */}
        {!loading && photos.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-3xl">📷</div>
            <div>
              <p className="font-semibold text-foreground">还没有旅行照片</p>
              <p className="text-sm text-muted-foreground mt-1">上传照片到日记，它们就会出现在这里</p>
            </div>
            <Link href="/entries/new" className="text-primary text-sm hover:underline">
              写第一篇日记 →
            </Link>
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <button
              onClick={loadMore}
              className="px-6 py-2.5 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              加载更多
            </button>
          </div>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </Layout>
  );
}

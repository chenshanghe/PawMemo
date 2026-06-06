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
  page: number;
  limit: number;
  totalPages: number;
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

const LIMIT = 24;

export default function Photos() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [destination, setDestination] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const fetchPhotos = useCallback(async (p: number, dest: string) => {
    setLoading(true);
    setLightboxIdx(null);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (dest) params.set("destination", dest);
    try {
      const r = await fetch(`${BASE}/api/me/photos?${params}`, { credentials: "include" });
      if (!r.ok) return;
      const data: PhotosResponse = await r.json();
      setPhotos(data.photos);
      setTotal(data.total);
      setTotalPages(data.totalPages ?? Math.ceil(data.total / LIMIT));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos(1, destination);
    setPage(1);
  }, [destination, fetchPhotos]);

  const goToPage = (p: number) => {
    setPage(p);
    fetchPhotos(p, destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Load destination list for filter
  useEffect(() => {
    fetch(`${BASE}/api/stats/destinations`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((rows: { destination: string }[]) => setDestinations(rows.map((r) => r.destination)))
      .catch(() => {});
  }, []);

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  })();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">旅行相册</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total > 0
                ? `共 ${total} 张照片 · 第 ${page} / ${totalPages} 页`
                : "还没有照片"}
            </p>
          </div>
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

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: LIMIT }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Photo grid */}
        {!loading && photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer shadow-sm bg-muted/20"
                onClick={() => setLightboxIdx(idx)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-semibold line-clamp-1">{photo.entryTitle}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">📍 {photo.entryDestination}</p>
                </div>
              </div>
            ))}
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-2 pb-4 flex-wrap">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground/50 text-sm select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p as number)}
                  className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                    page === p
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
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

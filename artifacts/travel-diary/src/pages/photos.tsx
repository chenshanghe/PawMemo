import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

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
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
      >
        <X className="w-5 h-5" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all hover:-translate-x-1 backdrop-blur-md hidden sm:block"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all hover:translate-x-1 backdrop-blur-md hidden sm:block"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <img
        src={photo.url}
        alt={photo.caption ?? ""}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 50) dx > 0 ? prev() : next();
          touchStartX.current = null;
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-32 pb-8 px-6 text-center pointer-events-none">
        <div className="max-w-4xl mx-auto flex flex-col items-center pointer-events-auto">
          {photo.caption && (
            <div className="mb-6 animate-in slide-in-from-bottom-2 duration-500">
              <span className="inline-flex px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-sm font-medium tracking-wide">
                {photo.caption}
              </span>
            </div>
          )}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h2 className="text-xl font-serif font-medium text-white/95 truncate">{photo.entryTitle}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 text-white/60 text-sm">
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {photo.entryDestination}
                </span>
              </div>
            </div>
            <Link
              href={`/entries/${photo.entryId}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black hover:bg-white/90 text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-black/20"
            >
              <ExternalLink className="w-4 h-4" />
              查看日记
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium tracking-widest bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
        {current + 1} / {photos.length}
      </div>
    </div>
  );
}

const LIMIT = 12;
const SKELETON_COUNT = 12;

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
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">旅行相册</h1>
            <p className="text-sm font-medium text-muted-foreground/80 flex items-center gap-2">
              {total > 0 ? (
                <>
                  <span>共 {total} 个瞬间</span>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span>第 {page} / {totalPages} 页</span>
                </>
              ) : (
                "光影记忆"
              )}
            </p>
          </div>
          {destinations.length > 0 && (
            <div className="relative">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="appearance-none w-full sm:w-auto min-w-[140px] pl-4 pr-10 py-2.5 text-sm font-medium border border-border/60 rounded-xl bg-card/80 text-foreground shadow-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all cursor-pointer"
              >
                <option value="">全部目的地</option>
                {destinations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          )}
        </div>

        {/* Loading skeleton — matches grid layout exactly */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 animate-pulse relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent"></div>
              </div>
            ))}
          </div>
        )}

        {/* Photo grid — CSS grid for consistent alignment */}
        {!loading && photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-muted/20 aspect-square"
                onClick={() => setLightboxIdx(idx)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading={idx < 8 ? "eager" : "lazy"}
                  decoding={idx < 4 ? "sync" : "async"}
                  fetchPriority={idx < 4 ? "high" : "auto"}
                />
                {/* hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 sm:p-5">
                  <p className="text-white text-sm font-medium line-clamp-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">{photo.entryTitle}</p>
                  <div className="flex items-center gap-1.5 text-white/80 text-[11px] mt-1.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span className="line-clamp-1 font-medium">{photo.entryDestination}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 px-4 gap-6 text-center bg-card/30 rounded-3xl border border-border/30 border-dashed">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary/60 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <div className="space-y-2 max-w-[280px]">
              <p className="text-lg font-serif font-medium text-foreground">暂无光影记忆</p>
              <p className="text-sm text-muted-foreground leading-relaxed">每一次快门，都是时光的标本。在日记中上传照片，它们就会在这里汇聚成海。</p>
            </div>
            <Link href="/entries/new" className="inline-flex items-center justify-center gap-2 mt-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105 shadow-sm shadow-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              记录新旅程
            </Link>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8 pb-4 flex-wrap">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-2.5 rounded-xl border border-border/60 bg-card/50 text-foreground hover:bg-muted hover:border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-x-0.5 disabled:hover:translate-x-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground/40 text-sm select-none font-medium">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p as number)}
                  className={`min-w-[40px] h-10 px-3 rounded-xl text-sm font-medium transition-all ${
                    page === p
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                      : "border border-border/60 bg-card/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="p-2.5 rounded-xl border border-border/60 bg-card/50 text-foreground hover:bg-muted hover:border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:translate-x-0.5 disabled:hover:translate-x-0"
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

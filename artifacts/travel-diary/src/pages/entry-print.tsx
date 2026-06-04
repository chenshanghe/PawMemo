import React, { useEffect } from "react";
import { useRoute } from "wouter";
import { useGetEntry, getGetEntryQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const MOODS: Record<string, string> = {
  开心: "😄", 平静: "😌", 感动: "🥹", 疲惫: "😴", 兴奋: "🤩", 思念: "💭",
};

function parseSectionCaption(caption: string | null): { sectionIdx: number; displayCaption: string | null } {
  if (!caption) return { sectionIdx: -1, displayCaption: null };
  const m = caption.match(/^\[s:(\d+)\]:(.*)/s);
  if (m) return { sectionIdx: Number(m[1]), displayCaption: m[2].trim() || null };
  return { sectionIdx: -1, displayCaption: caption };
}

export function EntryPrintPage() {
  const [, params] = useRoute("/entries/:id/print");
  const id = Number(params?.id);
  const { data: entry, isLoading } = useGetEntry(id, { query: { enabled: !!id, queryKey: getGetEntryQueryKey(id) } });

  useEffect(() => {
    if (!entry) return;
    document.title = `${entry.title} - 顽童日记`;
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, [entry]);

  if (isLoading || !entry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  const photos = (entry as any).photos ?? [];
  const travelDays =
    entry.endDate
      ? Math.max(1, Math.round((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1)
      : 1;

  const isNarrative = (entry as any).entryType === "narrative";

  const renderContent = () => {
    if (!entry.content) return null;

    if (!isNarrative) {
      return (
        <div className="print-section">
          <div className="print-photo-grid">
            {photos.map((p: any) => (
              <div key={p.id} className="print-photo-wrap">
                <img src={p.url} alt={p.caption ?? ""} className="print-photo" />
                {p.caption && <p className="print-caption">{p.caption}</p>}
              </div>
            ))}
          </div>
          <div className="print-body">{entry.content}</div>
        </div>
      );
    }

    const rawSections = entry.content.split(/\n?\[===\]\n?/).map((s: string) => s.trim()).filter(Boolean);
    const sections = rawSections.length > 1 ? rawSections : [entry.content];

    const photosBySection = new Map<number, typeof photos>();
    const untagged: typeof photos = [];
    photos.forEach((p: any) => {
      const { sectionIdx } = parseSectionCaption(p.caption);
      if (sectionIdx >= 0) {
        const arr = photosBySection.get(sectionIdx) ?? [];
        arr.push(p);
        photosBySection.set(sectionIdx, arr);
      } else {
        untagged.push(p);
      }
    });
    untagged.forEach((p: any, i: number) => {
      const idx = i % sections.length;
      const arr = photosBySection.get(idx) ?? [];
      arr.push(p);
      photosBySection.set(idx, arr);
    });

    return sections.map((text: string, si: number) => {
      const sectionPhotos = photosBySection.get(si) ?? [];
      return (
        <div key={si} className="print-section">
          <div className="print-body">{text}</div>
          {sectionPhotos.length > 0 && (
            <div className="print-photo-grid">
              {sectionPhotos.map((p: any) => {
                const { displayCaption } = parseSectionCaption(p.caption);
                return (
                  <div key={p.id} className="print-photo-wrap">
                    <img src={p.url} alt={displayCaption ?? ""} className="print-photo" />
                    {displayCaption && <p className="print-caption">{displayCaption}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; }

        .print-root {
          font-family: 'PingFang SC', 'Hiragino Sans GB', 'Noto Serif SC', Georgia, serif;
          color: #1a1a1a;
          max-width: 800px;
          margin: 0 auto;
          padding: 0;
        }

        /* Cover */
        .print-cover {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 60px 48px;
          background: linear-gradient(160deg, #fff8f4 0%, #fff 60%, #fef3ec 100%);
          page-break-after: always;
          position: relative;
        }
        .print-cover::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 70% 20%, rgba(249,115,22,.06) 0%, transparent 60%);
          pointer-events: none;
        }
        .print-brand {
          font-size: 14px;
          letter-spacing: 3px;
          color: #f97316;
          text-transform: uppercase;
          margin-bottom: 48px;
          font-family: system-ui, sans-serif;
        }
        .print-cover-img {
          width: 100%;
          max-height: 340px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 40px;
          box-shadow: 0 8px 40px rgba(0,0,0,.12);
        }
        .print-cover-emoji {
          font-size: 48px;
          margin-bottom: 32px;
        }
        .print-title {
          font-size: 36px;
          font-weight: 800;
          line-height: 1.25;
          margin-bottom: 16px;
          color: #111;
        }
        .print-destination {
          font-size: 18px;
          color: #f97316;
          font-weight: 600;
          margin-bottom: 24px;
          letter-spacing: .5px;
        }
        .print-meta {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
          font-size: 13px;
          color: #777;
          font-family: system-ui, sans-serif;
          margin-bottom: 24px;
        }
        .print-meta span {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .print-divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #f97316, #fb923c);
          border-radius: 2px;
          margin: 0 auto;
        }

        /* Content area */
        .print-content {
          padding: 64px 56px;
        }

        .print-section {
          margin-bottom: 48px;
        }

        .print-body {
          font-size: 15px;
          line-height: 2;
          color: #2a2a2a;
          white-space: pre-wrap;
          margin-bottom: 28px;
          text-align: justify;
        }

        .print-photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .print-photo-wrap {
          page-break-inside: avoid;
        }

        .print-photo {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }

        .print-caption {
          font-size: 11px;
          color: #999;
          text-align: center;
          margin-top: 6px;
          font-family: system-ui, sans-serif;
        }

        /* Footer */
        .print-footer {
          padding: 24px 56px 48px;
          border-top: 1px solid #f0ece6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: #bbb;
          font-family: system-ui, sans-serif;
        }

        /* Screen-only print button */
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #f97316;
          color: white;
          border: none;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: system-ui, sans-serif;
          box-shadow: 0 2px 12px rgba(249,115,22,.35);
          z-index: 100;
        }
        .print-btn:hover { background: #ea580c; }

        @media print {
          .print-btn { display: none !important; }
          .print-cover { page-break-after: always; }
          .print-section { page-break-inside: avoid; }
          @page {
            margin: 15mm 18mm;
            size: A4;
          }
        }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>
        🖨️ 打印 / 导出 PDF
      </button>

      <div className="print-root">
        {/* Cover Page */}
        <div className="print-cover">
          <div className="print-brand">顽童日记</div>

          {entry.coverImage ? (
            <img src={entry.coverImage} alt="封面" className="print-cover-img" />
          ) : photos[0] ? (
            <img src={photos[0].url} alt="封面" className="print-cover-img" />
          ) : (
            <div className="print-cover-emoji">✈️</div>
          )}

          <h1 className="print-title">{entry.title}</h1>
          <p className="print-destination">📍 {entry.destination}</p>

          <div className="print-meta">
            <span>
              📅 {format(new Date(entry.startDate), "yyyy年MM月dd日")}
              {entry.endDate ? ` — ${format(new Date(entry.endDate), "MM月dd日")}` : ""}
            </span>
            <span>🗓 {travelDays} 天</span>
            {entry.mood && <span>{MOODS[entry.mood] ?? "😊"} {entry.mood}</span>}
            {entry.companions && <span>👥 {entry.companions}</span>}
            {(entry as any).weather && (() => {
              const w = (entry as any).weather as { icon: string; desc: string; tempMax: number; tempMin: number };
              return <span>{w.icon} {w.desc} {w.tempMax}°/{w.tempMin}°C</span>;
            })()}
            {entry.rating && (
              <span>{"⭐".repeat(entry.rating)}{"☆".repeat(5 - entry.rating)}</span>
            )}
          </div>

          <div className="print-divider" />
        </div>

        {/* Content */}
        <div className="print-content">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="print-footer">
          <span>顽童日记</span>
          <span>{format(new Date(), "yyyy年MM月dd日")} 导出</span>
        </div>
      </div>
    </>
  );
}

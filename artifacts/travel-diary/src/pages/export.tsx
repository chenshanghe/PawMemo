import React, { useEffect, useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { Download, Printer, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Entry {
  id: number;
  title: string;
  destination: string;
  date: string;
  content: string | null;
  mood: string | null;
  rating: number | null;
  coverPhoto: string | null;
  photos?: { url: string }[];
}

const MOOD_EMOJI: Record<string, string> = {
  开心: "😄", 平静: "😌", 感动: "🥹", 疲惫: "😴", 兴奋: "🤩", 思念: "💭", 伤感: "😢", 惊喜: "😲",
};

export default function ExportPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BASE}/api/entries?limit=500`, { credentials: "include" })
      .then(r => r.json())
      .then(async d => {
        const list: Entry[] = Array.isArray(d.entries) ? d.entries : (Array.isArray(d) ? d : []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  const totalWords = entries.reduce((acc, e) => acc + (e.content?.length ?? 0), 0);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { page-break-after: always; }
          .print-cover { page-break-after: always; background: linear-gradient(135deg, #f97316, #fb923c); color: white; }
        }
      `}</style>

      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen size={26} className="text-orange-500" />
              <div>
                <h1 className="text-2xl font-bold">导出全部日记</h1>
                <p className="text-sm text-muted-foreground">
                  {loading ? "加载中…" : `${entries.length} 篇日记 · 约 ${totalWords.toLocaleString()} 字`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint} disabled={loading || printing} className="gap-2">
                <Printer size={16} />
                {printing ? "准备中…" : "打印 / 另存为 PDF"}
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <strong>使用提示：</strong>点击「打印 / 另存为 PDF」，在弹出的打印对话框中选择「另存为 PDF」，即可将你的旅行日记保存为精美 PDF 书册。
          </div>

          {loading ? (
            <div className="flex items-center gap-3 justify-center py-20 text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
              <span>加载日记中…</span>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.slice(0, 5).map(e => (
                <div key={e.id} className="bg-card border border-border/40 rounded-2xl p-4 flex gap-4 shadow-sm">
                  {e.coverPhoto && (
                    <img src={e.coverPhoto} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-sm text-muted-foreground">📍 {e.destination}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(e.date), "yyyy年M月d日", { locale: zhCN })}
                      {e.mood && <span className="ml-2">{MOOD_EMOJI[e.mood] ?? ""} {e.mood}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {entries.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  … 还有 {entries.length - 5} 篇（打印时包含全部）
                </p>
              )}
            </div>
          )}
        </div>
      </Layout>

      {/* Print-only layout */}
      <div ref={printRef} className="hidden print:block">
        {/* Cover page */}
        <div className="print-cover min-h-screen flex flex-col items-center justify-center text-center p-12">
          <div className="text-8xl mb-6">🍠</div>
          <h1 className="text-5xl font-bold mb-4">我的旅行日记</h1>
          <p className="text-xl opacity-80">{entries.length} 篇旅行故事</p>
          <p className="text-lg opacity-60 mt-2">共 {totalWords.toLocaleString()} 字</p>
          <p className="text-base opacity-50 mt-8">{new Date().getFullYear()} 年导出</p>
        </div>

        {/* Entry pages */}
        {entries.map((e, idx) => (
          <div key={e.id} className="print-page p-10 min-h-screen">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="text-gray-400 text-sm mb-1">第 {idx + 1} 篇</div>
              <h2 className="text-3xl font-bold">{e.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-gray-500">
                <span>📍 {e.destination}</span>
                <span>{format(new Date(e.date), "yyyy年M月d日", { locale: zhCN })}</span>
                {e.mood && <span>{MOOD_EMOJI[e.mood] ?? ""} {e.mood}</span>}
                {e.rating && <span>{"⭐".repeat(e.rating)}</span>}
              </div>
            </div>
            {e.coverPhoto && (
              <img src={e.coverPhoto} alt="" className="w-full max-h-64 object-cover rounded-xl mb-6" />
            )}
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
              {e.content ?? "（无正文）"}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

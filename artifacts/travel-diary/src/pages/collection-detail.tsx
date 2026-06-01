import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Link, useParams } from "wouter";
import { ArrowLeft, BookOpen, Globe, Lock, UserPlus, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Entry {
  id: number;
  title: string;
  destination: string;
  date: string;
  mood: string | null;
  coverPhoto: string | null;
}

interface Collection {
  id: number;
  title: string;
  description: string | null;
  visibility: string;
  entries: Entry[];
}

const MOOD_EMOJI: Record<string, string> = {
  开心: "😄", 平静: "😌", 感动: "🥹", 疲惫: "😴", 兴奋: "🤩", 思念: "💭", 伤感: "😢", 惊喜: "😲",
};

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [col, setCol] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    fetch(`${BASE}/api/collections/${id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setCol(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const loadAllEntries = async () => {
    if (allEntries.length > 0) { setShowAdd(true); return; }
    const r = await fetch(`${BASE}/api/entries?limit=200`, { credentials: "include" });
    const d = await r.json();
    setAllEntries(Array.isArray(d.entries) ? d.entries : (Array.isArray(d) ? d : []));
    setShowAdd(true);
  };

  const handleAdd = async (entryId: number) => {
    setAdding(true);
    try {
      await fetch(`${BASE}/api/collections/${id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entryId }),
      });
      load();
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (entryId: number) => {
    await fetch(`${BASE}/api/collections/${id}/entries/${entryId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setCol(c => c ? { ...c, entries: c.entries.filter(e => e.id !== entryId) } : c);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/collections/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filtered = allEntries.filter(e =>
    e.title.includes(searchTerm) || e.destination.includes(searchTerm)
  );

  if (loading) return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    </Layout>
  );

  if (!col) return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-muted-foreground">合集不存在</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/collections">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={15} /> 返回合集列表
          </button>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold truncate">{col.title}</h1>
              {col.visibility === "public"
                ? <Globe size={16} className="text-blue-400 shrink-0" />
                : <Lock size={16} className="text-muted-foreground shrink-0" />
              }
            </div>
            {col.description && <p className="text-sm text-muted-foreground mt-1">{col.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">{col.entries.length} 篇日记</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-1.5">
              {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 分享</>}
            </Button>
            <Button size="sm" onClick={loadAllEntries} className="gap-1.5">
              <UserPlus size={14} /> 添加日记
            </Button>
          </div>
        </div>

        {col.entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p>合集还没有日记</p>
            <Button className="mt-4" size="sm" onClick={loadAllEntries}>添加第一篇</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {col.entries.map(e => (
              <div key={e.id} className="bg-card border border-border/40 rounded-2xl overflow-hidden flex shadow-sm hover:shadow-md transition-shadow">
                {e.coverPhoto && (
                  <img src={e.coverPhoto} alt="" className="w-24 h-20 object-cover shrink-0" />
                )}
                <Link href={`/entries/${e.id}`} className="flex-1 p-4 min-w-0">
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    📍 {e.destination}
                    {e.mood && <span className="ml-2">{MOOD_EMOJI[e.mood] ?? ""} {e.mood}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(e.date), "yyyy年M月d日", { locale: zhCN })}
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(e.id)}
                  className="p-3 text-muted-foreground hover:text-red-500 shrink-0"
                  title="从合集移除"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加日记到合集</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="搜索日记标题或目的地…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {filtered.slice(0, 30).map(e => {
              const inCol = col.entries.some(ce => ce.id === e.id);
              return (
                <button
                  key={e.id}
                  disabled={inCol || adding}
                  onClick={() => handleAdd(e.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${inCol ? "opacity-40 cursor-default" : "hover:border-orange-400 hover:bg-orange-50"}`}
                >
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.destination} · {format(new Date(e.date), "yyyy/M/d")}</div>
                  {inCol && <div className="text-xs text-orange-400 mt-0.5">已在合集中</div>}
                </button>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">没有匹配的日记</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

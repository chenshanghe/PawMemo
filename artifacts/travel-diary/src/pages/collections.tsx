import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { BookOpen, Plus, Trash2, Globe, Lock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Collection {
  id: number;
  title: string;
  description: string | null;
  visibility: string;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", visibility: "private" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/collections`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setCollections(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      setShowNew(false);
      setForm({ title: "", description: "", visibility: "private" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("删除这个合集？合集内的日记不会被删除。")) return;
    await fetch(`${BASE}/api/collections/${id}`, { method: "DELETE", credentials: "include" });
    setCollections(c => c.filter(x => x.id !== id));
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen size={26} className="text-orange-500" />
            <h1 className="text-2xl font-bold">旅行合集</h1>
          </div>
          <Button onClick={() => setShowNew(true)} size="sm" className="gap-1.5">
            <Plus size={16} /> 新建合集
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p>还没有合集</p>
            <p className="text-sm mt-1">把你喜欢的日记整理成主题合集吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map(col => (
              <div key={col.id} className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <Link href={`/collections/${col.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base truncate">{col.title}</span>
                    {col.visibility === "public"
                      ? <Globe size={13} className="text-blue-400 shrink-0" />
                      : <Lock size={13} className="text-muted-foreground shrink-0" />
                    }
                  </div>
                  {col.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{col.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{col.entryCount} 篇日记</p>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-500 focus:text-red-500"
                      onClick={() => handleDelete(col.id)}
                    >
                      <Trash2 size={14} className="mr-2" /> 删除合集
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建合集</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="合集名称"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              <Textarea
                placeholder="描述（可选）"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
              <div className="flex gap-3">
                {["private", "public"].map(v => (
                  <button
                    key={v}
                    onClick={() => setForm(f => ({ ...f, visibility: v }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2 text-sm transition-colors ${form.visibility === v ? "border-orange-400 bg-orange-50 text-orange-600" : "border-border text-muted-foreground hover:border-orange-300"}`}
                  >
                    {v === "private" ? <><Lock size={13} />仅自己</>  : <><Globe size={13} />公开</>}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNew(false)}>取消</Button>
              <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
                {saving ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

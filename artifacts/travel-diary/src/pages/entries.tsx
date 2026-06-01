import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useListEntries, useListTags, useDeleteEntry, getListEntriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MapPin, CalendarDays, Image as ImageIcon, Search, Plus, Star, X,
  MoreHorizontal, Lock, Globe, Link2, CheckSquare, Square, Sparkles, BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-800",
  平静: "bg-blue-100 text-blue-800",
  感动: "bg-pink-100 text-pink-800",
  疲惫: "bg-gray-100 text-gray-700",
  兴奋: "bg-orange-100 text-orange-800",
  思念: "bg-purple-100 text-purple-800",
};

export default function Entries() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [destination, setDestination] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const params = {
    search: search || undefined,
    tag: selectedTag,
    destination: destination || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: entries, isLoading } = useListEntries(params);
  const { data: tags } = useListTags();
  const deleteEntry = useDeleteEntry();

  const handleDelete = (id: number) => {
    deleteEntry.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
    });
  };

  const hasFilters = search || selectedTag || destination || dateFrom || dateTo;

  const travelDays = (entry: any) => {
    if (!entry.endDate) return 1;
    return Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const goCompose = () => {
    if (selected.size < 2) return;
    navigate(`/entries/compose?ids=${[...selected].join(",")}`);
  };

  // Only show 随记 (note) entries in this view
  const noteEntries = entries?.filter((e: any) => !e.entryType || e.entryType === "note");
  const narrativeEntries = entries?.filter((e: any) => e.entryType === "narrative");

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">我的旅记</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? "加载中..." : `${noteEntries?.length ?? 0} 篇随记 · ${narrativeEntries?.length ?? 0} 篇游记`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!selectMode ? (
              <>
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  合成随记成游记
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">已选 {selected.size} 篇</span>
                <button onClick={exitSelect} className="px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  取消
                </button>
                <button
                  onClick={goCompose}
                  disabled={selected.size < 2}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm",
                    selected.size >= 2
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 合成随记成游记 ({selected.size})
                </button>
              </>
            )}
          </div>
        </div>

        {selectMode && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary flex items-center gap-2">
            <CheckSquare className="w-4 h-4 shrink-0" />
            选择 2 篇或以上随记，AI 将它们合成为一篇完整游记
          </div>
        )}

        {/* ── Search ── */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="搜索日记标题、内容或目的地..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50 rounded-xl h-10 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="目的地筛选..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-9 bg-card border-border/50 rounded-xl h-10 text-sm"
            />
            {destination && (
              <button onClick={() => setDestination("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Date Range ── */}
        <div className="bg-card rounded-xl border border-border/50 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">按出发日期筛选</p>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="bg-background border-border/50 rounded-lg h-9 text-sm flex-1" />
            <span className="text-muted-foreground text-sm font-medium shrink-0">→</span>
            <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="bg-background border-border/50 rounded-lg h-9 text-sm flex-1" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Tag Pills ── */}
        {tags && tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setSelectedTag(undefined)} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${!selectedTag ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"}`}>全部</button>
            {tags.map((tag) => (
              <button key={tag.id} onClick={() => setSelectedTag(selectedTag === tag.name ? undefined : tag.name)} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedTag === tag.name ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"}`}>{tag.name}</button>
            ))}
          </div>
        )}

        {/* ── 游记 section ── */}
        {!hasFilters && narrativeEntries && narrativeEntries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">游记</h3>
              <span className="text-xs text-muted-foreground">AI 合成的完整旅行文章</span>
            </div>
            <div className="space-y-3">
              {narrativeEntries.map((entry: any) => (
                <Link key={entry.id} href={`/entries/${entry.id}`}>
                  <div className="group bg-gradient-to-r from-primary/5 to-amber-50/40 rounded-2xl border border-primary/20 p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{entry.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" /><span>{entry.destination}</span>
                          <span>·</span>
                          <span>{format(new Date(entry.startDate), "yyyy.MM.dd")}</span>
                          {entry.sourceEntryIds?.length && <span className="text-primary/70">由 {entry.sourceEntryIds.length} 篇随记合成</span>}
                        </div>
                        {entry.content && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">"{entry.content.slice(0, 80)}…"</p>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-border/30 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground">随记</h3>
                <span className="text-xs text-muted-foreground">日常旅行片段</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Entries List ── */}
        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl bg-muted/50" />)}</div>
        ) : noteEntries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-card/40">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7 text-primary/60" />
            </div>
            <h3 className="text-lg font-serif font-bold mb-1.5 text-foreground">{hasFilters ? "没有找到匹配的日记" : "还没有任何日记"}</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">{hasFilters ? "试试调整搜索条件" : "每一段旅程都值得被记录"}</p>
            {!hasFilters && <Link href="/entries/new"><Button className="rounded-xl shadow-sm">写下第一篇日记</Button></Link>}
          </div>
        ) : (
          <div className="space-y-4">
            {noteEntries?.map((entry: any) => {
              const isSelected = selected.has(entry.id);
              return (
                <div
                  key={entry.id}
                  onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                  className={cn(
                    "group relative bg-card rounded-2xl overflow-hidden border shadow-sm transition-all duration-300",
                    selectMode
                      ? isSelected
                        ? "border-primary ring-2 ring-primary/30 cursor-pointer"
                        : "border-border/40 cursor-pointer hover:border-primary/30"
                      : "border-border/40 hover:border-primary/30 hover:shadow-md",
                  )}
                >
                  {/* Selection checkbox */}
                  {selectMode && (
                    <div className="absolute top-3 left-3 z-20">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all", isSelected ? "bg-primary text-primary-foreground" : "bg-background/90 text-muted-foreground")}>
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  )}

                  {/* Cover image */}
                  {!selectMode ? (
                    <Link href={`/entries/${entry.id}`} className="block">
                      <EntryCardInner entry={entry} travelDays={travelDays} />
                    </Link>
                  ) : (
                    <EntryCardInner entry={entry} travelDays={travelDays} />
                  )}

                  {/* Menu (only when not in select mode) */}
                  {!selectMode && (
                    <div className="absolute top-3 right-3 z-10">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-background/90 shadow-sm text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-sm">
                            <DropdownMenuItem asChild>
                              <Link href={`/entries/${entry.id}/edit`} className="cursor-pointer">编辑</Link>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">删除</DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>删除日记</AlertDialogTitle>
                            <AlertDialogDescription>确定要删除「{entry.title}」吗？此操作无法撤销，相关照片也会一并删除。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function EntryCardInner({ entry, travelDays }: { entry: any; travelDays: (e: any) => number }) {
  return (
    <>
      <div className="relative aspect-[16/7] overflow-hidden bg-muted/40">
        {entry.coverImage ? (
          <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/25" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
          <MapPin className="w-3 h-3 text-primary" />{entry.destination}
        </div>
        <div className="absolute top-3 right-10 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-muted-foreground shadow-sm flex items-center gap-1">
          {entry.visibility === "public" ? <Globe className="w-3 h-3 text-green-600" /> : entry.visibility === "shared" ? <Link2 className="w-3 h-3 text-blue-500" /> : <Lock className="w-3 h-3 text-muted-foreground/60" />}
          {format(new Date(entry.startDate), "MM.dd")}{entry.endDate && ` — ${format(new Date(entry.endDate), "MM.dd")}`}
        </div>
      </div>
      <div className="p-4 pb-3">
        <h3 className="font-serif font-bold text-lg leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1">{entry.title}</h3>
        {entry.content && <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-2 leading-relaxed">"{entry.content.slice(0, 70)}{entry.content.length > 70 ? '…"' : '"'}"</p>}
        {entry.rating && (
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: entry.rating }).map((_: any, i: number) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{travelDays(entry)} 天旅程</span>
          {entry.photoCount > 0 && <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />{entry.photoCount} 张照片</span>}
          {entry.mood && <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MOODS[entry.mood] ?? "bg-muted text-muted-foreground"}`}>{entry.mood}</span>}
        </div>
      </div>
    </>
  );
}

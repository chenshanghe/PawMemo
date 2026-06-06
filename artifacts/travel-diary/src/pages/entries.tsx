import React, { useState, useDeferredValue } from "react";
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
  LayoutList, CalendarRange,
} from "lucide-react";
import { CalendarView } from "./entries-calendar";
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
  const [view, setView] = useState<"list" | "calendar">("list");
  const queryClient = useQueryClient();

  const deferredSearch = useDeferredValue(search);
  const deferredDestination = useDeferredValue(destination);

  const params = {
    search: deferredSearch || undefined,
    tag: selectedTag,
    destination: deferredDestination || undefined,
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

  // In select mode we show notes (随记) so the user can pick them to compose.
  // In normal mode we show only synthesised narratives (游记).
  const noteEntries      = entries?.filter((e: any) => !e.entryType || e.entryType === "note");
  const narrativeEntries = entries?.filter((e: any) => e.entryType === "narrative");
  const displayEntries   = selectMode ? noteEntries : narrativeEntries;

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

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground">我的旅记</h2>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
              {isLoading ? "加载中..." : (
                <>
                  <span className="font-medium text-foreground/80">{narrativeEntries?.length ?? 0} 篇游记</span>
                  <span className="w-1 h-1 rounded-full bg-border/80"></span>
                  <span className="font-medium text-foreground/80">{noteEntries?.length ?? 0} 篇随记</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* View toggle */}
            <div className="flex items-center rounded-xl bg-card border border-border/50 p-1 shadow-sm">
              <button
                onClick={() => setView("list")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", view === "list" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
                title="列表视图"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("calendar")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", view === "calendar" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
                title="日历视图"
              >
                <CalendarRange className="w-4 h-4" />
              </button>
            </div>
            {!selectMode ? (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-sm text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                合成游记
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={exitSelect} className="px-4 py-2 rounded-xl border border-border/60 bg-card text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  取消
                </button>
                <button
                  onClick={goCompose}
                  disabled={selected.size < 2}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm",
                    selected.size >= 2
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow hover:-translate-y-0.5"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  AI 合成 ({selected.size})
                </button>
              </div>
            )}
          </div>
        </div>

        {selectMode && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm text-primary flex items-center gap-3 shadow-sm">
            <CheckSquare className="w-4.5 h-4.5 shrink-0" />
            <span>正在显示你的随记 —— 选择 <strong className="font-bold">2篇或以上</strong>，AI 将它们合成为一篇完整游记</span>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-card/50 border border-border/50 rounded-2xl p-4 shadow-sm backdrop-blur-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="搜索日记标题、内容或目的地..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background border-border/60 rounded-xl h-11 text-sm shadow-sm transition-all focus-visible:ring-primary/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative group">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="目的地筛选..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-10 bg-background border-border/60 rounded-xl h-11 text-sm shadow-sm transition-all focus-visible:ring-primary/20"
              />
              {destination && (
                <button onClick={() => setDestination("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="pl-9 bg-background border-border/60 rounded-xl h-10 text-sm shadow-sm w-full" />
              </div>
              <span className="text-muted-foreground text-sm font-medium shrink-0 px-1">至</span>
              <div className="relative flex-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="pl-9 bg-background border-border/60 rounded-xl h-10 text-sm shadow-sm w-full" />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tag Pills ── */}
        {tags && tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <button onClick={() => setSelectedTag(undefined)} className={cn("shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border", !selectedTag ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground")}>全部</button>
            {tags.map((tag) => (
              <button key={tag.id} onClick={() => setSelectedTag(selectedTag === tag.name ? undefined : tag.name)} className={cn("shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border", selectedTag === tag.name ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground")}>{tag.name}</button>
            ))}
          </div>
        )}

        {/* ── Calendar View ── */}
        {view === "calendar" && !isLoading && (
          <CalendarView entries={entries ?? []} />
        )}

        {/* ── Entries List ── */}
        {view === "list" && isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl bg-muted/60" />)}
          </div>
        ) : view === "list" && displayEntries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-card/30 border border-border/40 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 rotate-3">
              {selectMode
                ? <Sparkles className="w-8 h-8 text-primary/70" />
                : <BookOpen className="w-8 h-8 text-primary/70" />}
            </div>
            <h3 className="text-xl font-serif font-bold mb-2 text-foreground">
              {selectMode
                ? "还没有随记"
                : hasFilters ? "没有找到匹配的日记" : "还没有合成游记"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
              {selectMode
                ? "在旅途中随手记录几个瞬间，再用 AI 将它们合成为一篇完整的游记。"
                : hasFilters ? "试试调整搜索条件或清除筛选。" : "选几篇零散的随记，让 AI 帮你编织成一篇完整的旅行故事。"}
            </p>
            {!selectMode && !hasFilters && (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                去合成游记
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayEntries?.map((entry: any) => {
              const isSelected = selected.has(entry.id);
              return (
                <div
                  key={entry.id}
                  onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                  className={cn(
                    "group relative bg-card rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 flex flex-col",
                    selectMode
                      ? isSelected
                        ? "border-primary ring-2 ring-primary/40 cursor-pointer -translate-y-1 shadow-md"
                        : "border-border/40 cursor-pointer hover:border-primary/40 hover:shadow-md"
                      : "border-border/40 hover:border-primary/30 hover:shadow-md hover:-translate-y-1",
                  )}
                >
                  {/* Selection checkbox */}
                  {selectMode && (
                    <div className="absolute top-4 left-4 z-20">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all", isSelected ? "bg-primary text-primary-foreground scale-110" : "bg-background/90 text-muted-foreground border border-border/50")}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  {!selectMode ? (
                    <Link href={`/entries/${entry.id}`} className="flex flex-col flex-1">
                      <EntryCardInner entry={entry} travelDays={travelDays} />
                    </Link>
                  ) : (
                    <div className="flex flex-col flex-1">
                      <EntryCardInner entry={entry} travelDays={travelDays} />
                    </div>
                  )}

                  {/* Menu (only when not in select mode) */}
                  {!selectMode && (
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-background/90 backdrop-blur shadow-sm text-muted-foreground hover:text-foreground transition-colors hover:bg-background">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 text-sm rounded-xl">
                            <DropdownMenuItem asChild>
                              <Link href={`/entries/${entry.id}/edit`} className="cursor-pointer py-2">编辑</Link>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer py-2">删除</DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-serif">删除日记</AlertDialogTitle>
                            <AlertDialogDescription>确定要删除「{entry.title}」吗？此操作无法撤销，相关照片也会一并删除。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">确认删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

function EntryCardInner({ entry, travelDays }: { entry: any; travelDays: (e: any) => number }) {
  return (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
        {entry.coverImage ? (
          <img src={entry.coverImage} alt={entry.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/20" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80" />
        <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-white/10 text-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" />{entry.destination || "未知地点"}
        </div>
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground shadow-sm flex items-center gap-1.5 border border-white/10">
          {entry.visibility === "public" ? <Globe className="w-3.5 h-3.5 text-green-600" /> : entry.visibility === "shared" ? <Link2 className="w-3.5 h-3.5 text-blue-500" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground/70" />}
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-serif font-bold text-xl leading-tight drop-shadow-md line-clamp-1">{entry.title}</h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-white/90 drop-shadow-sm font-medium">
             <span>{format(new Date(entry.startDate), "yyyy.MM.dd")}</span>
             {entry.endDate && <span>— {format(new Date(entry.endDate), "yyyy.MM.dd")}</span>}
          </div>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        {entry.content && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">"{entry.content.replace(/<[^>]*>?/gm, '').slice(0, 80)}{entry.content.length > 80 ? '…"' : '"'}</p>}
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-muted-foreground/70" />{travelDays(entry)} 天</span>
            {entry.photoCount > 0 && <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-muted-foreground/70" />{entry.photoCount} 张</span>}
          </div>
          {entry.mood && (
            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border border-black/5", MOODS[entry.mood] ?? "bg-muted text-muted-foreground")}>
              {entry.mood}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { useOfflineDraft } from "@/hooks/useOfflineDraft";
import { CollaboratorsPanel } from "@/components/collaborators-panel";
import {
  useCreateEntry,
  useUpdateEntry,
  useGetEntry,
  useListTags,
  getListEntriesQueryKey,
  getGetEntryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Star, X, Plus, Sparkles, Loader2, MapPin, CheckCircle2 } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MOODS = ["开心", "平静", "感动", "疲惫", "兴奋", "思念"];

interface WeatherInfo {
  code: number; icon: string; desc: string; tempMax: number; tempMin: number;
}

interface EntryFormProps {
  entryId?: number;
}

export default function EntryForm({ entryId }: EntryFormProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const isEditing = !!entryId;

  const { data: existingEntry, isLoading: loadingEntry } = useGetEntry(entryId!, {
    query: { enabled: !!entryId, queryKey: getGetEntryQueryKey(entryId!) },
  });
  const { data: allTags } = useListTags();

  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const [form, setForm] = useState({
    title: "",
    destination: "",
    companions: "",
    content: "",
    coverImage: "",
    mood: "",
    rating: 0,
    startDate: "",
    endDate: "",
    visibility: "private" as "private" | "public" | "shared",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
  });
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [hoverRating, setHoverRating] = useState(0);

  // AI enhancement state
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Quota upgrade dialog
  const [upgradeInfo, setUpgradeInfo] = useState<{ code: "ENTRY_LIMIT" | "PHOTO_LIMIT"; tier: string; limit: number } | null>(null);

  // Offline draft
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const { loadDraft, clearDraft, hasDraft } = useOfflineDraft(
    { title: form.title, destination: form.destination, content: form.content, mood: form.mood, rating: form.rating },
    isEditing
  );

  useEffect(() => {
    if (!isEditing && !draftRestored && hasDraft()) {
      setShowDraftBanner(true);
    }
  }, [isEditing, draftRestored, hasDraft]);

  const geocodeDestination = useCallback(async (dest: string) => {
    const q = dest.trim();
    if (!q) return;
    setGeocoding(true);
    setGeocoded(false);
    try {
      const r = await fetch(`${BASE}/api/geocode?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (r.ok) {
        const results = await r.json();
        if (results.length > 0) {
          setForm((f) => ({ ...f, lat: results[0].lat, lng: results[0].lng }));
          setGeocoded(true);
        }
      }
    } catch {}
    finally { setGeocoding(false); }
  }, []);

  useEffect(() => {
    if (!form.lat || !form.lng || !form.startDate) { setWeather(null); return; }
    const d = new Date(form.startDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d >= today) { setWeather(null); return; }
    let cancelled = false;
    setFetchingWeather(true);
    fetch(`${BASE}/api/weather?lat=${form.lat}&lng=${form.lng}&date=${form.startDate}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setWeather(data); })
      .catch(() => { if (!cancelled) setWeather(null); })
      .finally(() => { if (!cancelled) setFetchingWeather(false); });
    return () => { cancelled = true; };
  }, [form.lat, form.lng, form.startDate]);

  useEffect(() => {
    if (existingEntry) {
      setWeather((existingEntry as any).weather ?? null);
      setForm({
        title: existingEntry.title,
        destination: existingEntry.destination,
        content: existingEntry.content ?? "",
        coverImage: existingEntry.coverImage ?? "",
        companions: existingEntry.companions ?? "",
        visibility: (existingEntry.visibility as any) ?? "private",
        mood: existingEntry.mood ?? "",
        rating: existingEntry.rating ?? 0,
        startDate: existingEntry.startDate,
        endDate: existingEntry.endDate ?? "",
        lat: (existingEntry as any).lat ?? undefined,
        lng: (existingEntry as any).lng ?? undefined,
      });
      if ((existingEntry as any).lat != null) setGeocoded(true);
      setSelectedTagIds(existingEntry.tags?.map((t) => t.id) ?? []);
    }
  }, [existingEntry]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const addNewTag = () => {
    const name = newTagName.trim();
    if (name && !newTagNames.includes(name)) {
      setNewTagNames((prev) => [...prev, name]);
    }
    setNewTagName("");
  };

  const removeNewTag = (name: string) => {
    setNewTagNames((prev) => prev.filter((n) => n !== name));
  };

  const handleAiEnhance = async () => {
    if (!form.content.trim()) return;
    setAiLoading(true);
    setAiError(null);

    abortRef.current = new AbortController();
    let accumulated = "";

    try {
      const token = await getToken();
      const resp = await fetch(`${BASE}/api/ai/enhance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ content: form.content, instruction: aiInstruction }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error("请求失败");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      // Clear content and stream in replacement
      setForm((f) => ({ ...f, content: "" }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = JSON.parse(line.slice(6));
          if (json.error) throw new Error(json.error);
          if (json.done) break;
          if (json.text) {
            accumulated += json.text;
            setForm((f) => ({ ...f, content: accumulated }));
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setAiError(err.message ?? "AI 优化失败，请稍后重试");
      }
    } finally {
      setAiLoading(false);
      abortRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      destination: form.destination,
      companions: form.companions || undefined,
      content: form.content || undefined,
      coverImage: form.coverImage || undefined,
      mood: form.mood || undefined,
      rating: form.rating || undefined,
      visibility: form.visibility,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      tagIds: selectedTagIds,
      tagNames: newTagNames,
      lat: form.lat,
      lng: form.lng,
      weather: weather ?? undefined,
    };

    if (isEditing) {
      updateEntry.mutate(
        { id: entryId!, data: payload },
        {
          onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(entryId!) });
            setLocation(`/entries/${updated.id}`);
          },
        }
      );
    } else {
      createEntry.mutate(
        { data: payload },
        {
          onSuccess: (created) => {
            clearDraft();
            queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
            setLocation(`/entries/${created.id}`);
          },
          onError: (err: any) => {
            const body = err?.data ?? err;
            if (body?.code === "ENTRY_LIMIT") {
              setUpgradeInfo({ code: "ENTRY_LIMIT", tier: body.tier ?? "free", limit: body.limit ?? 20 });
            }
          },
        }
      );
    }
  };

  const isPending = createEntry.isPending || updateEntry.isPending;

  if (isEditing && loadingEntry) {
    return (
      <Layout>
        <div className="max-w-2xl space-y-6">
          <Skeleton className="h-8 w-48 bg-muted/40" />
          <Skeleton className="h-64 w-full rounded-xl bg-muted/40" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Link href={isEditing ? `/entries/${entryId}` : "/entries"}>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="w-4 h-4" />
              {isEditing ? "返回日记" : "返回列表"}
            </Button>
          </Link>
        </div>

        <div>
          <h2 className="text-3xl font-serif font-bold text-foreground">
            {isEditing ? "编辑日记" : "写随记"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isEditing ? "修改你的旅行记忆" : "记录这段珍贵的旅程"}
          </p>
        </div>

        {showDraftBanner && !isEditing && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <span>📝 发现上次未完成的草稿，要恢复吗？</span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  const draft = loadDraft();
                  if (draft) {
                    setForm(f => ({
                      ...f,
                      title: draft.title || f.title,
                      destination: draft.destination || f.destination,
                      content: draft.content || f.content,
                      mood: draft.mood || f.mood,
                      rating: draft.rating || f.rating,
                    }));
                  }
                  setDraftRestored(true);
                  setShowDraftBanner(false);
                }}
                className="font-semibold underline hover:text-amber-900"
              >恢复草稿</button>
              <button
                onClick={() => { clearDraft(); setShowDraftBanner(false); }}
                className="text-amber-600 hover:text-amber-800"
              >忽略</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="border-border/40 bg-card/80 shadow-sm">
            <CardContent className="p-6 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">日记标题 *</Label>
                <Input
                  id="title"
                  placeholder="给这段旅程起个名字..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="bg-background border-border/60 text-lg"
                />
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-sm font-medium">目的地 *</Label>
                <div className="relative">
                  <Input
                    id="destination"
                    placeholder="你去了哪里？（离开输入框后自动定位）"
                    value={form.destination}
                    onChange={(e) => {
                      setForm({ ...form, destination: e.target.value, lat: undefined, lng: undefined });
                      setGeocoded(false);
                    }}
                    onBlur={(e) => { if (e.target.value.trim()) geocodeDestination(e.target.value); }}
                    required
                    className="bg-background border-border/60 pr-24"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {geocoding && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    {!geocoding && geocoded && (
                      <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />已定位
                      </span>
                    )}
                    {!geocoding && !geocoded && form.destination && (
                      <button
                        type="button"
                        onClick={() => geocodeDestination(form.destination)}
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                      >
                        <MapPin className="w-3 h-3" />定位
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Companions */}
              <div className="space-y-2">
                <Label htmlFor="companions" className="text-sm font-medium">同行人物</Label>
                <Input
                  id="companions"
                  placeholder="和谁一起？（如：老伴、儿子一家、老朋友张三）"
                  value={form.companions}
                  onChange={(e) => setForm({ ...form, companions: e.target.value })}
                  className="bg-background border-border/60"
                />
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">可见范围</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "private", label: "🔒 私密", desc: "仅自己可见" },
                    { value: "shared",  label: "🔗 分享可见", desc: "持链接可看" },
                    { value: "public",  label: "🌍 公开",  desc: "所有人可见" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, visibility: opt.value })}
                      className={`flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                        form.visibility === opt.value
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-background border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <span className="text-base">{opt.label.split(" ")[0]}</span>
                      <span>{opt.label.split(" ").slice(1).join(" ")}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">出发日期 *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="bg-background border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">返回日期</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="bg-background border-border/60"
                  />
                </div>
              </div>

              {/* Weather badge */}
              {(weather || fetchingWeather) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">出发日天气：</span>
                  {fetchingWeather ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />获取中...
                    </span>
                  ) : weather ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium">
                      {weather.icon} {weather.desc} {weather.tempMax}°/{weather.tempMin}°C
                    </span>
                  ) : null}
                </div>
              )}

              {/* Cover Image */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">封面图片</Label>
                <ImageUploader
                  value={form.coverImage}
                  onChange={(url) => setForm({ ...form, coverImage: url })}
                  label="上传封面图片"
                />
              </div>

              {/* Mood */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">旅行心情</Label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setForm({ ...form, mood: form.mood === mood ? "" : mood })}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                        form.mood === mood
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border/60 hover:border-primary/40"
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">旅程评分</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starVal = i + 1;
                    const filled = hoverRating ? starVal <= hoverRating : starVal <= form.rating;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setForm({ ...form, rating: form.rating === starVal ? 0 : starVal })}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`w-7 h-7 transition-colors ${filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      </button>
                    );
                  })}
                  {form.rating > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      {["", "一般", "还好", "不错", "很好", "完美"][form.rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">标签</Label>
                {allTags && allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                          selectedTagIds.includes(tag.id)
                            ? "bg-primary/20 text-primary border-primary/40"
                            : "bg-background text-muted-foreground border-border/60 hover:border-primary/30"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="添加新标签..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewTag(); } }}
                    className="bg-background border-border/60 text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addNewTag} className="shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {newTagNames.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTagNames.map((name) => (
                      <span key={name} className="flex items-center gap-1 px-2.5 py-1 bg-primary/15 text-primary border border-primary/30 rounded-full text-xs font-medium">
                        {name}
                        <button type="button" onClick={() => removeNewTag(name)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium">日记内容</Label>
                <Textarea
                  id="content"
                  placeholder="写下你的旅行故事、感受和回忆..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  className="bg-background border-border/60 resize-none font-serif text-base leading-relaxed"
                />

                {/* AI Enhancement Panel */}
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2.5">
                  <div className="flex gap-2 items-stretch">
                    <Textarea
                      placeholder="描述优化要求（留空则自动润色语法和文笔）"
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleAiEnhance(); }
                      }}
                      disabled={aiLoading}
                      rows={5}
                      className="bg-background border-border/60 text-sm min-h-[120px] resize-y flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={aiLoading ? () => abortRef.current?.abort() : handleAiEnhance}
                      disabled={!form.content.trim()}
                      className="shrink-0 gap-1.5 self-stretch h-auto"
                      variant={aiLoading ? "outline" : "default"}
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          停止
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          AI 优化
                        </>
                      )}
                    </Button>
                  </div>
                  {aiError && (
                    <p className="text-xs text-destructive">{aiError}</p>
                  )}
                  {aiLoading && (
                    <p className="text-xs text-muted-foreground animate-pulse">正在优化中，内容实时更新...</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {isEditing && entryId && (
            <div className="pt-2">
              <CollaboratorsPanel entryId={entryId} />
            </div>
          )}

          <div className="flex gap-3 justify-end pb-8">
            <Link href={isEditing ? `/entries/${entryId}` : "/entries"}>
              <Button variant="outline" type="button">取消</Button>
            </Link>
            <Button type="submit" disabled={isPending} className="gap-2 shadow-sm">
              <Save className="w-4 h-4" />
              {isPending ? "保存中..." : isEditing ? "保存修改" : "发布日记"}
            </Button>
          </div>
        </form>
      </div>
      {upgradeInfo && (
        <UpgradeDialog
          code={upgradeInfo.code}
          tier={upgradeInfo.tier}
          limit={upgradeInfo.limit}
          onClose={() => setUpgradeInfo(null)}
        />
      )}
    </Layout>
  );
}

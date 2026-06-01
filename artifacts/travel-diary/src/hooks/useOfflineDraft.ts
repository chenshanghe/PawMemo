import { useEffect, useCallback, useRef } from "react";

const DRAFT_KEY = "hongshu_offline_draft";

export interface DraftData {
  title: string;
  destination: string;
  content: string;
  mood: string;
  rating: number;
  savedAt: number;
}

export function useOfflineDraft(
  form: { title: string; destination: string; content: string; mood: string; rating: number },
  isEditing: boolean
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save
  const saveDraft = useCallback(() => {
    if (isEditing) return;
    if (!form.title.trim() && !form.content.trim() && !form.destination.trim()) return;
    const draft: DraftData = { ...form, savedAt: Date.now() };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [form, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveDraft, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [saveDraft, isEditing]);

  const loadDraft = useCallback((): DraftData | null => {
    if (isEditing) return null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw) as DraftData;
      // Ignore drafts older than 7 days
      if (Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [isEditing]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  const hasDraft = useCallback((): boolean => {
    if (isEditing) return false;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw) as DraftData;
      return !!(d.title?.trim() || d.content?.trim()) &&
        Date.now() - d.savedAt < 7 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, [isEditing]);

  return { loadDraft, clearDraft, hasDraft };
}

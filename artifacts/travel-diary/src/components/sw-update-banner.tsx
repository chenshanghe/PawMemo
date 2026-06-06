import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { useSwUpdate } from "@/hooks/useSwUpdate";

export function SwUpdateBanner() {
  const { updateReady, reload } = useSwUpdate();
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss after 10 s — the SW is already active; the user will
  // get the new code on their next natural page load.
  useEffect(() => {
    if (!updateReady || dismissed) return;
    const t = setTimeout(() => setDismissed(true), 10_000);
    return () => clearTimeout(t);
  }, [updateReady, dismissed]);

  if (!updateReady || dismissed) return null;

  return (
    <div className="mx-3 mb-2 rounded-2xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40 p-3 flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
      <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center shrink-0">
        <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">发现新版本</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          顽童记已更新，刷新后生效
        </p>
      </div>
      <button
        onClick={reload}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        立即刷新
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        title="稍后再说"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "travel-diary:install-prompt-v1";

export function InstallBanner() {
  const { canInstall, installed, install } = usePWAInstall();
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    // Only on touch devices (mobile/tablet)
    const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    if (!isTouch) return;

    // Already running as installed PWA — never show
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    // Already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Detect iOS Safari (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    const isIOS =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari =
      /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIOS && isSafari) {
      setPlatform("ios");
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: wait for beforeinstallprompt (handled via canInstall)
  }, []);

  // Android path: show when browser fires beforeinstallprompt
  useEffect(() => {
    if (!canInstall || installed) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    // Only show if we haven't set platform to ios already
    setPlatform((prev) => prev ?? "android");
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, [canInstall, installed]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) dismiss();
  };

  if (!show || installed || !platform) return null;

  return (
    <div className="mx-3 mb-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-300">
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
        {platform === "ios" ? (
          // iOS share sheet icon
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        ) : (
          <Download className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">添加到主屏幕</p>

        {platform === "ios" ? (
          <>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              像 App 一样使用顽童日记：点击浏览器底部的
              {/* Inline share icon */}
              <span className="inline-flex items-center mx-0.5 align-middle">
                <svg className="w-3.5 h-3.5 text-primary inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>
              分享按钮，选择「<strong>添加到主屏幕</strong>」
            </p>
            <button
              onClick={dismiss}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors"
            >
              知道了
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              安装到手机桌面，像 App 一样一键打开
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3 h-3" />
                立即安装
              </button>
              <button
                onClick={dismiss}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors"
              >
                暂不
              </button>
            </div>
          </>
        )}
      </div>

      {/* Close */}
      <button
        onClick={dismiss}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

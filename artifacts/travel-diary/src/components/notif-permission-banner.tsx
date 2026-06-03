import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";

const DISMISS_KEY = "travel-diary:notif-prompt-v1";

interface Props {
  unreadCount: number;
}

export function NotifPermissionBanner({ unreadCount }: Props) {
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (unreadCount > 0) setShow(true);
  }, [unreadCount]);

  async function requestPermission() {
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        new Notification("通知已开启 🎉", {
          body: "有人点赞或评论你时，我们会第一时间告诉你。",
        });
      }
    } catch {}
    dismiss();
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mx-3 mb-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-300">
      <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
        <Bell className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">开启通知，不错过互动</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          有人点赞、评论或关注你时，浏览器会及时提醒。
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={requestPermission}
            disabled={requesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <Bell className="w-3 h-3" />
            {requesting ? "请求中…" : "开启通知"}
          </button>
          <button
            onClick={dismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors"
          >
            <BellOff className="w-3 h-3" />
            暂不
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 mt-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

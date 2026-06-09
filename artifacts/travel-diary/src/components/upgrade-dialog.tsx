import React from "react";
import { Link } from "wouter";
import { X, Zap, Camera, BookText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export type QuotaCode = "ENTRY_LIMIT" | "PHOTO_LIMIT" | "AI_LIMIT" | "STYLE_LIMIT" | "CHAT_PRO_ONLY";

interface UpgradeDialogProps {
  code: QuotaCode;
  tier: string;
  limit: number;
  used?: number;
  onClose: () => void;
}

const CODE_INFO: Record<QuotaCode, { icon: React.ReactNode; title: string; desc: (limit: number) => string }> = {
  ENTRY_LIMIT: {
    icon: <BookText className="w-5 h-5 text-primary" />,
    title: "旅记数量已达上限",
    desc: (l) => `免费账户最多记录 ${l} 篇旅记，升级后可无限创作。`,
  },
  PHOTO_LIMIT: {
    icon: <Camera className="w-5 h-5 text-primary" />,
    title: "本篇照片已达上限",
    desc: (l) => `当前套餐每篇旅记最多 ${l} 张照片，升级后可添加更多。`,
  },
  AI_LIMIT: {
    icon: <Sparkles className="w-5 h-5 text-primary" />,
    title: "本月 AI 叙事次数已用完",
    desc: (l) => `当前套餐每月可使用 ${l} 次 AI 叙事，下月自动重置或立即升级。`,
  },
  STYLE_LIMIT: {
    icon: <Zap className="w-5 h-5 text-primary" />,
    title: "风格预设已达上限",
    desc: (l) => `免费账户最多保存 ${l} 个风格预设，升级后可无限保存。`,
  },
  CHAT_PRO_ONLY: {
    icon: <Sparkles className="w-5 h-5 text-primary" />,
    title: "AI 日记助手仅限付费用户",
    desc: () => "升级到探索家 Pro 或旅记大师 Plus，即可用自然语言查询所有旅行日记。",
  },
};

const PLANS = [
  {
    name: "旅行者",
    tier: "free",
    price: "免费",
    color: "bg-muted/40 border-border/40",
    badge: "当前套餐",
    features: ["20 篇旅记", "每篇 3 张照片", "AI 叙事 3 次/月", "3 个风格预设"],
  },
  {
    name: "探索家 Pro",
    tier: "pro",
    price: "¥28/月",
    color: "bg-primary/5 border-primary/30",
    badge: "推荐",
    features: ["无限旅记", "每篇 9 张照片", "AI 叙事 30 次/月", "无限风格预设"],
  },
  {
    name: "旅记大师 Plus",
    tier: "plus",
    price: "¥68/月",
    color: "bg-amber-50 border-amber-200",
    badge: "旗舰",
    features: ["无限旅记", "每篇 30 张照片", "AI 叙事 100 次/月", "无限风格预设"],
  },
];

export function UpgradeDialog({ code, tier, limit, onClose }: UpgradeDialogProps) {
  const info = CODE_INFO[code];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border/40">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {info.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-foreground">{info.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{info.desc(limit)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plans comparison */}
        <div className="p-5 space-y-2">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`rounded-xl border p-3.5 ${plan.color} ${plan.tier === tier ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{plan.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    plan.tier === "pro" ? "bg-primary/15 text-primary" :
                    plan.tier === "plus" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {plan.tier === tier ? "当前套餐" : plan.badge}
                  </span>
                </div>
                <span className="text-sm font-bold text-foreground">{plan.price}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {plan.features.map((f) => (
                  <span key={f} className="text-[11px] text-muted-foreground">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 pb-5 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            稍后再说
          </Button>
          <Link href="/pricing" className="flex-1">
            <Button className="w-full" onClick={onClose}>
              查看套餐详情
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

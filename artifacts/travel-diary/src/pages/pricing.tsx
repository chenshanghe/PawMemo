import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Sparkles, Camera, BookText, Zap, Users, Globe, ArrowLeft } from "lucide-react";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { PayDialog } from "@/components/pay-dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SubscriptionInfo {
  tier: string;
  tierName: string;
}

const PLANS = [
  {
    tier: "free",
    name: "旅行者",
    subtitle: "探索旅行记录的起点",
    price: null,
    priceLabel: "免费",
    yearLabel: null,
    color: "border-border/50",
    headerBg: "bg-muted/30",
    badgeColor: "",
    cta: "当前套餐",
    ctaDisabled: true,
    features: [
      { icon: BookText, text: "最多 20 篇旅记" },
      { icon: Camera, text: "每篇最多 3 张照片" },
      { icon: Sparkles, text: "AI 叙事 3 次/月" },
      { icon: Zap, text: "3 个风格预设" },
      { icon: Globe, text: "公开广场 & 社区" },
      { icon: Users, text: "关注 & 粉丝功能" },
    ],
  },
  {
    tier: "pro",
    name: "探索家 Pro",
    subtitle: "认真记录每一段旅行",
    price: "¥28",
    priceLabel: "¥28/月",
    yearLabel: "¥198/年（省 ¥138）",
    color: "border-primary/40 shadow-lg shadow-primary/10",
    headerBg: "bg-primary/8",
    badgeColor: "bg-primary text-primary-foreground",
    cta: "立即升级 Pro",
    ctaDisabled: false,
    badge: "推荐",
    features: [
      { icon: BookText, text: "无限旅记" },
      { icon: Camera, text: "每篇最多 9 张照片" },
      { icon: Sparkles, text: "AI 叙事 30 次/月" },
      { icon: Zap, text: "无限风格预设" },
      { icon: Globe, text: "公开广场 & 社区" },
      { icon: Users, text: "关注 & 粉丝功能" },
    ],
  },
  {
    tier: "plus",
    name: "旅记大师 Plus",
    subtitle: "极致旅行记录体验",
    price: "¥68",
    priceLabel: "¥68/月",
    yearLabel: "¥498/年（省 ¥318）",
    color: "border-amber-300/60 shadow-lg shadow-amber-100",
    headerBg: "bg-gradient-to-br from-amber-50 to-orange-50",
    badgeColor: "bg-amber-500 text-white",
    cta: "立即升级 Plus",
    ctaDisabled: false,
    badge: "旗舰",
    features: [
      { icon: BookText, text: "无限旅记" },
      { icon: Camera, text: "每篇最多 30 张照片" },
      { icon: Sparkles, text: "AI 叙事 100 次/月" },
      { icon: Zap, text: "无限风格预设" },
      { icon: Globe, text: "公开广场 & 社区" },
      { icon: Users, text: "关注 & 粉丝功能" },
    ],
  },
];

interface PayState {
  tier: "pro" | "plus";
  period: "monthly" | "yearly";
}

export default function Pricing() {
  const { isSignedIn } = useUser();
  const [, navigate] = useLocation();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [paying, setPaying] = useState<PayState | null>(null);
  const [periods, setPeriods] = useState<Record<string, "monthly" | "yearly">>({
    pro: "monthly",
    plus: "monthly",
  });

  const fetchSub = () => {
    if (!isSignedIn) return;
    fetch(`${BASE}/api/me/subscription`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setSub(d); })
      .catch(() => {});
  };

  useEffect(() => { fetchSub(); }, [isSignedIn]);

  function handlePaySuccess(_tier: string) {
    setPaying(null);
    fetchSub();
    setTimeout(() => navigate("/me"), 800);
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />返回
          </Link>
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-foreground">选择你的套餐</h1>
          <p className="text-muted-foreground mt-2">记录每一段精彩旅程，选择最适合你的方案</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {PLANS.map((plan) => {
            const isCurrent = sub?.tier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl border-2 overflow-hidden flex flex-col ${plan.color}`}
              >
                {plan.badge && (
                  <div className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                    {plan.badge}
                  </div>
                )}

                {/* Header */}
                <div className={`p-5 ${plan.headerBg}`}>
                  <h2 className="font-serif font-bold text-lg text-foreground">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.subtitle}</p>
                  <div className="mt-4">
                    {plan.price ? (
                      <>
                        <span className="text-3xl font-serif font-bold text-foreground">{plan.price}</span>
                        <span className="text-sm text-muted-foreground ml-1">/月</span>
                        {plan.yearLabel && (
                          <p className="text-[11px] text-muted-foreground/80 mt-1">{plan.yearLabel}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-3xl font-serif font-bold text-foreground">免费</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="p-5 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <div key={f.text} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* Period toggle for paid plans */}
                {plan.tier !== "free" && !isCurrent && (
                  <div className="px-5 pb-3">
                    <div className="flex rounded-xl overflow-hidden border border-border/40 text-[11px] font-medium">
                      <button
                        className={`flex-1 py-1.5 transition-colors ${periods[plan.tier] === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                        onClick={() => setPeriods((p) => ({ ...p, [plan.tier]: "monthly" }))}
                      >
                        月付
                      </button>
                      <button
                        className={`flex-1 py-1.5 transition-colors ${periods[plan.tier] === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                        onClick={() => setPeriods((p) => ({ ...p, [plan.tier]: "yearly" }))}
                      >
                        年付 <span className="opacity-70">省钱</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="p-5 pt-0">
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-sm font-medium text-muted-foreground bg-muted/50 rounded-xl">
                      当前套餐 ✓
                    </div>
                  ) : plan.ctaDisabled ? (
                    <div className="w-full py-2.5 text-center text-sm font-medium text-muted-foreground bg-muted/50 rounded-xl">
                      {plan.cta}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        className="w-full py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        onClick={() => setPaying({ tier: plan.tier as "pro" | "plus", period: periods[plan.tier] ?? "monthly" })}
                      >
                        {plan.cta}
                      </button>
                      <p className="text-[10px] text-center text-muted-foreground/70">支付宝支付 · 随时可取消</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-12 border-t border-border/40 pt-8">
          <h2 className="font-serif font-bold text-lg text-foreground mb-4">常见问题</h2>
          <div className="space-y-4">
            {[
              { q: "可以随时取消吗？", a: "可以，取消后套餐权益保留至当期结束，不会立即降级。" },
              { q: "升级后已有内容会受影响吗？", a: "不会。升级和降级都不影响已有旅记和照片。" },
              { q: "支持哪些支付方式？", a: "当前支持支付宝，微信支付即将开放。" },
              { q: "AI 叙事次数没用完会累积吗？", a: "不累积，每月初重置。" },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-sm font-semibold text-foreground">{q}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {paying && (
        <PayDialog
          tier={paying.tier}
          period={paying.period}
          onClose={() => setPaying(null)}
          onSuccess={handlePaySuccess}
        />
      )}
    </Layout>
  );
}

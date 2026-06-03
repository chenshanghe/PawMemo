import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { Map, BookText, Sparkles, X, ChevronRight } from "lucide-react";

const STORAGE_KEY = "travel-diary:onboarding-v1";

const SLIDES = [
  {
    emoji: "✈️",
    icon: BookText,
    title: "记录每一次旅行故事",
    desc: "用文字、照片、心情记录旅途中的每个瞬间，自动解析地点、天气，生成精美旅行日记。",
    color: "from-orange-50 to-amber-50",
    accent: "text-orange-500",
    dot: "bg-orange-400",
    btn: "bg-orange-500 hover:bg-orange-600",
  },
  {
    emoji: "🗺️",
    icon: Sparkles,
    title: "AI 秒出旅行计划",
    desc: "告诉 AI 你想去哪、几天、什么风格，它帮你生成完整行程、景点推荐和贴心小贴士。",
    color: "from-violet-50 to-purple-50",
    accent: "text-violet-500",
    dot: "bg-violet-400",
    btn: "bg-violet-500 hover:bg-violet-600",
  },
  {
    emoji: "🌍",
    icon: Map,
    title: "足迹地图 + 旅行社区",
    desc: "在地图上看见你走过的每一个地方，发现同好、互相收藏，一起记录美好旅行。",
    color: "from-teal-50 to-cyan-50",
    accent: "text-teal-500",
    dot: "bg-teal-400",
    btn: "bg-teal-500 hover:bg-teal-600",
  },
];

export function Onboarding() {
  const { isSignedIn, isLoaded } = useUser();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, [isLoaded, isSignedIn]);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
    }, 280);
  }

  function next() {
    if (step < SLIDES.length - 1) setStep(s => s + 1);
    else dismiss();
  }

  if (!visible) return null;

  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-opacity duration-300 ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div className={`relative w-full sm:max-w-sm mx-auto bg-gradient-to-b ${slide.color} dark:from-zinc-900 dark:to-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden`}>
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/8 flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-black/15 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-8 pt-12 pb-8 flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-white/80 dark:bg-white/10 shadow-lg flex items-center justify-center text-5xl select-none">
              {slide.emoji}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white dark:bg-zinc-700 shadow flex items-center justify-center ${slide.accent}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground leading-snug">{slide.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{slide.desc}</p>
          </div>

          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${i === step ? `${slide.dot} w-5 h-2` : "bg-black/15 dark:bg-white/20 w-2 h-2"}`}
              />
            ))}
          </div>

          <div className="w-full flex flex-col gap-2 pb-2">
            <button
              onClick={next}
              className={`w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] ${slide.btn}`}
            >
              {isLast ? "开始探索 🚀" : (
                <span className="flex items-center justify-center gap-1">
                  下一步 <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </button>
            {!isLast && (
              <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                跳过引导
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from "wouter";
import { MapPin, BookOpen, Images, Star, Navigation, Sun, Moon, Monitor, ArrowRight, Compass, Heart, Share2, Shield, Sparkles, Camera, Map, Quote } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const FEATURES = [
  {
    icon: <Camera className="w-6 h-6" />,
    title: "图文并茂",
    desc: "多图排版、自动提取位置和时间，每一篇都像出版物一样精美",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  },
  {
    icon: <Map className="w-6 h-6" />,
    title: "足迹地图",
    desc: "每次记录都在你的专属世界地图留下印记，看着版图被慢慢点亮",
    color: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI 日记助手",
    desc: "用自然语言翻找任何旅程——「去年在哪里看了海」立刻找到答案",
    color: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: "旅行评分榜",
    desc: "风景、美食、人文、性价比四维评分，建立属于你的私人目的地榜单",
    color: "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "完全私密",
    desc: "你的数据只属于你，默认私密保存，随时可以选择分享给好友",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  },
  {
    icon: <Share2 className="w-6 h-6" />,
    title: "精美分享",
    desc: "一键生成排版精美的长图或专属链接，让旅途的精彩走进好友的相册",
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  },
];

const JOURNAL_CARDS = [
  { destination: "京都", date: "2024·春", mood: "🌸", title: "哲学之道的樱花隧道", color: "from-pink-100 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/20" },
  { destination: "大理", date: "2023·夏", mood: "🌊", title: "洱海边的慢时光", color: "from-sky-100 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/20" },
  { destination: "西藏", date: "2023·秋", mood: "🏔️", title: "纳木错的星空无边无际", color: "from-indigo-100 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/20" },
];

const STATS = [
  { value: "20,000+", label: "旅行故事" },
  { value: "150+", label: "足迹城市" },
  { value: "4.9", label: "用户评分" },
];

function JournalMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {JOURNAL_CARDS.map((card, i) => (
        <div
          key={card.destination}
          className={`absolute w-[85%] rounded-2xl p-5 border border-white/60 dark:border-white/10 shadow-lg backdrop-blur bg-gradient-to-br ${card.color} transition-all duration-500`}
          style={{
            top: `${i * 44}px`,
            left: i % 2 === 0 ? "0" : "15%",
            zIndex: i,
            transform: `rotate(${i === 0 ? -2 : i === 1 ? 1 : -1}deg)`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-widest text-foreground/50 uppercase">{card.destination} · {card.date}</span>
            <span className="text-lg">{card.mood}</span>
          </div>
          <p className="font-serif font-bold text-foreground/90 text-sm leading-snug">{card.title}</p>
          <div className="flex items-center gap-1 mt-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-2.5 h-2.5 ${s <= 4 ? "fill-amber-400 text-amber-400" : "text-foreground/20"}`} />
            ))}
            <MapPin className="w-2.5 h-2.5 ml-1 text-foreground/30" />
          </div>
        </div>
      ))}
      <div className="h-64" />
    </div>
  );
}

function FeatureCard({ feature, idx }: { feature: typeof FEATURES[0]; idx: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref as any}
      className="bg-background rounded-2xl p-6 border border-border/50 hover:border-border hover:shadow-md transition-all duration-300 group"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(20px)",
        transition: `opacity 0.5s ease ${idx * 80}ms, transform 0.5s ease ${idx * 80}ms, box-shadow 0.2s, border-color 0.2s`,
      }}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feature.color} transition-transform duration-300 group-hover:scale-110`}>
        {feature.icon}
      </div>
      <h3 className="font-bold text-foreground mb-1.5 text-base">{feature.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
    </div>
  );
}

export default function Landing() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const { ref: statsRef, inView: statsInView } = useInView();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans selection:bg-primary/20">

      {/* ── Navbar ── */}
      <header className={`fixed top-0 inset-x-0 z-50 px-5 md:px-8 py-3 flex items-center justify-between transition-all duration-300 ${scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border/40 shadow-sm" : "bg-transparent"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
            <img src={`${BASE}/logo.png`} alt="顽童记" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-serif font-black text-xl tracking-wide text-foreground">顽童记</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center rounded-full border border-border/50 bg-muted/40 p-1 gap-0.5">
            {([ { value: "light", Icon: Sun }, { value: "dark", Icon: Moon }, { value: "system", Icon: Monitor } ] as const).map(({ value, Icon }) => (
              <button key={value} onClick={() => setTheme(value)} className={`p-1.5 rounded-full transition-all ${theme === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <Link href="/sign-in" className="hidden sm:inline-flex px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50">
            登录
          </Link>
          <Link href="/sign-up" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-px active:translate-y-0 transition-all">
            开始记录 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <section className="relative pt-28 md:pt-40 pb-16 md:pb-24 px-5 md:px-8 overflow-hidden">
          {/* bg glow */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--tw-gradient-stops))] from-primary/12 via-background to-background" />

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left: copy */}
            <div className="flex flex-col items-start gap-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                <Compass className="w-3.5 h-3.5" />
                你的私人旅行手账
              </div>

              <h1 className="font-serif font-black text-foreground leading-[1.08] tracking-tight">
                <span className="text-4xl md:text-6xl block">留住旅途中的</span>
                <span className="text-5xl md:text-7xl block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-primary via-[hsl(var(--primary))] to-secondary">每一个闪光瞬间</span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                文字、照片、坐标、心情 — 用最优雅的方式，将散落的记忆编织成专属于你的旅行故事册。
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-foreground text-background rounded-full font-bold text-base hover:bg-foreground/90 active:scale-95 transition-all shadow-lg shadow-foreground/10">
                  <BookOpen className="w-4 h-4" />
                  免费开始记录
                </Link>
                <Link href="/sign-in" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-border rounded-full font-semibold text-base text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-95">
                  已有账号登录
                </Link>
              </div>

              {/* mini stats */}
              <div className="flex items-center gap-5 pt-2">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="font-black text-xl text-foreground leading-none">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: journal cards mockup */}
            <div className="flex items-center justify-center md:justify-end">
              <JournalMockup />
            </div>
          </div>
        </section>

        {/* ── Quote strip ── */}
        <div className="py-10 px-5 md:px-8 bg-muted/25 border-y border-border/40">
          <div className="max-w-3xl mx-auto flex items-start gap-3 md:gap-4">
            <Quote className="w-8 h-8 text-primary/40 shrink-0 mt-0.5" />
            <blockquote className="font-serif italic text-lg md:text-2xl text-foreground/75 leading-relaxed">
              旅行的意义不在于到达，而在于我们在途中写下了什么、看见了什么、感受到了什么。
            </blockquote>
          </div>
        </div>

        {/* ── Features ── */}
        <section className="py-20 md:py-28 px-5 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">核心功能</p>
              <h2 className="font-serif font-black text-3xl md:text-4xl text-foreground mb-3">为旅行者精心设计的每一处细节</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">去掉了一切繁杂的社交干扰，只保留最纯粹、最温暖的记录体验。</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} idx={i} />)}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-20 md:py-24 px-5 md:px-8 bg-muted/20 border-y border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">使用流程</p>
              <h2 className="font-serif font-black text-3xl md:text-4xl text-foreground">三步，开始你的旅行手账</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {[
                { step: "01", icon: <BookOpen className="w-7 h-7" />, title: "创建旅行日记", desc: "填写目的地、日期和心情，一篇新的旅行故事就此开始" },
                { step: "02", icon: <Camera className="w-7 h-7" />, title: "上传照片与文字", desc: "添加旅途中的照片、文字记录，也可以让 AI 帮你润色叙事" },
                { step: "03", icon: <Heart className="w-7 h-7" />, title: "珍藏与分享", desc: "私密保存专属于你，或生成精美长图分享给最重要的人" },
              ].map((step, i) => (
                <div key={step.step} className="flex flex-col items-center text-center md:items-start md:text-left gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-5xl text-border/60 leading-none select-none">{step.step}</span>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{step.icon}</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-1">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  </div>
                  {i < 2 && <div className="hidden md:block w-full h-px bg-gradient-to-r from-border to-transparent mt-2" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats row ── */}
        <section ref={statsRef as any} className="py-16 md:py-20 px-5 md:px-8">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
            {[
              { value: "20,000+", label: "旅行故事", sub: "在顽童记留存" },
              { value: "150+", label: "足迹城市", sub: "遍布全球" },
              { value: "98%", label: "好评率", sub: "来自真实用户" },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  opacity: statsInView ? 1 : 0,
                  transform: statsInView ? "none" : "translateY(16px)",
                  transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms`,
                }}
              >
                <p className="font-black text-3xl md:text-4xl text-primary leading-none">{s.value}</p>
                <p className="font-bold text-foreground mt-1.5 text-sm md:text-base">{s.label}</p>
                <p className="text-muted-foreground text-xs md:text-sm mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 md:py-32 px-5 md:px-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,var(--tw-gradient-stops))] from-primary/8 via-background to-background -z-10" />
          <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-7">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-serif font-black text-3xl md:text-5xl text-foreground mb-4 leading-tight">
                下一段旅程，<br />从今天开始记录
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg mx-auto">
                无论是周末的短途，还是跨越山海的远行 — 每一段旅程都值得被好好珍藏。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg shadow-xl shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                立即免费注册
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/square" className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-border rounded-full font-semibold text-base text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                先逛逛广场
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/60">免费使用 · 无需信用卡 · 随时可以导出数据</p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-10 px-5 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <img src={`${BASE}/logo.png`} alt="顽童记" className="w-7 h-7 object-contain opacity-40 grayscale" />
            <span className="font-serif font-bold text-muted-foreground">顽童记</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">用户服务协议</Link>
            <span className="text-muted-foreground/50">© 2025 顽童记</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

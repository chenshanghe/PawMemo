import { Link } from "wouter";
import { MapPin, BookOpen, Images, Star, Navigation, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export default function Landing() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="顽童日记" className="w-8 h-8 object-contain shrink-0" />
          <span className="font-serif font-bold text-xl text-foreground">顽童日记</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme segmented control */}
          <div className="flex items-center rounded-xl border border-border/50 bg-muted/40 p-1 gap-0.5">
            {([
              { value: "light",  Icon: Sun,     label: "浅色" },
              { value: "dark",   Icon: Moon,    label: "深色" },
              { value: "system", Icon: Monitor, label: "跟随系统" },
            ] as const).map(({ value, Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${theme === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            登录
          </Link>
          <Link href="/sign-up" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium">
            免费注册
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6 shadow-sm">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="顽童日记" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight mb-4">
          记录每一次<br className="md:hidden" />远行的故事
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
          顽童日记，帮你留住旅途中的每个瞬间——文字、照片、心情，一键保存。
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-primary/20"
          >
            开始记录旅行
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3 border border-border text-foreground rounded-xl font-semibold text-base hover:bg-muted/40 transition-colors"
          >
            已有账号，去登录
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 py-12 border-t border-border/40 bg-muted/20">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: <BookOpen className="w-6 h-6" />, label: "图文日记" },
            { icon: <Images className="w-6 h-6" />, label: "多张照片" },
            { icon: <MapPin className="w-6 h-6" />, label: "目的地归档" },
            { icon: <Star className="w-6 h-6" />, label: "旅行评分" },
            { icon: <Navigation className="w-6 h-6" />, label: "AI 行程规划", href: "/sign-up" },
          ].map((f) => {
            const inner = (
              <div className="flex flex-col items-center gap-2 group">
                <div className={`w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center ${"href" in f ? "group-hover:bg-primary/20 transition-colors" : ""}`}>
                  {f.icon}
                </div>
                <span className={`text-sm font-medium text-foreground ${"href" in f ? "group-hover:text-primary transition-colors" : ""}`}>{f.label}</span>
              </div>
            );
            return "href" in f ? (
              <Link key={f.label} href={(f as any).href}>{inner}</Link>
            ) : (
              <div key={f.label}>{inner}</div>
            );
          })}
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground py-5 border-t border-border/40 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4">
        <span>© 2025 顽童日记</span>
        <span className="hidden sm:inline text-border">·</span>
        <Link href="/privacy" className="hover:text-primary transition-colors">隐私政策</Link>
        <span className="hidden sm:inline text-border">·</span>
        <Link href="/terms" className="hover:text-primary transition-colors">用户服务协议</Link>
      </footer>
    </div>
  );
}

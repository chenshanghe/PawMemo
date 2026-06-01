import { Link } from "wouter";
import { MapPin, BookOpen, Images, Star, Navigation } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">🍠</span>
          <span className="font-serif font-bold text-xl text-foreground">红薯旅行日记</span>
        </div>
        <div className="flex items-center gap-3">
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
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm">
          <div className="text-4xl">🗺️</div>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight mb-4">
          记录每一次<br className="md:hidden" />远行的故事
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
          红薯旅行日记，帮你留住旅途中的每个瞬间——文字、照片、心情，一键保存。
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
            { icon: <Navigation className="w-6 h-6" />, label: "AI 行程规划" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                {f.icon}
              </div>
              <span className="text-sm font-medium text-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border/40">
        © 2025 红薯旅行日记
      </footer>
    </div>
  );
}

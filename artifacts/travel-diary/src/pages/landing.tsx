import { Link } from "wouter";
import { MapPin, BookOpen, Images, Star, Navigation, Sun, Moon, Monitor, ArrowRight, Compass, Heart, Share2, Shield } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Landing() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans selection:bg-primary/20">
      {/* Header */}
      <header className={`fixed top-0 inset-x-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="顽童记" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-serif font-bold text-2xl tracking-wide text-foreground">顽童记</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center rounded-full border border-border/50 bg-background/50 backdrop-blur p-1 shadow-sm">
            {([
              { value: "light",  Icon: Sun,     label: "浅色" },
              { value: "dark",   Icon: Moon,    label: "深色" },
              { value: "system", Icon: Monitor, label: "系统" },
            ] as const).map(({ value, Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={label}
                className={`flex items-center justify-center p-2 rounded-full transition-all duration-200 ${theme === value ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          
          <Link href="/sign-in" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            登录
          </Link>
          <Link href="/sign-up" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0">
            <span>开始记录</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden flex flex-col items-center text-center">
          {/* Background Elements */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_center,var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm font-medium text-muted-foreground mb-8 animate-fade-in-up">
            <Compass className="w-4 h-4 text-primary" />
            <span>你的私人旅行手账</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif font-black text-foreground leading-[1.1] mb-6 tracking-tight max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            留住旅途中的<br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">每一个闪光瞬间</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            文字、照片、坐标、心情。用最优雅的方式，将散落的记忆编织成专属于你的旅行故事册。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-foreground text-background rounded-full font-bold text-lg transition-all hover:bg-foreground/90 hover:scale-[1.02] active:scale-95 shadow-xl shadow-foreground/10"
            >
              <span>免费创建手账</span>
              <BookOpen className="w-5 h-5" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-background text-foreground border-2 border-border rounded-full font-bold text-lg hover:bg-muted/50 transition-all active:scale-95"
            >
              已有账号登录
            </Link>
          </div>
          
          {/* Hero Image / Mockup area */}
          <div className="mt-20 w-full max-w-5xl mx-auto relative animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
            <div className="rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl bg-muted/20 relative aspect-video group">
              <img 
                src={`${import.meta.env.BASE_URL}images/journal-hero.jpg`} 
                alt="旅行手账展示" 
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-700"></div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">为什么选择顽童记？</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">我们去掉了一切繁杂的社交干扰，只为你提供最纯粹的记录体验。</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { 
                  icon: <Images className="w-8 h-8" />, 
                  title: "图文并茂的排版", 
                  desc: "上传多张照片，配合文字优雅呈现。自动提取照片时间与位置，回忆一目了然。"
                },
                { 
                  icon: <MapPin className="w-8 h-8" />, 
                  title: "足迹地图点亮", 
                  desc: "每一次记录都会在你的个人世界地图上留下印记，看着世界被慢慢点亮。"
                },
                { 
                  icon: <Star className="w-8 h-8" />, 
                  title: "多维度旅行评分", 
                  desc: "风景、美食、人文、性价比，为每一次目的地打分，建立你的私人榜单。"
                },
                { 
                  icon: <Shield className="w-8 h-8" />, 
                  title: "私密与安全", 
                  desc: "你的数据只属于你。默认完全私密，只有在你主动分享时，他人才能看到。"
                },
                { 
                  icon: <Navigation className="w-8 h-8" />, 
                  title: "智能行程辅助", 
                  desc: "结合你的喜好与历史记录，为你规划下一次完美旅程提供灵感参考。"
                },
                { 
                  icon: <Share2 className="w-8 h-8" />, 
                  title: "精美长图分享", 
                  desc: "一键生成排版精美的日记长图或专属链接，将旅途的喜悦传递给好友。"
                }
              ].map((feature, idx) => (
                <div key={idx} className="bg-background rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-primary group-hover:text-primary-foreground">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10"></div>
          <div className="max-w-4xl mx-auto text-center">
            <Heart className="w-16 h-16 text-primary mx-auto mb-8 opacity-80" />
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              准备好记录下一个故事了吗？
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              现在加入，开启你的专属旅行手账。让每一段旅程都成为值得反复翻阅的艺术品。
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-10 py-5 bg-primary text-primary-foreground rounded-full font-bold text-xl hover:bg-primary/90 transition-all hover:scale-105 shadow-xl shadow-primary/30"
            >
              <span>立即免费注册</span>
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="顽童记" className="w-8 h-8 object-contain opacity-50 grayscale" />
            <span className="font-serif font-bold text-lg text-muted-foreground">顽童记</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">用户服务协议</Link>
            <span className="hidden md:inline">© 2025 顽童记. All rights reserved.</span>
          </div>
          
          <div className="md:hidden text-sm text-muted-foreground">
            © 2025 顽童记
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link } from "wouter";
import { ChevronLeft, FileText } from "lucide-react";

const UPDATED = "2025年1月1日";

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h1 className="font-semibold text-foreground text-sm">用户服务协议</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-8 text-sm leading-relaxed text-foreground">
        <div>
          <h2 className="font-serif font-bold text-2xl text-foreground mb-2">用户服务协议</h2>
          <p className="text-muted-foreground text-xs">最后更新：{UPDATED}</p>
        </div>

        <p className="text-muted-foreground">
          欢迎使用顽童记（以下简称"本应用"或"本服务"）。请在使用本服务前仔细阅读本用户服务协议（以下简称"本协议"）。注册账号或使用本服务即视为您已阅读、理解并同意本协议的全部条款。
        </p>

        <Section title="一、服务说明">
          <p className="text-muted-foreground">
            顽童记是一款帮助用户记录旅行经历、管理旅行日记和照片、获取 AI 辅助行程规划的移动及网页应用。我们保留随时修改、暂停或终止部分或全部服务的权利，并将提前通知用户。
          </p>
        </Section>

        <Section title="二、账号注册与安全">
          <ul className="space-y-2 text-muted-foreground list-disc list-inside">
            <li>您需提供真实、准确的注册信息</li>
            <li>您有责任维护账号和密码的保密性，并对账号下发生的所有活动负责</li>
            <li>如发现账号被未经授权使用，请立即通过应用内反馈功能联系我们</li>
            <li>每位用户只允许注册一个账号</li>
          </ul>
        </Section>

        <Section title="三、用户内容与行为规范">
          <p className="text-muted-foreground mb-3">您在使用本服务时，不得发布或传播以下内容：</p>
          <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
            <li>违反法律法规或公序良俗的内容</li>
            <li>侵犯他人著作权、商标权或其他知识产权的内容</li>
            <li>含有暴力、色情、歧视或骚扰性质的内容</li>
            <li>虚假信息、谣言或误导性内容</li>
            <li>未经授权的商业广告或垃圾信息</li>
            <li>恶意软件、病毒或任何损害系统安全的代码</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            违反上述规范的，我们有权删除相关内容、限制或永久封禁账号，情节严重者将依法追究法律责任。
          </p>
        </Section>

        <Section title="四、内容所有权">
          <p className="text-muted-foreground">
            您创建的旅行日记、上传的照片及其他内容，其知识产权归您所有。您授予本应用一项有限的、非独占的、免版权费的许可，用于在本平台展示和传输您选择公开的内容。私密日记仅对您本人可见，不会被用于任何其他目的。
          </p>
        </Section>

        <Section title="五、AI 功能使用条款">
          <ul className="space-y-2 text-muted-foreground list-disc list-inside">
            <li>AI 辅助撰写和行程规划功能由第三方 AI 服务提供，生成结果仅供参考</li>
            <li>AI 生成内容可能存在错误或不准确，请结合实际情况判断使用</li>
            <li>免费账号每月享有有限次数的 AI 功能调用，超出部分需升级至付费计划</li>
            <li>您不得使用 AI 功能生成违法、有害或侵权内容</li>
          </ul>
        </Section>

        <Section title="六、付费服务">
          <ul className="space-y-2 text-muted-foreground list-disc list-inside">
            <li>部分高级功能需要订阅付费计划（Pro 或 Plus）</li>
            <li>订阅费用按月或按年收取，在您取消前将自动续费</li>
            <li>取消订阅后，当前计费周期内的权益仍可继续使用至到期</li>
            <li>如对扣费有异议，请通过应用内反馈联系我们</li>
          </ul>
        </Section>

        <Section title="七、免责声明">
          <p className="text-muted-foreground">
            本服务按"现状"提供，我们不对服务的持续可用性、准确性或适合特定用途作出任何明示或暗示的保证。在适用法律允许的最大范围内，我们不对因使用或无法使用本服务而产生的间接、偶发或后果性损失承担责任。
          </p>
        </Section>

        <Section title="八、服务变更与终止">
          <p className="text-muted-foreground">
            我们可能随时修改本协议，修改后将在应用内通知。若您不接受修改后的条款，请停止使用本服务并注销账号。您可随时在"我 → 账号与隐私"中申请注销账号，注销后您的数据将被永久删除。
          </p>
        </Section>

        <Section title="九、适用法律">
          <p className="text-muted-foreground">
            本协议受中华人民共和国法律管辖。因本协议引起的争议，双方应友好协商解决；协商不成的，提交本应用运营方所在地有管辖权的法院诉讼解决。
          </p>
        </Section>

        <Section title="十、联系我们">
          <p className="text-muted-foreground">
            如对本协议有任何疑问，请通过应用内的"意见反馈"功能与我们联系。
          </p>
        </Section>

        <div className="pt-4 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-primary transition-colors">隐私政策</Link>
          <Link href="/" className="hover:text-primary transition-colors">返回首页</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-foreground text-base">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

import { Link } from "wouter";
import { ChevronLeft, Shield } from "lucide-react";

const UPDATED = "2025年1月1日";

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h1 className="font-semibold text-foreground text-sm">隐私政策</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-8 text-sm leading-relaxed text-foreground">
        <div>
          <h2 className="font-serif font-bold text-2xl text-foreground mb-2">隐私政策</h2>
          <p className="text-muted-foreground text-xs">最后更新：{UPDATED}</p>
        </div>

        <p className="text-muted-foreground">
          欢迎使用红薯旅行日记（以下简称"本应用"）。本隐私政策说明我们如何收集、使用和保护您的个人信息。使用本应用即表示您同意本政策的条款。
        </p>

        <Section title="一、我们收集的信息">
          <SubItem title="1.1 账号信息">
            注册或登录时，我们通过第三方认证服务（Clerk）收集您的电子邮件地址、用户名及头像。我们不存储您的登录密码。
          </SubItem>
          <SubItem title="1.2 旅行日记内容">
            您主动创建的旅行日记，包括文字、旅行目的地、日期、评分、心情等字段。
          </SubItem>
          <SubItem title="1.3 照片和媒体文件">
            您上传至日记的照片和图片文件，存储于我们的对象存储服务中。
          </SubItem>
          <SubItem title="1.4 位置信息">
            您在日记中手动填写的目的地名称。本应用不会在后台自动获取您的设备 GPS 位置。
          </SubItem>
          <SubItem title="1.5 使用数据">
            为改善服务，我们可能记录匿名化的功能使用统计，不包含可识别个人身份的信息。
          </SubItem>
          <SubItem title="1.6 社交互动数据">
            您对其他用户内容的点赞、收藏、评论、关注关系等操作记录。
          </SubItem>
        </Section>

        <Section title="二、信息的使用方式">
          <ul className="space-y-2 text-muted-foreground list-disc list-inside">
            <li>提供、维护和改进本应用的功能</li>
            <li>显示您的旅行日记和个人主页</li>
            <li>支持 AI 辅助功能（如日记撰写、行程规划），相关内容会发送至 AI 服务处理，不会用于训练模型</li>
            <li>发送与您账号相关的通知（如点赞、评论、关注提醒）</li>
            <li>保障平台安全，处理举报和违规内容</li>
          </ul>
        </Section>

        <Section title="三、第三方服务">
          <p className="text-muted-foreground mb-3">本应用使用以下第三方服务，各服务均有其独立的隐私政策：</p>
          <div className="space-y-3">
            <ThirdParty name="Clerk（用户认证）" desc="负责账号注册、登录和身份验证。" url="https://clerk.com/privacy" />
            <ThirdParty name="AI 内容生成服务" desc="用于日记辅助撰写和行程规划功能，您输入的内容会发送至 AI 接口处理，不用于模型训练。" />
            <ThirdParty name="对象存储服务" desc="用于存储您上传的照片和媒体文件。" />
          </div>
        </Section>

        <Section title="四、信息共享">
          <p className="text-muted-foreground">
            我们不会出售、出租或以商业目的向第三方共享您的个人信息。以下情况除外：
          </p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground list-disc list-inside">
            <li>您设置为"公开"的旅行日记内容，可被其他用户浏览</li>
            <li>法律要求或政府机关依法调取</li>
            <li>为维护用户安全或防止欺诈所必需</li>
          </ul>
        </Section>

        <Section title="五、数据存储与安全">
          <p className="text-muted-foreground">
            您的数据存储在受保护的服务器上，我们采用行业标准的安全措施（HTTPS 传输加密、访问控制等）来保护您的信息。但请注意，没有任何互联网传输或存储方式可以保证 100% 安全。
          </p>
        </Section>

        <Section title="六、您的数据权利">
          <ul className="space-y-2 text-muted-foreground list-disc list-inside">
            <li><strong className="text-foreground">查阅：</strong>您可在应用内随时查看您的所有日记和账号信息</li>
            <li><strong className="text-foreground">修改：</strong>您可编辑或删除您创建的日记和个人资料</li>
            <li><strong className="text-foreground">注销：</strong>您可在"我 → 账号与隐私"中申请注销账号，我们将删除您的全部数据</li>
            <li><strong className="text-foreground">数据导出：</strong>如需导出您的数据，请通过下方联系方式与我们联系</li>
          </ul>
        </Section>

        <Section title="七、未成年人">
          <p className="text-muted-foreground">
            本应用不面向 13 岁以下儿童。如果我们发现意外收集了儿童的个人信息，将立即删除。
          </p>
        </Section>

        <Section title="八、政策更新">
          <p className="text-muted-foreground">
            我们可能不时更新本隐私政策。重要变更时，我们会在应用内通知您。继续使用本应用即视为接受更新后的政策。
          </p>
        </Section>

        <Section title="九、联系我们">
          <p className="text-muted-foreground">
            如对本隐私政策有任何疑问或请求，请通过应用内的"意见反馈"功能联系我们，我们将在 30 个工作日内回复。
          </p>
        </Section>

        <div className="pt-4 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-primary transition-colors">用户服务协议</Link>
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

function SubItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-foreground mb-0.5">{title}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

function ThirdParty({ name, desc, url }: { name: string; desc: string; url?: string }) {
  return (
    <div className="pl-3 border-l-2 border-border/60">
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">{desc}{url && <> <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">查看隐私政策 →</a></>}</p>
    </div>
  );
}

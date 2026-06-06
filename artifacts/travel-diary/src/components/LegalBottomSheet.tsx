import { useEffect } from "react";
import { X, FileText, Shield } from "lucide-react";

type DocType = "terms" | "privacy";

interface LegalBottomSheetProps {
  open: boolean;
  doc: DocType | null;
  onClose: () => void;
}

const UPDATED = "2025年1月1日";

function TermsContent() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-foreground">
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
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-foreground">
      <p className="text-muted-foreground">
        欢迎使用顽童记（以下简称"本应用"）。本隐私政策说明我们如何收集、使用和保护您的个人信息。使用本应用即表示您同意本政策的条款。
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
      <p className="text-muted-foreground">
        {desc}
        {url && (
          <>
            {" "}
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              查看隐私政策 →
            </a>
          </>
        )}
      </p>
    </div>
  );
}

const DOC_META: Record<DocType, { title: string; icon: React.ReactNode }> = {
  terms: {
    title: "用户服务协议",
    icon: <FileText className="w-4 h-4 text-primary" />,
  },
  privacy: {
    title: "隐私政策",
    icon: <Shield className="w-4 h-4 text-primary" />,
  },
};

export default function LegalBottomSheet({ open, doc, onClose }: LegalBottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const meta = doc ? DOC_META[doc] : null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={meta?.title}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85dvh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            {meta?.icon}
            <span className="font-semibold text-foreground text-sm">{meta?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">最后更新：{UPDATED}</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-6">
          {doc === "terms" && <TermsContent />}
          {doc === "privacy" && <PrivacyContent />}
        </div>

        <div className="flex-shrink-0 px-5 py-4 border-t border-border/40">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            我已阅读，关闭
          </button>
        </div>
      </div>
    </>
  );
}

export default function DownloadsPage() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const files = [
    {
      href: `${base}/downloads/prd.docx`,
      download: "顽童日记_PRD.docx",
      icon: "📄",
      title: "产品需求文档 PRD v1.0",
      desc: "功能模块 · 技术架构 · 商业化 · 用户旅程",
    },
    {
      href: `${base}/downloads/roadmap.docx`,
      download: "顽童日记_产品规划.docx",
      icon: "🗺️",
      title: "产品规划 2026 Roadmap",
      desc: "OKR · 里程碑 · Q3/Q4 详细计划 · 风险分析",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full">
        <h1 className="text-xl font-bold text-[#1a1a2e] mb-1">顽童日记 · 文档下载</h1>
        <p className="text-sm text-gray-500 mb-8">点击下方按钮直接下载 Word 文档</p>

        {files.map((f) => (
          <a
            key={f.href}
            href={f.href}
            download={f.download}
            className="flex items-center gap-3 bg-[#1a1a2e] text-white rounded-xl px-5 py-4 mb-3 no-underline hover:opacity-85 transition-opacity"
          >
            <span className="text-2xl shrink-0">{f.icon}</span>
            <div>
              <div className="text-sm font-medium">{f.title}</div>
              <div className="text-xs text-white/60 mt-0.5">{f.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

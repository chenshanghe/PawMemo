const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "顽童记 <notifications@hongshu.app>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!RESEND_API_KEY || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[email] Resend error", res.status, body);
    }
  } catch (err) {
    console.warn("[email] send failed:", err);
  }
}

function entryUrl(entryId: number) {
  const base = process.env.APP_URL ?? "https://hongshu.app";
  return `${base}/entries/${entryId}`;
}

export function buildCommentEmail({
  ownerName,
  commenterName,
  entryTitle,
  entryId,
  commentContent,
}: {
  ownerName: string;
  commenterName: string;
  entryTitle: string;
  entryId: number;
  commentContent: string;
}) {
  const url = entryUrl(entryId);
  return {
    subject: `${commenterName} 评论了你的日记《${entryTitle}》`,
    html: `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:'PingFang SC',system-ui,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07)">
    <tr><td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 36px 28px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:.5px">顽童记</div>
    </td></tr>
    <tr><td style="padding:32px 36px">
      <p style="margin:0 0 8px;font-size:15px">你好，<strong>${ownerName}</strong>！</p>
      <p style="margin:0 0 24px;font-size:15px;color:#555"><strong>${commenterName}</strong> 评论了你的日记《${entryTitle}》：</p>
      <div style="background:#fef3ec;border-left:4px solid #f97316;border-radius:8px;padding:16px 20px;margin-bottom:28px">
        <p style="margin:0;font-size:15px;line-height:1.7;color:#444">"${commentContent}"</p>
      </div>
      <a href="${url}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600">查看评论 →</a>
    </td></tr>
    <tr><td style="padding:20px 36px 28px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #f3f0ec">
      你收到此邮件因为你的日记收到了互动通知。<br>
      © 2025 顽童记
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function buildWeeklyDigestEmail({
  name,
  entries,
}: {
  name: string;
  entries: Array<{
    id: number; title: string; destination: string;
    startDate: string; endDate?: string | null;
    coverImage?: string | null; mood?: string | null;
  }>;
}) {
  const appUrl = process.env.APP_URL ?? "https://hongshu.app";
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const weekLabel = `${weekStart.getMonth() + 1}月${weekStart.getDate()}日 — ${now.getMonth() + 1}月${now.getDate()}日`;

  const entriesHtml = entries.map((e) => {
    const coverHtml = e.coverImage
      ? `<img src="${e.coverImage}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:10px;display:block">`
      : "";
    const dateStr = e.endDate && e.endDate !== e.startDate
      ? `${e.startDate} — ${e.endDate}`
      : e.startDate;
    return `
    <tr><td style="padding:0 36px 16px">
      <a href="${entryUrl(e.id)}" style="display:block;text-decoration:none;color:inherit;background:#faf9f7;border-radius:12px;overflow:hidden;border:1px solid #f0ece6">
        ${coverHtml}
        <div style="padding:14px 16px">
          <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:4px">${e.title}</div>
          <div style="font-size:12px;color:#999">📍 ${e.destination} · 📅 ${dateStr}${e.mood ? ` · ${e.mood}` : ""}</div>
        </div>
      </a>
    </td></tr>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:'PingFang SC',system-ui,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07)">
    <tr><td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 36px 24px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:.5px">顽童记 · 本周回顾</div>
      <div style="font-size:13px;color:rgba(255,255,255,.75);margin-top:6px">${weekLabel}</div>
    </td></tr>
    <tr><td style="padding:28px 36px 20px">
      <p style="margin:0;font-size:15px">你好，<strong>${name}</strong>！✈️</p>
      <p style="margin:8px 0 0;font-size:14px;color:#666">
        ${entries.length > 0
          ? `这周你记录了 <strong style="color:#f97316">${entries.length}</strong> 篇旅行日记，一起回顾一下吧：`
          : "这周还没有旅行记录，快去写一篇吧！"}
      </p>
    </td></tr>
    ${entriesHtml}
    <tr><td style="padding:8px 36px 28px;text-align:center">
      <a href="${appUrl}/entries/new" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:15px;font-weight:600">
        继续写日记 ✍️
      </a>
    </td></tr>
    <tr><td style="padding:20px 36px 28px;text-align:center;color:#bbb;font-size:12px;border-top:1px solid #f3f0ec">
      你收到此邮件因为你开启了每周旅行回顾。
      <a href="${appUrl}/me" style="color:#f97316;text-decoration:none">前往设置退订</a><br>
      © 2025 顽童记
    </td></tr>
  </table>
</body>
</html>`;
  return {
    subject: `顽童记 · 本周旅行回顾（${weekLabel}）`,
    html,
  };
}

export function buildLikeEmail({
  ownerName,
  likerName,
  entryTitle,
  entryId,
}: {
  ownerName: string;
  likerName: string;
  entryTitle: string;
  entryId: number;
}) {
  const url = entryUrl(entryId);
  return {
    subject: `${likerName} 点赞了你的日记《${entryTitle}》`,
    html: `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:'PingFang SC',system-ui,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07)">
    <tr><td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 36px 28px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:.5px">顽童记</div>
    </td></tr>
    <tr><td style="padding:32px 36px">
      <p style="margin:0 0 8px;font-size:15px">你好，<strong>${ownerName}</strong>！</p>
      <p style="margin:0 0 24px;font-size:15px;color:#555">
        <strong>${likerName}</strong> 给你的日记《${entryTitle}》点了 ❤️ 赞！
      </p>
      <a href="${url}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600">查看日记 →</a>
    </td></tr>
    <tr><td style="padding:20px 36px 28px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #f3f0ec">
      你收到此邮件因为你的日记收到了互动通知。<br>
      © 2025 顽童记
    </td></tr>
  </table>
</body>
</html>`,
  };
}

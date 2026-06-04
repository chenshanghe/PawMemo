/**
 * Generate a 1200×630 OG-style share card as a PNG Blob.
 * Uses the browser Canvas API — no server needed.
 */
export interface ShareCardOptions {
  title: string;
  destination?: string | null;
  date?: string | null;
  rating?: number | null;
  coverUrl?: string | null;
}

const W = 1200;
const H = 630;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): string[] {
  const words = text.split("");
  const lines: string[] = [];
  let current = "";
  for (const ch of words) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateShareCard(opts: ShareCardOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──────────────────────────────────────────────────────────────
  if (opts.coverUrl) {
    try {
      const img = await loadImage(opts.coverUrl);
      // Draw cover scaled to fill
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } catch {
      drawGradientBg(ctx);
    }
  } else {
    drawGradientBg(ctx);
  }

  // ── Dark overlay ─────────────────────────────────────────────────────────────
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0,   "rgba(0,0,0,0.15)");
  overlay.addColorStop(0.4, "rgba(0,0,0,0.25)");
  overlay.addColorStop(1,   "rgba(0,0,0,0.72)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // ── Branding top-left ────────────────────────────────────────────────────────
  ctx.font = "bold 28px 'Noto Serif SC', serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("顽童日记", 60, 68);

  // ── Title ────────────────────────────────────────────────────────────────────
  ctx.font = "bold 72px 'Noto Serif SC', serif";
  ctx.fillStyle = "#ffffff";
  const lines = wrapText(ctx, opts.title || "旅行日记", W - 120);
  const titleY = H - 200;
  const visibleLines = lines.slice(0, 3);
  visibleLines.forEach((line, i) => {
    ctx.fillText(line, 60, titleY + i * 84);
  });

  // ── Meta row ─────────────────────────────────────────────────────────────────
  ctx.font = "500 32px 'Noto Serif SC', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  const metaParts: string[] = [];
  if (opts.destination) metaParts.push(`📍 ${opts.destination}`);
  if (opts.date)        metaParts.push(`🗓 ${opts.date}`);
  if (opts.rating)      metaParts.push("⭐".repeat(opts.rating));
  if (metaParts.length) {
    ctx.fillText(metaParts.join("   "), 60, H - 60);
  }

  // ── Watermark bottom-right ───────────────────────────────────────────────────
  ctx.font = "400 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  const watermark = "记录每一次远行的故事";
  const wm = ctx.measureText(watermark);
  ctx.fillText(watermark, W - wm.width - 60, H - 60);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob failed"));
    }, "image/png");
  });
}

function drawGradientBg(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0,   "#C1552A");
  g.addColorStop(0.5, "#A0432A");
  g.addColorStop(1,   "#6B3028");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // subtle texture dots
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let x = 0; x < W; x += 40) {
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

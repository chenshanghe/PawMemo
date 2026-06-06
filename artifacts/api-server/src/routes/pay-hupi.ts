import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { subscriptionOrdersTable, userProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

// ── Config ───────────────────────────────────────────────────────────────────
// 虎皮椒已迁移至迅虎支付 (xunhupay.com)
// HUPI_APPID  — 商户后台的 APPID
// HUPI_APPKEY — 商户后台的 APPSECRET / KEY
// HUPI_API_BASE — 支付网关地址，默认 https://api.xunhupay.com
//                 备用平台: https://api.dpweixin.com
const HUPI_APPID    = process.env.HUPI_APPID    ?? "";
const HUPI_APPKEY   = process.env.HUPI_APPKEY   ?? "";
const HUPI_API_BASE = (process.env.HUPI_API_BASE ?? "https://api.xunhupay.com").replace(/\/$/, "");

export function hupiConfigured(): boolean {
  return !!(HUPI_APPID && HUPI_APPKEY);
}

// ── Debug: test endpoint (no auth) ───────────────────────────────────────────
router.get("/debug-config", (_req: Request, res: Response) => {
  res.json({
    hupiConfigured: hupiConfigured(),
    appidLen:  HUPI_APPID.length,
    appkeyLen: HUPI_APPKEY.length,
    apiBase:   HUPI_API_BASE,
  });
});

// ── Price table (in yuan, e.g. "28.00") ──────────────────────────────────────
const PRICE_TABLE: Record<string, Record<string, string>> = {
  pro:  { monthly: "28.00",  yearly: "198.00" },
  plus: { monthly: "68.00",  yearly: "498.00" },
};

const DURATION_DAYS: Record<string, number> = {
  monthly: 31,
  yearly:  366,
};

// ── Signature (xunhupay: sorted_params_string + APPKEY, MD5 → "hash") ────────
// NOTE: append APPKEY directly (no "&key=" prefix) — per official PHP SDK.
// Empty values are excluded from signing.
function makeHash(params: Record<string, string | number>): string {
  const keys = Object.keys(params)
    .filter(k => k !== "hash" && params[k] !== "" && params[k] !== undefined && params[k] !== null)
    .sort();
  // xunhupay signs by: sorted_params_string + APPKEY (no "&key=" separator)
  // ref: XH_Payment_Api::generate_xh_hash in official PHP SDK
  const base = keys.map(k => `${k}=${params[k]}`).join("&") + HUPI_APPKEY;
  return crypto.createHash("md5").update(base).digest("hex");
}

function makeTradeOrderId(): string {
  return `hs${Date.now()}${crypto.randomBytes(4).toString("hex")}`;
}

function nonceStr(): string {
  return crypto.randomBytes(16).toString("hex");
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// ── POST /pay/hupi/create ────────────────────────────────────────────────────
router.post("/create", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as unknown as AuthedRequest).userId;
  const { tier, period = "monthly", type = "wechat" } = req.body as {
    tier: string;
    period?: string;
    type?: "wechat";
  };

  console.log(`[pay-hupi] create received body=${JSON.stringify(req.body)} → tier=${tier} period=${period} type=${type}`);

  if (!["pro", "plus"].includes(tier))          { res.status(400).json({ error: "无效套餐" }); return; }
  if (!["monthly", "yearly"].includes(period))   { res.status(400).json({ error: "无效周期" }); return; }
  if (type !== "wechat")                         { res.status(400).json({ error: "无效支付方式" }); return; }

  if (!hupiConfigured()) {
    res.status(503).json({
      error: "支付服务未配置，请联系管理员",
      _debug: { pid: process.pid, ts: Date.now(), appidLen: HUPI_APPID.length, appkeyLen: HUPI_APPKEY.length, apiBase: HUPI_API_BASE },
    });
    return;
  }

  const totalFee = PRICE_TABLE[tier]?.[period];
  if (!totalFee) { res.status(400).json({ error: "价格配置错误" }); return; }

  const tradeOrderId = makeTradeOrderId();
  const title = `顽童记 ${tier === "pro" ? "探索家 Pro" : "旅记大师 Plus"} ${period === "yearly" ? "年度" : "月度"}订阅`;
  const amountCents = Math.round(parseFloat(totalFee) * 100);

  await db.insert(subscriptionOrdersTable).values({
    userId, outTradeNo: tradeOrderId, tier, period, amountCents, status: "pending",
  });

  try {
    const notifyUrl =
      (process.env.API_BASE_URL ?? `${req.protocol}://${req.get("host")}`) +
      "/api/pay/hupi/notify";

    const time = Math.floor(Date.now() / 1000);

    const params: Record<string, string | number> = {
      version:        "1.1",
      appid:          HUPI_APPID,
      trade_order_id: tradeOrderId,
      total_fee:      totalFee,
      title,
      time,
      notify_url:     notifyUrl,
      nonce_str:      nonceStr(),
      plugins:        "wantong-diary",
    };
    params.hash = makeHash(params);

    const apiRes = await fetch(`${HUPI_API_BASE}/payment/do.html`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10_000),
    });

    const apiData = await apiRes.json() as any;

    console.log(`[pay-hupi] create response tier=${tier} fee=${totalFee}`, JSON.stringify(apiData));

    if (apiData.errcode && apiData.errcode !== 0) {
      await db.delete(subscriptionOrdersTable)
        .where(eq(subscriptionOrdersTable.outTradeNo, tradeOrderId));
      res.status(502).json({
        error: apiData.errmsg ?? "虎皮椒下单失败",
        _errcode: apiData.errcode,
        _errmsg: apiData.errmsg,
      });
      return;
    }

    const qrCodeUrl: string = apiData.url_qrcode ?? apiData.url ?? "";
    await db.update(subscriptionOrdersTable)
      .set({ qrCodeUrl, updatedAt: new Date() })
      .where(eq(subscriptionOrdersTable.outTradeNo, tradeOrderId));

    res.json({ outTradeNo: tradeOrderId, qrCodeUrl, subject: title, amountYuan: totalFee, type });
  } catch (e: any) {
    await db.delete(subscriptionOrdersTable)
      .where(eq(subscriptionOrdersTable.outTradeNo, tradeOrderId));
    res.status(502).json({ error: "请求虎皮椒失败：" + (e?.message ?? "网络错误") });
  }
});

// ── GET /pay/hupi/query/:outTradeNo ──────────────────────────────────────────
router.get("/query/:outTradeNo", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as unknown as AuthedRequest).userId;
  const outTradeNo = req.params.outTradeNo as string;

  const [order] = await db.select().from(subscriptionOrdersTable)
    .where(and(
      eq(subscriptionOrdersTable.outTradeNo, outTradeNo),
      eq(subscriptionOrdersTable.userId, userId),
    ));

  if (!order) { res.status(404).json({ error: "订单不存在" }); return; }
  if (order.status === "paid") {
    res.json({ status: "paid", tier: order.tier, expiresAt: order.expiresAt });
    return;
  }

  if (!hupiConfigured()) { res.json({ status: "pending" }); return; }

  try {
    const time = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
      appid:          HUPI_APPID,
      trade_order_id: outTradeNo,
      time,
      nonce_str:      nonceStr(),
    };
    params.hash = makeHash(params);

    const apiRes = await fetch(`${HUPI_API_BASE}/payment/query.html`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(5_000),
    });

    const apiData = await apiRes.json() as any;

    const isPaid =
      apiData.errcode === 0 &&
      (apiData.data?.status === "OD" || apiData.data?.trade_state === "SUCCESS");

    if (isPaid) {
      await fulfillOrder(outTradeNo, apiData.data?.transaction_id ?? apiData.data?.trade_no ?? "");
      res.json({ status: "paid", tier: order.tier });
    } else {
      res.json({ status: "pending", tradeState: apiData.data?.status ?? apiData.data?.trade_state });
    }
  } catch (e: any) {
    res.status(502).json({ error: "查询失败：" + (e?.message ?? "") });
  }
});

// ── POST /pay/hupi/notify  (server-to-server callback from 虎皮椒) ─────────────
router.post("/notify", async (req: Request, res: Response): Promise<void> => {
  try {
    const params = { ...(req.body as Record<string, string | number>) };
    const receivedHash = params.hash as string;
    delete params.hash;

    const expectedHash = makeHash(params);
    if (receivedHash !== expectedHash) {
      res.status(400).json({ code: 0, msg: "hash error" });
      return;
    }

    // xunhupay: trade_status="OD" means paid
    const isPaid =
      params.trade_status === "OD" ||
      params.status === "OD" ||
      params.trade_state === "SUCCESS" ||
      params.result_code === "SUCCESS";

    if (isPaid) {
      await fulfillOrder(
        (params.trade_order_id ?? params.out_trade_no) as string,
        (params.transaction_id ?? params.trade_no ?? "") as string,
      );
    }
    res.json({ code: 1, msg: "success" });
  } catch {
    res.status(500).json({ code: 0, msg: "error" });
  }
});

// ── Internal: mark order paid + upgrade user ──────────────────────────────────
async function fulfillOrder(outTradeNo: string, tradeNo: string) {
  const [order] = await db.select().from(subscriptionOrdersTable)
    .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));
  if (!order || order.status === "paid") return;

  const now = new Date();
  const expiresAt = addDays(now, DURATION_DAYS[order.period] ?? 31);

  await db.update(subscriptionOrdersTable)
    .set({ status: "paid", tradeNo, paidAt: now, expiresAt, updatedAt: now })
    .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));

  await db.update(userProfilesTable)
    .set({ subscriptionTier: order.tier, subscriptionExpiresAt: expiresAt })
    .where(eq(userProfilesTable.userId, order.userId));
}

export default router;

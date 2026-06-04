import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { subscriptionOrdersTable, userProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

// ── Config ───────────────────────────────────────────────────────────────────
// Set HUPI_APPID and HUPI_APPKEY from your 虎皮椒 (hupi.io) merchant account.
const HUPI_APPID = process.env.HUPI_APPID ?? "";
const HUPI_APPKEY = process.env.HUPI_APPKEY ?? "";

export function hupiConfigured(): boolean {
  return !!(HUPI_APPID && HUPI_APPKEY);
}

// ── Price table (in fen, 1 yuan = 100 fen) ───────────────────────────────────
const PRICE_TABLE: Record<string, Record<string, number>> = {
  pro:  { monthly: 2800,  yearly: 19800 },
  plus: { monthly: 6800,  yearly: 49800 },
};

const DURATION_DAYS: Record<string, number> = {
  monthly: 31,
  yearly:  366,
};

// ── Signature (HMAC-MD5 compatible with 虎皮椒) ───────────────────────────────
// Sort params alphabetically, concat key=value&..., append &key=APPKEY, MD5.
function makeSign(params: Record<string, string | number>): string {
  const keys = Object.keys(params).filter(k => k !== "sign").sort();
  const base = keys.map(k => `${k}=${params[k]}`).join("&") + `&key=${HUPI_APPKEY}`;
  return crypto.createHash("md5").update(base).digest("hex");
}

function makeOutTradeNo(): string {
  return `hs-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// ── POST /pay/hupi/create ────────────────────────────────────────────────────
router.post("/create", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const { tier, period = "monthly", type = "alipay" } = req.body as {
    tier: string;
    period?: string;
    type?: "alipay" | "wechat";
  };

  if (!["pro", "plus"].includes(tier)) { res.status(400).json({ error: "无效套餐" }); return; }
  if (!["monthly", "yearly"].includes(period)) { res.status(400).json({ error: "无效周期" }); return; }
  if (!["alipay", "wechat"].includes(type)) { res.status(400).json({ error: "无效支付方式" }); return; }

  if (!hupiConfigured()) {
    res.status(503).json({ error: "支付服务未配置，请联系管理员" });
    return;
  }

  const amountCents = PRICE_TABLE[tier]?.[period];
  if (!amountCents) { res.status(400).json({ error: "价格配置错误" }); return; }

  const outTradeNo = makeOutTradeNo();
  const subject = `顽童日记 ${tier === "pro" ? "探索家 Pro" : "旅记大师 Plus"} ${period === "yearly" ? "年度" : "月度"}订阅`;
  const amountYuan = (amountCents / 100).toFixed(2);

  await db.insert(subscriptionOrdersTable).values({
    userId, outTradeNo, tier, period, amountCents, status: "pending",
  });

  try {
    const notifyUrl =
      (process.env.API_BASE_URL ?? `${req.protocol}://${req.get("host")}`) +
      "/api/pay/hupi/notify";

    const timestamp = Math.floor(Date.now() / 1000);

    const params: Record<string, string | number> = {
      appid:        HUPI_APPID,
      body:         subject,
      notify_url:   notifyUrl,
      out_trade_no: outTradeNo,
      timestamp,
      total_fee:    amountCents,
      type,
    };
    params.sign = makeSign(params);

    const apiRes = await fetch("https://api.hupi.io/payment/native", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10_000),
    });

    const apiData = await apiRes.json() as any;

    if (apiData.code !== 1) {
      await db.delete(subscriptionOrdersTable)
        .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));
      res.status(502).json({ error: apiData.msg ?? "虎皮椒下单失败" });
      return;
    }

    const qrCodeUrl: string = apiData.data?.code_url ?? "";
    await db.update(subscriptionOrdersTable)
      .set({ qrCodeUrl, updatedAt: new Date() })
      .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));

    res.json({ outTradeNo, qrCodeUrl, subject, amountYuan, type });
  } catch (e: any) {
    await db.delete(subscriptionOrdersTable)
      .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));
    res.status(502).json({ error: "请求虎皮椒失败：" + (e?.message ?? "网络错误") });
  }
});

// ── GET /pay/hupi/query/:outTradeNo ──────────────────────────────────────────
router.get("/query/:outTradeNo", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const { outTradeNo } = req.params;

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
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
      appid:        HUPI_APPID,
      out_trade_no: outTradeNo,
      timestamp,
    };
    params.sign = makeSign(params);

    const apiRes = await fetch("https://api.hupi.io/payment/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(5_000),
    });

    const apiData = await apiRes.json() as any;

    if (apiData.code === 1 && (apiData.data?.trade_state === "SUCCESS" || apiData.data?.status === "paid")) {
      await fulfillOrder(outTradeNo, apiData.data?.transaction_id ?? apiData.data?.trade_no ?? "");
      res.json({ status: "paid", tier: order.tier });
    } else {
      res.json({ status: "pending", tradeState: apiData.data?.trade_state });
    }
  } catch (e: any) {
    res.status(502).json({ error: "查询失败：" + (e?.message ?? "") });
  }
});

// ── POST /pay/hupi/notify  (server-to-server callback from 虎皮椒) ─────────────
router.post("/notify", async (req: Request, res: Response): Promise<void> => {
  try {
    const params = { ...(req.body as Record<string, string | number>) };
    const receivedSign = params.sign as string;
    delete params.sign;

    const expectedSign = makeSign(params);
    if (receivedSign !== expectedSign) {
      res.status(400).json({ code: 0, msg: "sign error" });
      return;
    }

    const isPaid =
      params.trade_state === "SUCCESS" ||
      params.status === "paid" ||
      params.result_code === "SUCCESS";

    if (isPaid) {
      await fulfillOrder(
        params.out_trade_no as string,
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
    .set({ status: "paid", alipayTradeNo: tradeNo, paidAt: now, expiresAt, updatedAt: now })
    .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));

  await db.update(userProfilesTable)
    .set({ subscriptionTier: order.tier, subscriptionExpiresAt: expiresAt })
    .where(eq(userProfilesTable.userId, order.userId));
}

export default router;

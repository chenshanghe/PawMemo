import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionOrdersTable, userProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { Request, Response } from "express";
import crypto from "crypto";
import { AlipaySdk } from "alipay-sdk";

const router = Router();

// ── Config ──────────────────────────────────────────────────────────────────

// Mock/sandbox payment helpers are strictly disabled in production.
// PAYMENT_MOCK_MODE=true may be set in non-production environments to opt in
// explicitly; in all cases production (NODE_ENV=production) is always blocked.
const MOCK_MODE_ALLOWED =
  process.env.NODE_ENV !== "production" &&
  process.env.PAYMENT_MOCK_MODE !== "false";

const SANDBOX = process.env.ALIPAY_SANDBOX !== "false";

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID ?? "";
const ALIPAY_PRIVATE_KEY = (process.env.ALIPAY_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const ALIPAY_PUBLIC_KEY = (process.env.ALIPAY_PUBLIC_KEY ?? "").replace(/\\n/g, "\n");

// Price table (in fen / cents)
const PRICE_TABLE: Record<string, Record<string, number>> = {
  pro:  { monthly: 2800,  yearly: 19800 },
  plus: { monthly: 6800,  yearly: 49800 },
};

// How many days the subscription lasts
const DURATION_DAYS: Record<string, number> = {
  monthly: 31,
  yearly: 366,
};

function makeSdk(): AlipaySdk | null {
  if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY || !ALIPAY_PUBLIC_KEY) return null;
  return new AlipaySdk({
    appId: ALIPAY_APP_ID,
    privateKey: ALIPAY_PRIVATE_KEY,
    alipayPublicKey: ALIPAY_PUBLIC_KEY,
    gateway: SANDBOX
      ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
      : "https://openapi.alipay.com/gateway.do",
  });
}

function makeOutTradeNo(): string {
  return `hs-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// ── POST /api/pay/alipay/create ──────────────────────────────────────────────
router.post("/alipay/create", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as unknown as AuthedRequest).userId;
  const { tier, period = "monthly" } = req.body as { tier: string; period?: string };

  if (!["pro", "plus"].includes(tier)) {
    res.status(400).json({ error: "无效套餐" }); return;
  }
  if (!["monthly", "yearly"].includes(period)) {
    res.status(400).json({ error: "无效周期" }); return;
  }

  const amountCents = PRICE_TABLE[tier]?.[period];
  if (!amountCents) { res.status(400).json({ error: "价格配置错误" }); return; }

  const outTradeNo = makeOutTradeNo();
  const subject = `顽童日记 ${tier === "pro" ? "探索家 Pro" : "旅记大师 Plus"} ${period === "yearly" ? "年度" : "月度"}订阅`;
  const amountYuan = (amountCents / 100).toFixed(2);

  // ── Insert order record ───────────────────────────────────────────────────
  await db.insert(subscriptionOrdersTable).values({
    userId,
    outTradeNo,
    tier,
    period,
    amountCents,
    status: "pending",
  });

  const sdk = makeSdk();

  // ── If SDK not configured → sandbox mock mode (non-production only) ────────
  if (!sdk) {
    if (!MOCK_MODE_ALLOWED) {
      // Clean up the pending order and refuse — no real payment can be made
      await db.delete(subscriptionOrdersTable)
        .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));
      res.status(503).json({ error: "支付服务未配置，请联系管理员" });
      return;
    }
    res.json({
      outTradeNo,
      qrCodeUrl: null,
      mockMode: true,
      subject,
      amountYuan,
    });
    return;
  }

  try {
    // Create a pre-create (F2F scan) order to get QR code URL
    const result = await sdk.exec("alipay.trade.precreate", {
      bizContent: {
        outTradeNo,
        subject,
        totalAmount: amountYuan,
        body: subject,
        timeoutExpress: "30m",
      },
    }) as any;

    const qrCodeUrl: string | null = result?.qrCode ?? result?.qr_code ?? null;

    // Save QR URL
    await db.update(subscriptionOrdersTable)
      .set({ qrCodeUrl, updatedAt: new Date() })
      .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));

    res.json({ outTradeNo, qrCodeUrl, mockMode: false, subject, amountYuan });
  } catch (e: any) {
    // Clean up pending order
    await db.delete(subscriptionOrdersTable)
      .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));
    res.status(502).json({ error: "支付宝下单失败：" + (e?.message ?? "未知错误") });
  }
});

// ── GET /api/pay/alipay/query/:outTradeNo ────────────────────────────────────
router.get("/alipay/query/:outTradeNo", requireAuth, async (req: Request, res: Response): Promise<void> => {
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

  const sdk = makeSdk();
  if (!sdk) {
    // Mock mode only available outside production
    res.json({ status: "pending", mockMode: MOCK_MODE_ALLOWED });
    return;
  }

  try {
    const result = await sdk.exec("alipay.trade.query", {
      bizContent: { outTradeNo },
    }) as any;

    const tradeStatus: string = result?.tradeStatus ?? result?.trade_status ?? "";

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      await fulfillOrder(order.outTradeNo, result?.tradeNo ?? result?.trade_no ?? "");
      res.json({ status: "paid", tier: order.tier });
    } else {
      res.json({ status: "pending", tradeStatus });
    }
  } catch (e: any) {
    res.status(502).json({ error: "查询失败：" + (e?.message ?? "") });
  }
});

// ── POST /api/pay/alipay/mock-complete ──────────────────────────────────────
// Sandbox/mock: manually complete an order.
// Disabled in production (NODE_ENV=production) and whenever real Alipay
// credentials are present. Both conditions must be clear to proceed.
router.post("/alipay/mock-complete", requireAuth, async (req: Request, res: Response): Promise<void> => {
  // Reject if production environment OR real SDK credentials are configured.
  if (!MOCK_MODE_ALLOWED || makeSdk() !== null) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const userId = (req as unknown as AuthedRequest).userId;
  const { outTradeNo } = req.body as { outTradeNo: string };

  const [order] = await db.select().from(subscriptionOrdersTable)
    .where(and(
      eq(subscriptionOrdersTable.outTradeNo, outTradeNo),
      eq(subscriptionOrdersTable.userId, userId),
    ));

  if (!order) { res.status(404).json({ error: "订单不存在" }); return; }
  if (order.status === "paid") { res.json({ status: "paid", tier: order.tier }); return; }

  await fulfillOrder(order.outTradeNo, "MOCK-" + Date.now());
  res.json({ status: "paid", tier: order.tier });
});

// ── POST /api/pay/alipay/notify ──────────────────────────────────────────────
// Alipay async notification (server-to-server)
router.post("/alipay/notify", async (req: Request, res: Response): Promise<void> => {
  const sdk = makeSdk();
  if (!sdk) { res.send("success"); return; }

  try {
    const params = req.body as Record<string, string>;
    const verified = await sdk.checkNotifySign(params);
    if (!verified) { res.status(400).send("sign error"); return; }

    const tradeStatus: string = params.trade_status ?? "";
    const outTradeNo: string = params.out_trade_no ?? "";
    const tradeNo: string = params.trade_no ?? "";

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      await fulfillOrder(outTradeNo, tradeNo);
    }
    res.send("success");
  } catch {
    res.status(500).send("error");
  }
});

// ── Internal: fulfill order + upgrade user ───────────────────────────────────
async function fulfillOrder(outTradeNo: string, alipayTradeNo: string) {
  const [order] = await db.select().from(subscriptionOrdersTable)
    .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));
  if (!order || order.status === "paid") return;

  const now = new Date();
  const expiresAt = addDays(now, DURATION_DAYS[order.period] ?? 31);

  await db.update(subscriptionOrdersTable)
    .set({ status: "paid", alipayTradeNo, paidAt: now, expiresAt, updatedAt: now })
    .where(eq(subscriptionOrdersTable.outTradeNo, outTradeNo));

  await db.update(userProfilesTable)
    .set({ subscriptionTier: order.tier, subscriptionExpiresAt: expiresAt })
    .where(eq(userProfilesTable.userId, order.userId));
}

export default router;

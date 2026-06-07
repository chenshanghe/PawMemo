import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { X, Loader2, CheckCircle2, AlertCircle, SmartphoneNfc } from "lucide-react";

function useIsMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PayDialogProps {
  tier: "pro" | "plus";
  period: "monthly" | "yearly";
  onClose: () => void;
  onSuccess: (tier: string) => void;
}

const PLAN_NAMES: Record<string, string> = {
  pro:  "探索家 Pro",
  plus: "旅记大师 Plus",
};

const PERIOD_NAMES: Record<string, string> = {
  monthly: "月度",
  yearly:  "年度",
};

type PayType = "wechat";
type Step = "qr" | "success" | "error";

const PAY_TYPES: { id: PayType; label: string; bgColor: string; icon: string }[] = [
  {
    id: "wechat",
    label: "微信支付",
    bgColor: "#07c160",
    icon: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
  },
];


export function PayDialog({ tier, period, onClose, onSuccess }: PayDialogProps) {
  const { getToken } = useAuth();
  const isMobile = useIsMobile();
  const [payType, setPayType]         = useState<PayType>("wechat");
  const [step, setStep]               = useState<Step>("qr");
  const [qrCodeUrl, setQrCodeUrl]     = useState<string | null>(null);
  const [errorMsg, setErrorMsg]       = useState("");
  const [amountYuan, setAmountYuan]   = useState("");
  const [creating, setCreating]       = useState(false);
  const [checking, setChecking]       = useState(false);

  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef       = useRef(true);
  const currentTradeRef  = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, []);

  // Re-create order whenever payment type changes
  useEffect(() => {
    stopPolling();
    setQrCodeUrl(null);
    setStep("qr");
    createOrder(payType);
  }, [payType]);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function createOrder(type: PayType) {
    if (!mountedRef.current) return;
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/pay/hupi/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier, period, type }),
      });
      const data = await res.json();
      console.log("[pay-dialog] create response", res.status, JSON.stringify(data));
      if (!mountedRef.current) return;
      if (!res.ok) {
        const detail = res.status === 401 ? "登录状态失效，请重新登录后重试"
          : res.status === 503 ? (data.error ?? "支付服务未配置")
          : (data.error ?? `服务器错误 ${res.status}`);
        setErrorMsg(detail);
        setStep("error");
        return;
      }
      setAmountYuan(data.amountYuan ?? "");
      setQrCodeUrl(data.qrCodeUrl ?? null);
      currentTradeRef.current = data.outTradeNo;
      startPolling(data.outTradeNo);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setErrorMsg(e?.message ?? "网络错误");
      setStep("error");
    } finally {
      if (mountedRef.current) setCreating(false);
    }
  }

  async function queryOnce(tradeNo: string): Promise<boolean> {
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/pay/hupi/query/${tradeNo}`, {
        credentials: "include",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!mountedRef.current || currentTradeRef.current !== tradeNo) return false;
      if (data.status === "paid") {
        stopPolling();
        setStep("success");
        setTimeout(() => onSuccess(data.tier ?? tier), 1500);
        return true;
      }
    } catch {}
    return false;
  }

  function startPolling(tradeNo: string) {
    pollRef.current = setInterval(() => {
      if (!mountedRef.current || currentTradeRef.current !== tradeNo) return;
      queryOnce(tradeNo);
    }, 3000);
  }

  async function checkNow() {
    const tradeNo = currentTradeRef.current;
    if (!tradeNo || checking) return;
    setChecking(true);
    await queryOnce(tradeNo);
    if (mountedRef.current) setChecking(false);
  }

  const planName   = PLAN_NAMES[tier];
  const periodName = PERIOD_NAMES[period];
  const activeType = PAY_TYPES.find(t => t.id === payType)!;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={step === "success" ? undefined : onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h3 className="font-serif font-bold text-foreground text-base">升级 {planName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {periodName}订阅{amountYuan ? ` · ¥${amountYuan}` : ""}
            </p>
          </div>
          {step !== "success" && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-5">

          {/* QR step */}
          {step === "qr" && (
            <div className="flex flex-col items-center gap-4">

              {/* Payment method tabs */}
              <div className="flex w-full rounded-xl overflow-hidden border border-border/40 text-sm font-medium">
                {PAY_TYPES.map(pt => (
                  <button
                    key={pt.id}
                    disabled={creating}
                    onClick={() => { if (pt.id !== payType) setPayType(pt.id); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors ${
                      payType === pt.id ? "text-white" : "text-muted-foreground hover:bg-muted/40"
                    }`}
                    style={payType === pt.id ? { backgroundColor: pt.bgColor } : {}}
                  >
                    <img src={pt.icon} alt="" className="w-4 h-4 rounded-sm object-contain" />
                    {pt.label}
                  </button>
                ))}
              </div>

              {/* QR code */}
              <div className="w-52 h-52 rounded-2xl border-2 border-border/30 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                {creating || !qrCodeUrl ? (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
                ) : (
                  <img
                    src={qrCodeUrl}
                    alt={`${activeType.label}付款码`}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Instructions — mobile vs desktop */}
              {isMobile ? (
                <div className="text-center space-y-2 w-full">
                  <div className="flex items-center justify-center gap-1.5">
                    <SmartphoneNfc className="w-4 h-4 text-[#07c160]" />
                    <p className="text-sm font-medium text-foreground">截图后用微信扫一扫识别</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    长按二维码图片 → 微信「扫一扫」→ 识别图中二维码
                  </p>
                  <p className="text-xs text-muted-foreground/60">二维码 30 分钟内有效</p>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <img src={activeType.icon} alt="" className="w-4 h-4 rounded-sm object-contain" />
                    <p className="text-sm font-medium text-foreground">
                      打开{activeType.label}扫码付款
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">支付成功后自动升级，二维码 30 分钟内有效</p>
                </div>
              )}

              {/* "I already paid" button + live indicator */}
              <div className="flex flex-col items-center gap-2 w-full">
                <button
                  onClick={checkNow}
                  disabled={checking || creating || !qrCodeUrl}
                  className="w-full py-2.5 rounded-xl border-2 border-[#07c160] text-[#07c160] bg-transparent text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#07c160]/8 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checking ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />正在验证支付…</>
                  ) : (
                    <>扫码付款后，点此验证</>
                  )}
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  后台每 3 秒自动检测
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div className="text-center">
                <p className="font-semibold text-foreground">支付成功！</p>
                <p className="text-sm text-muted-foreground mt-1">已升级为 {planName}，正在刷新…</p>
              </div>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-foreground">创建订单失败</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setStep("qr"); createOrder(payType); }}
                className="mt-1 px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted/40 transition-colors"
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

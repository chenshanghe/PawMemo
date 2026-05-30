import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PayDialogProps {
  tier: "pro" | "plus";
  period: "monthly" | "yearly";
  onClose: () => void;
  onSuccess: (tier: string) => void;
}

const PLAN_NAMES: Record<string, string> = {
  pro: "探索家 Pro",
  plus: "旅记大师 Plus",
};

const PERIOD_NAMES: Record<string, string> = {
  monthly: "月度",
  yearly: "年度",
};

type Step = "creating" | "qr" | "polling" | "success" | "error";

export function PayDialog({ tier, period, onClose, onSuccess }: PayDialogProps) {
  const [step, setStep] = useState<Step>("creating");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [outTradeNo, setOutTradeNo] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [amountYuan, setAmountYuan] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    createOrder();
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function createOrder() {
    try {
      const res = await fetch("/api/pay/alipay/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, period }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "创建订单失败");
        setStep("error");
        return;
      }
      if (!mountedRef.current) return;
      setOutTradeNo(data.outTradeNo);
      setMockMode(data.mockMode ?? false);
      setAmountYuan(data.amountYuan ?? "");
      if (data.qrCodeUrl) setQrCodeUrl(data.qrCodeUrl);
      setStep("qr");
      startPolling(data.outTradeNo);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setErrorMsg(e?.message ?? "网络错误");
      setStep("error");
    }
  }

  function startPolling(tradeNo: string) {
    pollRef.current = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const res = await fetch(`/api/pay/alipay/query/${tradeNo}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!mountedRef.current) return;
        if (data.status === "paid") {
          clearInterval(pollRef.current!);
          setStep("success");
          setTimeout(() => {
            onSuccess(data.tier ?? tier);
          }, 1500);
        }
      } catch {}
    }, 3000);
  }

  async function handleMockComplete() {
    if (!outTradeNo) return;
    setStep("polling");
    try {
      const res = await fetch("/api/pay/alipay/mock-complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outTradeNo }),
      });
      const data = await res.json();
      if (data.status === "paid") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("success");
        setTimeout(() => onSuccess(data.tier ?? tier), 1500);
      }
    } catch {
      setStep("qr");
    }
  }

  const planName = PLAN_NAMES[tier];
  const periodName = PERIOD_NAMES[period];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={step === "success" ? undefined : onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h3 className="font-serif font-bold text-foreground text-base">
              升级 {planName}
            </h3>
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

        {/* Body */}
        <div className="p-5">
          {/* Creating */}
          {step === "creating" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">正在生成订单…</p>
            </div>
          )}

          {/* QR / polling */}
          {(step === "qr" || step === "polling") && (
            <div className="flex flex-col items-center gap-4">
              {/* QR code area */}
              <div className="w-48 h-48 rounded-xl border-2 border-border/40 bg-muted/20 flex items-center justify-center overflow-hidden">
                {qrCodeUrl ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="支付宝二维码"
                    className="w-full h-full object-contain p-1"
                  />
                ) : mockMode ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <QrCode className="w-12 h-12 opacity-30" />
                    <span className="text-[10px] text-center px-2">沙箱模式<br />无真实二维码</span>
                  </div>
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
                )}
              </div>

              {/* Instructions */}
              <div className="text-center space-y-1">
                {mockMode ? (
                  <>
                    <p className="text-sm font-medium text-foreground">沙箱测试模式</p>
                    <p className="text-xs text-muted-foreground">
                      尚未配置支付宝密钥，点击下方按钮模拟支付完成
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">打开支付宝扫码付款</p>
                    <p className="text-xs text-muted-foreground">
                      支付后自动升级，二维码 30 分钟内有效
                    </p>
                  </>
                )}
              </div>

              {/* Polling indicator */}
              {step === "polling" ? (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  正在确认支付结果…
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  等待支付中
                </div>
              )}

              {/* Mock complete button */}
              {mockMode && step !== "polling" && (
                <Button
                  size="sm"
                  className="w-full mt-1"
                  onClick={handleMockComplete}
                >
                  模拟支付完成（测试用）
                </Button>
              )}
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div className="text-center">
                <p className="font-semibold text-foreground">支付成功！</p>
                <p className="text-sm text-muted-foreground mt-1">
                  已升级为 {planName}，正在刷新…
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-foreground">创建订单失败</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{errorMsg}</p>
              </div>
              <Button size="sm" variant="outline" onClick={createOrder}>
                重试
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

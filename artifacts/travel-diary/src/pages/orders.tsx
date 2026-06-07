import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Receipt, ChevronLeft, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Order {
  id: number;
  outTradeNo: string;
  tier: string;
  period: string;
  amountCents: number;
  status: string;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const TIER_NAMES: Record<string, string> = {
  pro: "探索家 Pro",
  plus: "旅记大师 Plus",
};

const PERIOD_NAMES: Record<string, string> = {
  monthly: "月度",
  yearly: "年度",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/me/orders`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto pb-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/me" className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="text-xl font-serif font-bold text-foreground">支付记录</h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-4 rounded-2xl border-border/40 shadow-sm overflow-hidden bg-card">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {TIER_NAMES[order.tier] || order.tier} ({PERIOD_NAMES[order.period] || order.period})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), "yyyy年M月d日 HH:mm", { locale: zhCN })}
                    </div>
                    {order.status === "paid" && order.expiresAt && (
                      <div className="text-[11px] text-muted-foreground/80">
                        到期日：{format(new Date(order.expiresAt), "yyyy年M月d日", { locale: zhCN })}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="font-serif font-bold text-primary">
                      ¥{(order.amountCents / 100).toFixed(2)}
                    </div>
                    <div>
                      {order.status === "paid" ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none text-[10px] px-2 py-0">
                          已完成
                        </Badge>
                      ) : order.status === "pending" ? (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-none shadow-none text-[10px] px-2 py-0">
                          待支付
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-none shadow-none text-[10px] px-2 py-0">
                          未完成
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
              <Receipt className="w-6 h-6 opacity-40" />
            </div>
            <p className="text-sm">暂无支付记录</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

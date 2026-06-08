import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CollabAcceptProps {
  params: { token: string };
}

export default function CollabAccept({ params }: CollabAcceptProps) {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [entryId, setEntryId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const accept = async () => {
      try {
        const res = await fetch(`${BASE}/api/entries/collab/${params.token}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.entryId) {
          setEntryId(data.entryId);
          setStatus("success");
          setTimeout(() => setLocation(`/entries/${data.entryId}/edit`), 1800);
        } else {
          setErrorMsg(data.error ?? "邀请链接无效或已过期");
          setStatus("error");
        }
      } catch {
        setErrorMsg("网络错误，请稍后重试");
        setStatus("error");
      }
    };
    accept();
  }, [params.token]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在验证邀请…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">邀请已接受！</p>
              <p className="text-sm text-muted-foreground mt-1">正在跳转到日记编辑页…</p>
            </div>
            {entryId && (
              <Link href={`/entries/${entryId}/edit`}>
                <Button size="sm" variant="outline">立即跳转</Button>
              </Link>
            )}
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">接受邀请失败</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>
            <Link href="/dashboard">
              <Button size="sm" variant="outline">返回首页</Button>
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
}

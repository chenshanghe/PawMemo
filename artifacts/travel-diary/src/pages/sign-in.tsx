import { SignIn } from "@clerk/react";
import { useState, useRef } from "react";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  const [agreed, setAgreed] = useState(false);
  const [shake, setShake] = useState(false);
  const checkboxRef = useRef<HTMLLabelElement>(null);

  const handleBlockedClick = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
    checkboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 gap-4">
      <div className="relative w-full flex justify-center">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
        {!agreed && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={handleBlockedClick}
          />
        )}
      </div>

      <label
        ref={checkboxRef}
        className={`flex items-start gap-2.5 cursor-pointer max-w-sm w-full px-1 transition-transform ${shake ? "animate-shake" : ""}`}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          我已阅读并同意顽童记的{" "}
          <Link href="/privacy" className="text-primary hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
            隐私政策
          </Link>{" "}
          和{" "}
          <Link href="/terms" className="text-primary hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
            用户协议
          </Link>
          ，继续即视为同意
        </span>
      </label>
    </div>
  );
}

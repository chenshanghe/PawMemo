import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function PageSkeleton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-4">
      <img src={`${BASE}/logo.png`} alt="顽童记" className="w-12 h-12 object-contain opacity-80" />
      <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

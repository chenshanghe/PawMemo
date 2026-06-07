import { useState, useEffect, useRef } from "react";

export function useSwUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || cancelled) return;
      regRef.current = reg;

      // Case 1: A SW is already waiting (e.g. page refreshed after new SW installed)
      if (reg.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
        return;
      }

      // Case 2: A new SW just started installing while the page is open
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          // "installed" means the SW finished installing and is now waiting
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    // Periodically ask the browser to check for a new SW (once per hour)
    const checkInterval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    }, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
    };
  }, []);

  const reload = () => {
    const reg = regRef.current;
    if (reg?.waiting) {
      // Tell the waiting SW to activate now, then reload once it takes control
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => window.location.reload(),
        { once: true }
      );
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  return { updateReady, reload };
}

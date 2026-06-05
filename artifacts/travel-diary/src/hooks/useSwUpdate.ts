import { useState, useEffect } from "react";

export function useSwUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Listen for the SW_UPDATED message posted by the new service worker
    // after it activates and calls clients.claim()
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        setUpdateReady(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    // Also catch the case where the SW updated while the page was hidden
    // (controllerchange fires when a new SW takes over)
    const onControllerChange = () => {
      // Only show the banner if this isn't the very first SW install
      // (first install means controller goes from null → SW, not SW → new SW)
      if (navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  const reload = () => window.location.reload();

  return { updateReady, reload };
}

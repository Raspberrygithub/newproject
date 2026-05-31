"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable and works offline-ish.
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration errors */
      });
    }
  }, []);
  return null;
}

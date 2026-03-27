"use client";

import { useEffect } from "react";

export default function PushSwRegister() {
  useEffect(() => {
    async function registerSw() {
      if (!("serviceWorker" in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.log("[sw] registered:", reg.scope);
      } catch (e) {
        console.error("[sw] register error:", e);
      }
    }

    registerSw();
  }, []);

  return null;
}
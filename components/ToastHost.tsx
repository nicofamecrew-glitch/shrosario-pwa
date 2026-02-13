"use client";

import { useEffect, useState } from "react";

type Toast = { message: string; type?: "ok" | "warn" | "error" };

export default function ToastHost() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 2200);
    };
    window.addEventListener("toast", handler);
    return () => window.removeEventListener("toast", handler);
  }, []);

  if (!toast) return null;

    const styles =
    toast.type === "ok"
      ? "border-emerald-500/20 bg-emerald-500/10"
      : toast.type === "warn"
      ? "border-yellow-500/20 bg-yellow-500/10"
      : "border-red-500/20 bg-red-500/10";

  const icon =
    toast.type === "ok" ? "✓" : toast.type === "warn" ? "!" : "×";

  return (
    <div className="fixed top-4 left-1/2 z-[9999] -translate-x-1/2 px-4">
      <div className={`flex items-center gap-2 rounded-full border ${styles} px-4 py-2 text-sm text-white shadow-lg backdrop-blur`}>
        <span className="text-white/80 font-black">{icon}</span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

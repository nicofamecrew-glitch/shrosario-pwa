// components/app/AppBootSplash.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  logoSrc?: string;
  minMs?: number;
  maxMs?: number;
};

export default function AppBootSplash({
  logoSrc = "/brand/sh-logo.png",
  minMs = 350,
  maxMs = 3500,
}: Props) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t0 = performance.now();

    const finish = () => {
      const elapsed = performance.now() - t0;
      const wait = Math.max(0, minMs - elapsed);
      window.setTimeout(() => setShow(false), wait);
    };

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => finish());
      return () => cancelAnimationFrame(raf2);
    });

    const hard = window.setTimeout(() => setShow(false), maxMs);

    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(hard);
    };
  }, [minMs, maxMs]);

  if (!show) return null;

  return (
    <div
  className="fixed inset-0 z-[9999] flex items-center justify-center bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]"
  aria-label="Cargando"


    >
      <div className="flex flex-col items-center gap-4">
        <img
          src={logoSrc}
          alt="SH Rosario"
          className="h-16 w-auto"
          draggable={false}
        />
        <div className="h-1 w-24 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full w-1/2 animate-pulse bg-white/60" />
        </div>
      </div>
    </div>
  );
}

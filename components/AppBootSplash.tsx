"use client";

import { useEffect, useState } from "react";

type Props = {
  logoSrc?: string;
  minMs?: number;
  maxMs?: number;
};

export default function AppBootSplash({
  logoSrc = "/brand/sh-logo.png",
  minMs = 900,
  maxMs = 2500,
}: Props) {
  const [show, setShow] = useState(true);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t0 = performance.now();

    const start = window.setTimeout(() => {
      setEntered(true);
    }, 30);

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
      window.clearTimeout(start);
      cancelAnimationFrame(raf1);
      window.clearTimeout(hard);
    };
  }, [minMs, maxMs]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      aria-label="Cargando"
    >
      <div className="flex flex-col items-center justify-center">
        <img
          src={logoSrc}
          alt="SH Rosario"
          draggable={false}
          className={[
            "w-[160px] h-auto object-contain select-none",
            "transition-all duration-700 ease-out",
            entered
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";

type Props = {
  logoLightSrc?: string;
  logoDarkSrc?: string;
  minMs?: number;
  maxMs?: number;
};
export default function AppBootSplash({
  logoLightSrc = "/brand/sh-logo-light.png",
  logoDarkSrc = "/brand/sh-logo-dark.png",
  minMs = 1200,
  maxMs = 2600,
}: Props) {
  const [show, setShow] = useState(true);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const start = window.setTimeout(() => {
      setEntered(true);
    }, 40);

    const leave = window.setTimeout(() => {
      setLeaving(true);
    }, Math.max(700, minMs - 260));

    const hide = window.setTimeout(() => {
      setShow(false);
    }, minMs);

    const hard = window.setTimeout(() => {
      setLeaving(true);
      setShow(false);
    }, maxMs);

    return () => {
      window.clearTimeout(start);
      window.clearTimeout(leave);
      window.clearTimeout(hide);
      window.clearTimeout(hard);
    };
  }, [minMs, maxMs]);

  if (!show) return null;

  return (
    <div
      aria-label="Cargando"
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden",
       "bg-white text-black transition-opacity duration-500 ease-out dark:bg-black dark:text-white",
        leaving ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      {/* halo rosa sutil */}
            <div
        className={[
          "absolute inset-0 transition-all duration-1000 ease-out",
          entered ? "opacity-100 scale-100" : "opacity-0 scale-75",
        ].join(" ")}
      >
        <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ee078e]/10 blur-3xl dark:bg-[#ee078e]/20" />
      </div>

      {/* logo */}
      <div className="relative flex items-center justify-center">
        <div
          className={[
            "overflow-hidden transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            entered ? "w-[176px] opacity-100" : "w-0 opacity-0",
          ].join(" ")}
        >
                  <img
            src={logoLightSrc}
            alt="SH Rosario"
            draggable={false}
            className={[
              "block h-auto w-[176px] object-contain select-none dark:hidden",
              "transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              entered ? "scale-100 blur-0" : "scale-125 blur-[2px]",
              leaving ? "scale-105 opacity-95" : "opacity-100",
            ].join(" ")}
          />

          <img
            src={logoDarkSrc}
            alt="SH Rosario"
            draggable={false}
            className={[
              "hidden h-auto w-[176px] object-contain select-none dark:block",
              "transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              entered ? "scale-100 blur-0" : "scale-125 blur-[2px]",
              leaving ? "scale-105 opacity-95" : "opacity-100",
            ].join(" ")}
          />
          
        </div>
      </div>
    </div>
  );
}
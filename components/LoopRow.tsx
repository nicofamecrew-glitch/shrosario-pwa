"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props<T> = {
  items: T[];
  renderItem: (item: T, idx: number) => React.ReactNode;
  showDots?: boolean;
  autoScroll?: boolean;
  speedPxPerSec?: number;
  fadeEdges?: boolean;
};

export default function LoopRow<T>({
  items,
  renderItem,
  showDots = true,
  autoScroll = true,
  speedPxPerSec = 22,
  fadeEdges = true,
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  const tickingRef = useRef(false);
  const jumpingRef = useRef(false);

  const pointerDownRef = useRef(false);

  // Dirección que sigue el autoplay (1 = derecha, -1 = izquierda)
  const autoDirRef = useRef<1 | -1>(1);
  const lastScrollLeftRef = useRef(0);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // 🔁 duplicamos 5x para margen infinito
  const loopItems = useMemo(() => {
    if (items.length < 2) return items;
    return Array(5).fill(items).flat();
  }, [items]);

  const computeActive = (el: HTMLDivElement) => {
    if (items.length < 2) {
      setActive(0);
      return;
    }

    const segment = el.scrollWidth / 5;
    const firstCard = el.querySelector<HTMLElement>("[data-loop-card='1']");
    const w = firstCard?.offsetWidth || 160;
    const gap = 12;
    const step = w + gap;

    const x = el.scrollLeft - segment * 2;
    const idx = ((Math.round(x / step) % items.length) + items.length) % items.length;
    setActive(idx);
  };

  // ✅ arrancar centrado
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || items.length < 2) return;

    requestAnimationFrame(() => {
      const segment = el.scrollWidth / 5;

      const prevBehavior = el.style.scrollBehavior;
      const prevSnap = el.style.scrollSnapType;

      el.style.scrollBehavior = "auto";
      el.style.scrollSnapType = "none";

      el.scrollLeft = segment * 2;
      lastScrollLeftRef.current = el.scrollLeft;

      requestAnimationFrame(() => {
        el.style.scrollBehavior = prevBehavior || "";
        el.style.scrollSnapType = prevSnap || "";
        computeActive(el);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ✅ scroll handler + normalización (infinito real ambos lados)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || items.length < 2) return;

    const onScroll = () => {
      if (jumpingRef.current || tickingRef.current) return;

      tickingRef.current = true;
      requestAnimationFrame(() => {
        tickingRef.current = false;
        if (!el) return;

        const segment = el.scrollWidth / 5;

        // Capturar dirección SOLO si el usuario está interactuando
        if (pointerDownRef.current) {
          const dx = el.scrollLeft - lastScrollLeftRef.current;
          if (Math.abs(dx) > 0.5) autoDirRef.current = dx > 0 ? 1 : -1;
        }
        lastScrollLeftRef.current = el.scrollLeft;

        // Normalizar al segmento central
        const raw = el.scrollLeft;
        const rel = ((raw - segment * 2) % segment + segment) % segment; // 0..segment
        const target = segment * 2 + rel;

        if (Math.abs(target - raw) > 0.5) {
          jumpingRef.current = true;

          const prevBehavior = el.style.scrollBehavior;
          const prevSnap = el.style.scrollSnapType;

          el.style.scrollBehavior = "auto";
          el.style.scrollSnapType = "none";
          el.scrollLeft = target;

          requestAnimationFrame(() => {
            el.style.scrollBehavior = prevBehavior || "";
            el.style.scrollSnapType = prevSnap || "";
            jumpingRef.current = false;

            lastScrollLeftRef.current = el.scrollLeft;
            computeActive(el);
          });

          return;
        }

        computeActive(el);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ✅ autoplay acompaña la última dirección del usuario
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !autoScroll || items.length < 2) return;

    const tick = (ts: number) => {
      if (!el) return;

      if (paused || pointerDownRef.current) {
        lastTsRef.current = ts;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const last = lastTsRef.current || ts;
      const dt = Math.min(48, ts - last);
      lastTsRef.current = ts;

      el.scrollLeft += autoDirRef.current * (speedPxPerSec / 1000) * dt;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = 0;
    };
  }, [autoScroll, paused, items.length, speedPxPerSec]);

  const snapClass = paused ? "snap-x snap-proximity" : "snap-none";

  const maskStyle = fadeEdges
    ? ({
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
      } as React.CSSProperties)
    : undefined;

  return (
    <div>
      <div
        ref={scrollerRef}
        className={`mt-3 -mx-4 px-4 overflow-x-auto no-scrollbar overscroll-x-contain ${snapClass}`}
        style={maskStyle}
        onPointerDown={() => {
          pointerDownRef.current = true;
          setPaused(true);
        }}
        onPointerUp={() => {
          pointerDownRef.current = false;
          setTimeout(() => setPaused(false), 120);
        }}
        onPointerCancel={() => {
          pointerDownRef.current = false;
          setTimeout(() => setPaused(false), 120);
        }}
      >
        <div className="flex gap-3">
          {loopItems.map((it, idx) => (
            <div key={idx} data-loop-card={idx === 0 ? "1" : undefined}>
              {renderItem(it, idx)}
            </div>
          ))}
        </div>
      </div>

      {showDots && items.length > 1 ? (
        <div className="mt-3 flex justify-center gap-2 md:hidden">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === active ? "bg-[#ee078e]" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
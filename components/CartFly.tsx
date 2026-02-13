"use client";

import { useEffect, useState } from "react";

type FlyPayload = { x: number; y: number; img?: string };

export default function CartFly() {
  const [fly, setFly] = useState<{
    id: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    img?: string;
  } | null>(null);

  useEffect(() => {
    const onFly = (ev: Event) => {
      const e = ev as CustomEvent<FlyPayload>;
      const { x, y, img } = e.detail || ({} as any);

      const targetEl = document.querySelector("[data-cart-target]") as HTMLElement | null;
      const tr = targetEl?.getBoundingClientRect();

      // destino = centro del botón carrito (viewport coords)
const toX = tr ? tr.left + tr.width / 2 : window.innerWidth / 2;

// “Boca” del carrito: un poco más arriba del centro
const toY = tr ? tr.top + tr.height * 0.35 : window.innerHeight - 120;

// micro ajuste fino (probá entre -8 y -18)
const aimOffsetY = -20;
const aimOffsetX = -20;


      setFly({
        id: Date.now(),
        fromX: x,
        fromY: y,
       toX: toX + aimOffsetX,
  toY: toY + aimOffsetY,
        img,
      });

      // efecto “impacto” al llegar (Candy-ish)
      if (targetEl) {
        targetEl.animate(
          [
            { transform: "translateY(-38px) scale(1)" },
            { transform: "translateY(-38px) scale(1.08)" },
            { transform: "translateY(-38px) scale(1)" },
          ],
          { duration: 220, easing: "cubic-bezier(.2,.9,.2,1)", delay: 720 }
        );
      }
    };

    window.addEventListener("cart:fly", onFly as any);
    return () => window.removeEventListener("cart:fly", onFly as any);
  }, []);

  useEffect(() => {
    if (!fly) return;

    const el = document.getElementById("cart-fly-dot");
    if (!el) return;

    // IMPORTANTÍSIMO: position FIXED => NO sumar scrollY
 const duration = 4500; // más lento

const midX = (fly.fromX + fly.toX) / 2;

// altura del arco (más alto = más candy)
const arcUp = Math.min(260, Math.max(140, Math.abs(fly.fromY - fly.toY) * 0.35));
const midY = Math.min(fly.fromY, fly.toY) - arcUp;

el.animate(
  [
    { transform: `translate(${fly.fromX}px, ${fly.fromY}px) scale(1)`, opacity: 1 },
    { transform: `translate(${midX}px, ${midY}px) scale(0.9)`, opacity: 0.95 },
    { transform: `translate(${fly.toX}px, ${fly.toY}px) scale(0.35)`, opacity: 0.35 },
    { transform: `translate(${fly.toX}px, ${fly.toY}px) scale(0.18)`, opacity: 0.12 },
  ],
  { duration, easing: "cubic-bezier(.2,.9,.2,1)" }
);

const t = setTimeout(() => setFly(null), duration + 40);

    return () => clearTimeout(t);
  }, [fly?.id]);

  if (!fly) return null;

  return (
    <div
      id="cart-fly-dot"
      className="fixed left-0 top-0 z-[9999] pointer-events-none"
      style={{ transform: `translate(${fly.fromX}px, ${fly.fromY}px)` }}
    >
      {fly.img ? (
        // eslint-disable-next-line @next/next/no-img-element
       <img
  src={fly.img}
  alt=""
  className="
    h-20 w-20
    object-contain
    drop-shadow-[0_16px_30px_rgba(0,0,0,0.45)]
  "
/>

      ) : (
        <div className="h-4 w-4 rounded-full bg-[#ee078e] shadow-[0_12px_25px_rgba(0,0,0,0.35)]" />
      )}
    </div>
  );
}

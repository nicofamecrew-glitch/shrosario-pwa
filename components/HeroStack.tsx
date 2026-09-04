"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getFlashWindow } from "@/lib/flashSale";

type HeroCard = {
  key: string;
  href: string;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  flash?: boolean;
};

const cards: HeroCard[] = [
  {
    key: "compra",
    href: "/catalog",
    image: "/home/hero-compra.webp",
    eyebrow: "SH Rosario",
    title: "Comprá productos profesionales desde tu celular",
    subtitle: "Armá tu pedido en minutos, sin perder tiempo en el salón.",
    cta: "Ver productos",
  },
  {
    key: "ticket",
    href: "/ticket",
    image: "/home/hero-ticket.webp",
    eyebrow: "Herramientas para tu salón",
    title: "Armá tus tickets y compartilos por WhatsApp",
    subtitle: "Cargá servicios, precios y enviá el detalle a tu cliente.",
    cta: "Abrir Ticketera",
  },
  {
    key: "flash",
    href: "/flash",
    image: "/home/hero-flash.webp",
    eyebrow: "Oferta Relámpago",
    title: "10% OFF en 10 productos",
    subtitle: "Una selección especial que cambia cada 72 horas.",
    cta: "Ver ofertas",
    flash: true,
  },
];

function FlashCountdown() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setMounted(true);

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  const text = useMemo(() => {
    if (!mounted) return "72:00:00";

    const { endsAt } = getFlashWindow(now);
    const remaining = Math.max(0, endsAt - now);

    const totalSeconds = Math.floor(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
  }, [mounted, now]);

  return (
    <div className="mt-3 inline-flex rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-black tracking-[0.12em] text-white backdrop-blur">
      {text}
    </div>
  );
}

export default function HeroStack() {
  return (
    <section className="relative mt-2">
      {cards.map((card, index) => (
        <div
          key={card.key}
          className="sticky"
          style={{
  top: `${72 + index * 10}px`,
  zIndex: 10 + index,
  paddingBottom: index === cards.length - 1 ? "8px" : "10px",
}}
        >
          <Link
            href={card.href}
            className="
              relative block h-[235px] overflow-hidden rounded-[28px]
              border border-white/10 bg-black
              shadow-[0_18px_45px_rgba(0,0,0,0.28)]
              active:scale-[0.995] transition-transform
            "
          >
            <img
              src={card.image}
              alt={card.title}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/5" />

            <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-center p-5 text-white">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ee078e]">
                {card.eyebrow}
              </div>

              <h2 className="mt-2 text-[23px] font-black leading-[1.02]">
                {card.title}
              </h2>

              <p className="mt-2 text-[12px] leading-relaxed text-white/70">
                {card.subtitle}
              </p>

              {card.flash ? <FlashCountdown /> : null}

              <div className="mt-4 inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-xs font-black text-black">
                {card.cta} →
              </div>
            </div>
          </Link>
        </div>
      ))}
    </section>
  );
}
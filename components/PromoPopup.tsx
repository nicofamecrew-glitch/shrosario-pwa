"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type PromoPopupProps = {
  promoId: string;
  cooldownHours?: number;
  alwaysShow?: boolean;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  waNumberE164?: string;
  waText?: string;
};

export default function PromoPopup({
  promoId,
  cooldownHours = 96,
  alwaysShow = false,
  imageUrl,
  title = "Protegé tu cabello del calor",
  subtitle = "Nuevo Protector Térmico Vexa con biotina y pantenol. Protección hasta 230 °C, sin enjuague.",
  ctaLabel = "Ver producto",
  ctaHref = "/p/vexa-protector-termico-therapy",
  waNumberE164,
  waText = "Hola, vengo desde la app SH Rosario. Quiero consultar por el nuevo Protector Térmico Vexa Biotina Therapy.",
}: PromoPopupProps) {
  const storageKey = useMemo(() => `promo_seen_${promoId}`, [promoId]);

  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (alwaysShow) {
      setOpen(true);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      const lastSeenAt = raw ? Number(raw) : 0;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const now = Date.now();

      if (!lastSeenAt || now - lastSeenAt > cooldownMs) {
        setOpen(true);
        localStorage.setItem(storageKey, String(now));
      }
    } catch {
      setOpen(true);
    }
  }, [storageKey, cooldownHours, alwaysShow]);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const waHref = waNumberE164
    ? `https://wa.me/${waNumberE164}?text=${encodeURIComponent(waText)}`
    : null;

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Fondo */}
      <button
        aria-label="Cerrar promo"
        onClick={close}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Popup */}
      <div className="relative w-full max-w-[390px] max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
        
        {/* Cerrar flotante */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-sm font-bold text-white backdrop-blur-md transition hover:bg-[#ee078e]"
        >
          ✕
        </button>

        {/* Imagen 1:1 */}
        {imageUrl && imgOk && (
          <div className="relative aspect-square w-full overflow-hidden bg-white">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              onError={() => setImgOk(false)}
            />

            {/* degradado para integrar imagen y contenido */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
          </div>
        )}

        {/* Contenido */}
        <div className="relative -mt-1 bg-black px-5 pb-5 pt-3">
          
          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-[#ee078e]/40 bg-[#ee078e]/15 px-3 py-1 text-[10px] font-extrabold tracking-[0.12em] text-[#ff3ca6]">
            NUEVO EN SH ROSARIO
          </div>

          {/* Título */}
          <h3 className="mt-3 text-[22px] font-black leading-[1.05] tracking-tight text-white">
            {title}
          </h3>

          {/* Descripción */}
          <p className="mt-2 text-[13px] leading-relaxed text-white/65">
            {subtitle}
          </p>

          {/* CTA principal */}
          <a
            href={ctaHref}
            onClick={close}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#ee078e] px-4 py-3.5 text-center text-sm font-extrabold text-white shadow-[0_8px_30px_rgba(238,7,142,0.25)] transition active:scale-[0.98]"
          >
            {ctaLabel}
          </a>

          {/* Acciones secundarias */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="text-white/70 transition hover:text-white"
              >
                Consultar por WhatsApp
              </a>
            )}

            {waHref && <span className="text-white/20">•</span>}

            <button
              onClick={close}
              className="text-white/40 transition hover:text-white/70"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
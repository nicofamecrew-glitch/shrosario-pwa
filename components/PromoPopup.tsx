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
  cooldownHours = 72,
  alwaysShow = false,
  imageUrl,
  title = "Promo de la semana",
  subtitle = "Aprovechá antes de que vuele el stock.",
  ctaLabel = "Ver promo",
  ctaHref = "/catalog",
  waNumberE164,
  waText = "Hola, vengo desde la app SH Rosario. Quiero info de la promo.",
}: PromoPopupProps) {
  const storageKey = useMemo(() => `promo_seen_${promoId}`, [promoId]);

  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [mounted, setMounted] = useState(false);

  // mount guard (evita problemas con document/body)
  useEffect(() => {
    setMounted(true);
  }, []);

  // decide si abre
  useEffect(() => {
    if (alwaysShow) {
      setOpen(true);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setOpen(true);
        return;
      }
      const last = Number(raw);
      const diffMs = Date.now() - last;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      if (diffMs > cooldownMs) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey, cooldownHours, alwaysShow]);

  function close() {
    setOpen(false);

    if (alwaysShow) return;

    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {}
  }

  // lock scroll cuando está abierto
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
      {/* overlay */}
      <button
        aria-label="Cerrar promo"
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {imageUrl && imgOk && (
          <div className="bg-black">
            <img
              src={imageUrl}
              alt=""
              className="h-44 w-full object-cover"
              loading="eager"
              onError={() => setImgOk(false)}
            />
          </div>
        )}

        <div className="relative bg-black px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center rounded-full bg-[#ee078e]/90 px-3 py-1 text-xs font-extrabold text-white">
                PROMO ACTIVA
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-white leading-tight">
                {title}
              </h3>
              <p className="mt-1 text-sm text-white/80">{subtitle}</p>
            </div>

            <button
              onClick={close}
              className="rounded-full bg-[#ee078e]/90 px-3 py-1 text-sm font-bold text-white hover:bg-white/20"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-2">
            <a
              href={ctaHref}
              onClick={close}
              className="w-full rounded-2xl bg-black px-4 py-3 text-center text-sm font-extrabold text-white shadow-sm active:scale-[0.99]"
            >
              {ctaLabel}
            </a>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-center text-sm font-extrabold text-black shadow-sm active:scale-[0.99]"
              >
                Consultar por WhatsApp
              </a>
            )}

            <button
              onClick={close}
              className="w-full rounded-2xl px-4 py-2 text-center text-sm font-semibold text-black/60 hover:bg-black/5"
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

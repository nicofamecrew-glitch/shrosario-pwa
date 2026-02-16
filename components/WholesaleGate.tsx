"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCartStore } from "@/lib/store";
import { validateWholesaleCode } from "@/lib/wholesale";

export default function WholesaleGate() {
  const { isWholesale, setWholesale } = useCartStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock scroll + ESC para cerrar
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onClose() {
    setOpen(false);
    setCode("");
    setError("");
  }

  function handleSubmit() {
    if (validateWholesaleCode(code)) {
      setWholesale(true);
      onClose();
      return;
    }
    setError("Codigo incorrecto.");
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* overlay */}
            <button
              aria-label="Cerrar"
              className="absolute inset-0 bg-black/70"
              onClick={onClose}
            />

            {/* dialog */}
            <div className="relative w-full max-w-sm rounded-2xl border border-panel bg-surface p-6 shadow-2xl">
              <h3 className="text-lg font-semibold">Acceso mayorista</h3>
              <p className="mt-2 text-sm text-muted">
                Ingresa el codigo secreto para ver precios y combos mayoristas.
              </p>

              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-4 w-full rounded-lg border border-panel bg-ink px-3 py-2 text-sm"
                placeholder="Codigo"
                autoFocus
              />

              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                  onClick={handleSubmit}
                >
                  Validar
                </button>
                <button
                  className="flex-1 rounded-full border border-panel px-4 py-2 text-sm"
                  onClick={onClose}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div>
      <button
        className="rounded-full border border-panel px-4 py-2 text-sm"
        onClick={() => setOpen(true)}
      >
        {isWholesale ? "Modo mayorista activo" : "Activar mayorista"}
      </button>

      {modal}
    </div>
  );
}

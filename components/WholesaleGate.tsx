"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/store";
import { validateWholesaleCode } from "@/lib/wholesale";

export default function WholesaleGate() {
  const { isWholesale, setWholesale } = useCartStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (validateWholesaleCode(code)) {
      setWholesale(true);
      setOpen(false);
      setCode("");
      setError("");
      return;
    }
    setError("Codigo incorrecto.");
  };

  return (
    <div>
      <button
        className="rounded-full border border-panel px-4 py-2 text-sm"
        onClick={() => setOpen(true)}
      >
        {isWholesale ? "Modo mayorista activo" : "Activar mayorista"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-panel bg-surface p-6">
            <h3 className="text-lg font-semibold">Acceso mayorista</h3>
            <p className="mt-2 text-sm text-muted">
              Ingresa el codigo secreto para ver precios y combos mayoristas.
            </p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-4 w-full rounded-lg border border-panel bg-ink px-3 py-2 text-sm"
              placeholder="Codigo"
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
                onClick={() => {
                  setOpen(false);
                  setCode("");
                  setError("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

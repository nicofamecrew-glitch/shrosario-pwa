"use client";

import { useMemo, useState } from "react";
import { useCartStore, useWholesaleStore } from "@/lib/store";

const conds = [
  "Responsable Inscripto",
  "Monotributo",
  "Exento",
  "Consumidor Final",
];

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export default function WholesalePage() {
  const { setWholesale } = useCartStore();
  const { status, request, submit, reset } = useWholesaleStore();

  const [cuit, setCuit] = useState(request?.cuit ?? "");
  const [razonSocial, setRazonSocial] = useState(request?.razonSocial ?? "");
  const [condicionFiscal, setCondicionFiscal] = useState(
    request?.condicionFiscal ?? conds[0]
  );
  const [ciudad, setCiudad] = useState(request?.ciudad ?? "");
  const [telefono, setTelefono] = useState(request?.telefono ?? "");

  const cuitDigits = useMemo(() => onlyDigits(cuit), [cuit]);
  const phoneDigits = useMemo(() => onlyDigits(telefono), [telefono]);

  const canSubmit =
    status === "none" &&
    cuitDigits.length >= 11 &&
    razonSocial.trim().length >= 3 &&
    ciudad.trim().length >= 2 &&
    phoneDigits.length >= 8;

  const page =
    "min-h-[100svh] px-4 pt-16 pb-24 bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]";

  const muted = "text-[hsl(var(--app-muted))]";
  const mutedSoft = "text-[hsl(var(--app-muted-2))]";

  const panel =
    "rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] p-4 shadow-sm";

  const label =
    "text-xs uppercase tracking-wide text-[hsl(var(--app-muted))]";

  const input =
    "mt-2 w-full rounded-xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] px-3 py-2 text-sm text-[hsl(var(--app-fg))] placeholder:text-[hsl(var(--app-muted-2))] outline-none transition focus:border-[hsl(var(--app-fg))]";

  const help = "mt-1 text-xs text-[hsl(var(--app-muted-2))]";

  const selectClass =
    "mt-2 w-full rounded-xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] px-3 py-2 text-sm text-[hsl(var(--app-fg))] outline-none transition focus:border-[hsl(var(--app-fg))]";

  return (
    <main className={page}>
      <h1 className="text-xl font-bold">Mayorista</h1>
      <p className={`mt-1 text-sm ${muted}`}>
        Pedí acceso a precios mayoristas. Respuesta manual.
      </p>

      {status === "approved" ? (
        <div className={`mt-6 ${panel}`}>
          <div className="text-sm font-semibold">Acceso mayorista activo ✅</div>
          <p className={`mt-1 text-sm ${muted}`}>
            Ya estás viendo precios mayoristas en el catálogo.
          </p>

          <button
            onClick={() => {
              setWholesale(false);
              reset();
            }}
            className="mt-4 inline-flex rounded-full border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] px-4 py-2 text-sm font-medium text-[hsl(var(--app-fg))] transition hover:opacity-90"
          >
            Quitar acceso (reset)
          </button>
        </div>
      ) : status === "pending" ? (
        <div className={`mt-6 ${panel}`}>
          <div className="text-sm font-semibold">Solicitud enviada ⏳</div>
          <p className={`mt-1 text-sm ${muted}`}>
            Estado: pendiente. Te habilitamos cuando validemos los datos.
          </p>

          <div className={`mt-4 text-xs leading-6 ${mutedSoft}`}>
            CUIT: {request?.cuit}
            <br />
            Razón social: {request?.razonSocial}
            <br />
            Condición: {request?.condicionFiscal}
            <br />
            Ciudad: {request?.ciudad}
            <br />
            Teléfono: {request?.telefono}
          </div>

          <button
            onClick={() => {
              setWholesale(false);
              reset();
            }}
            className="mt-4 inline-flex rounded-full border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] px-4 py-2 text-sm font-medium text-[hsl(var(--app-fg))] transition hover:opacity-90"
          >
            Editar datos (reset)
          </button>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canSubmit) return;

            const res = await fetch("/api/wholesale", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cuit: cuitDigits,
                razonSocial: razonSocial.trim(),
                condicionFiscal,
                ciudad: ciudad.trim(),
                telefono: phoneDigits,
              }),
            });

            if (!res.ok) {
              window.dispatchEvent(
                new CustomEvent("toast", {
                  detail: {
                    message: "No pudimos enviar la solicitud. Probá de nuevo.",
                    kind: "error",
                  },
                })
              );
              return;
            }

            submit({
              cuit: cuitDigits,
              razonSocial: razonSocial.trim(),
              condicionFiscal,
              ciudad: ciudad.trim(),
              telefono: phoneDigits,
            });

            window.dispatchEvent(
              new CustomEvent("toast", {
                detail: {
                  message: "Solicitud enviada",
                  kind: "success",
                },
              })
            );
          }}
        >
          <div>
            <label className={label}>CUIT</label>
            <input
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              inputMode="numeric"
              className={input}
              placeholder="Ej: 20301234567"
            />
            <p className={help}>Mínimo 11 dígitos.</p>
          </div>

          <div>
            <label className={label}>Razón social</label>
            <input
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className={input}
              placeholder="Ej: Peluquería X SRL"
            />
          </div>

          <div>
            <label className={label}>Condición fiscal</label>
            <select
              value={condicionFiscal}
              onChange={(e) => setCondicionFiscal(e.target.value)}
              className={selectClass}
            >
              {conds.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label}>Ciudad</label>
            <input
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className={input}
              placeholder="Ej: Rosario"
            />
          </div>

          <div>
            <label className={label}>Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              inputMode="tel"
              className={input}
              placeholder="Ej: 3411234567"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
              canSubmit
                ? "bg-[hsl(var(--app-fg))] text-[hsl(var(--app-bg))] hover:opacity-90"
                : "border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] text-[hsl(var(--app-muted-2))]"
            }`}
          >
            Enviar solicitud
          </button>
        </form>
      )}
    </main>
  );
}
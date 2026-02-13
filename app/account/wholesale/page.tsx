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
  const [razonSocial, setRazonSocial] = useState(
    request?.razonSocial ?? ""
  );
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

  return (
    <main className="px-4 pt-16 pb-24">
      <h1 className="text-xl font-bold">Mayorista</h1>
      <p className="mt-1 text-sm text-white/60">
        Pedí acceso a precios mayoristas. Respuesta manual.
      </p>

      {/* ================= APPROVED ================= */}
      {status === "approved" ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">
            Acceso mayorista activo ✅
          </div>
          <p className="mt-1 text-sm text-white/60">
            Ya estás viendo precios mayoristas en el catálogo.
          </p>

          <button
            onClick={() => {
              setWholesale(false);
              reset();
            }}
            className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm"
          >
            Quitar acceso (reset)
          </button>
        </div>
      ) : status === "pending" ? (
        /* ================= PENDING ================= */
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">
            Solicitud enviada ⏳
          </div>
          <p className="mt-1 text-sm text-white/60">
            Estado: pendiente. Te habilitamos cuando validemos
            los datos.
          </p>

          <div className="mt-4 text-xs text-white/50">
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
            className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm"
          >
            Editar datos (reset)
          </button>
        </div>
      ) : (
        /* ================= FORM ================= */
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
                    message:
                      "No pudimos enviar la solicitud. Probá de nuevo.",
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
            <label className="text-xs uppercase tracking-wide text-white/60">
              CUIT
            </label>
            <input
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              inputMode="numeric"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              placeholder="Ej: 20301234567"
            />
            <p className="mt-1 text-xs text-white/40">
              Mínimo 11 dígitos.
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/60">
              Razón social
            </label>
            <input
              value={razonSocial}
              onChange={(e) =>
                setRazonSocial(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              placeholder="Ej: Peluquería X SRL"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/60">
              Condición fiscal
            </label>
            <select
              value={condicionFiscal}
              onChange={(e) =>
                setCondicionFiscal(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-panel bg-ink px-3 py-2 text-sm text-white [color-scheme:dark]"
            >
              {conds.map((c) => (
                <option
                  key={c}
                  value={c}
                  className="bg-ink text-white"
                >
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/60">
              Ciudad
            </label>
            <input
              value={ciudad}
              onChange={(e) =>
                setCiudad(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              placeholder="Ej: Rosario"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/60">
              Teléfono
            </label>
            <input
              value={telefono}
              onChange={(e) =>
                setTelefono(e.target.value)
              }
              inputMode="tel"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              placeholder="Ej: 3411234567"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-full px-4 py-3 text-sm font-semibold ${
              canSubmit
                ? "bg-accent text-black"
                : "border border-white/10 text-white/40"
            }`}
          >
            Enviar solicitud
          </button>
        </form>
      )}
    </main>
  );
}

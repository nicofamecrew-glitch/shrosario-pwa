"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Send, ReceiptText } from "lucide-react";

type TicketItem = {
  id: number;
  description: string;
  price: number;
};

export default function TicketPage() {
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState<TicketItem[]>([]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );

  const addItem = () => {
    const value = Number(price.replace(",", "."));

    if (!description.trim() || !Number.isFinite(value) || value <= 0) return;

    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: description.trim(),
        price: value,
      },
    ]);

    setDescription("");
    setPrice("");
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const sendWhatsApp = () => {
    if (!items.length) return;

    const lines = items
      .map(
        (item) =>
          `• ${item.description}: ${item.price.toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
          })}`
      )
      .join("\n");

    const totalText = total.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

    const message = [
      "✂️ *Detalle del servicio*",
      "",
      clientName.trim() ? `Cliente: ${clientName.trim()}` : "",
      "",
      lines,
      "",
      `*Total: ${totalText}*`,
      "",
      "Gracias por tu visita.",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <main className="min-h-screen bg-white px-4 pb-32 pt-6 text-black dark:bg-black dark:text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <ReceiptText size={25} />
            <h1 className="text-2xl font-black">Ticketera</h1>
          </div>

          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Armá el detalle del servicio y envialo por WhatsApp.
          </p>
        </div>

        <section className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
          <label className="text-xs font-semibold text-black/50 dark:text-white/50">
            Cliente
          </label>

          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nombre del cliente"
            className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-3 outline-none dark:border-white/10 dark:bg-black"
          />

          <div className="mt-4 grid grid-cols-[1fr_110px] gap-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Corte"
              className="h-12 min-w-0 rounded-xl border border-black/10 bg-white px-3 outline-none dark:border-white/10 dark:bg-black"
            />

            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="$ Precio"
              className="h-12 min-w-0 rounded-xl border border-black/10 bg-white px-3 outline-none dark:border-white/10 dark:bg-black"
            />
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black font-bold text-white active:scale-[0.99] dark:bg-white dark:text-black"
          >
            <Plus size={18} />
            Agregar servicio
          </button>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Detalle</h2>
            <span className="text-xs text-black/40 dark:text-white/40">
              {items.length} {items.length === 1 ? "servicio" : "servicios"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-black/15 p-8 text-center text-sm text-black/40 dark:border-white/15 dark:text-white/40">
              Todavía no agregaste servicios.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[18px] border border-black/10 p-4 dark:border-white/10"
                >
                  <div>
                    <div className="font-semibold">{item.description}</div>
                    <div className="mt-1 text-sm text-black/50 dark:text-white/50">
                      {item.price.toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-black/5 dark:bg-white/10"
                    aria-label="Eliminar servicio"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 rounded-[22px] bg-black p-5 text-white dark:bg-white dark:text-black">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-60">Total</span>
            <span className="text-2xl font-black">
              {total.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
              })}
            </span>
          </div>

          <button
            type="button"
            disabled={!items.length}
            onClick={sendWhatsApp}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ee078e] font-bold text-white disabled:opacity-40"
          >
            <Send size={18} />
            Enviar por WhatsApp
          </button>
        </div>
      </div>
    </main>
  );
}
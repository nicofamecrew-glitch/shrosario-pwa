"use client";

import { useState, type FormEvent } from "react";

type Match = { productId: string; name: string; brand: string; sku: string; size: string; stock: number | string | null };
type Result = { ok: boolean; status?: string; quantity?: number | null; matches?: Match[]; totalMatches?: number; question?: string | null; error?: string };
type Message = { role: "user" | "assistant"; text: string; matches?: Match[] };

export default function SalesAssistantLabPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Soy el prototipo del vendedor SH. Busco productos reales en el catálogo. Probá: «3 shampoos Ossono de 1000 ml». Todavía no tomo pedidos ni asesoro tratamientos." },
  ]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query || loading) return;
    setInput("");
    setMessages(old => [...old, { role: "user", text: query }]);
    setLoading(true);
    try {
      const response = await fetch("/api/sales-assistant/search?q=" + encodeURIComponent(query), { cache: "no-store" });
      const data: Result = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No pude consultar el catálogo");
      const found = data.matches ?? [];
      const header = data.status === "exact" ? "Encontré esta variante en el catálogo." :
        data.status === "ambiguous" ? "Encontré varias variantes posibles, pero todavía no elegí ninguna." :
        data.status === "not_found" ? "No encontré una coincidencia exacta." :
        "Necesito más datos para buscar.";
      const text = header + (data.quantity ? " Cantidad solicitada: " + data.quantity + "." : "") +
        (data.question ? " " + data.question : "") +
        (data.totalMatches && data.totalMatches > found.length ? " Mostrando las primeras " + found.length + " de " + data.totalMatches + "." : "");
      setMessages(old => [...old, { role: "assistant", text, matches: found }]);
    } catch (error) {
      setMessages(old => [...old, { role: "assistant", text: (error instanceof Error ? error.message : "Error inesperado") + ". Intentá nuevamente." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[85vh] max-w-2xl flex-col px-4 py-6 text-white">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-pink-500">Laboratorio · solo pruebas</p>
        <h1 className="mt-2 text-2xl font-bold">Vendedor IA SH</h1>
        <p className="mt-1 text-sm text-zinc-400">Etapa 1: búsqueda de productos. Sin pagos, pedidos ni mensajes automáticos.</p>
      </header>
      <section aria-label="Conversación de prueba" className="flex-1 space-y-4 pb-6" aria-live="polite">
        {messages.map((message, i) => (
          <article key={i} className={message.role === "user" ? "ml-8 rounded-2xl bg-pink-700 p-4 text-sm" : "mr-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm"}>
            <p className="mb-1 text-xs font-semibold text-zinc-300">{message.role === "user" ? "Vos" : "Vendedor SH (prototipo)"}</p>
            <p className="whitespace-pre-wrap">{message.text}</p>
            {message.matches && message.matches.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.matches.map((m, index) => (
                  <div className="rounded-xl border border-zinc-700 bg-black/40 p-3" key={m.sku + "-" + index}>
                    <p className="font-medium">{m.name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{m.brand} · {m.size || "Presentación sin especificar"}</p>
                    <p className="mt-1 font-mono text-xs text-pink-400">SKU: {m.sku}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
        {loading && <p className="text-sm text-zinc-400" role="status">Consultando catálogo de SH…</p>}
      </section>
      <form onSubmit={send} className="sticky bottom-3 flex gap-2 rounded-2xl border border-zinc-700 bg-zinc-950 p-2">
        <input aria-label="Tu consulta" value={input} maxLength={180} onChange={e => setInput(e.target.value)}
          placeholder="Pedime un producto…" className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-sm text-white outline-none" />
        <button type="submit" disabled={loading || !input.trim()} className="rounded-xl bg-[#ee078e] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {loading ? "Buscando" : "Enviar"}
        </button>
      </form>
    </main>
  );
}

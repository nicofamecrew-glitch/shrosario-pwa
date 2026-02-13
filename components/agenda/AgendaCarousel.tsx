"use client";

import type { CalendarEvent } from "./EventBlock";

function parseISO(s: string) {
  if (!s) return new Date(NaN);

  const [datePart, timePartRaw = "00:00"] = String(s).split("T");
  const [y, m, d] = datePart.split("-").map(Number);

  // acepta HH:mm o HH:mm:ss
  const timePart = timePartRaw.slice(0, 5);
  const [hh = 0, mm = 0] = timePart.split(":").map(Number);

  return new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, 0, 0);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function AgendaCarousel({
  currentDate,
  events,
  onPickEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onPickEvent?: (ev: CalendarEvent) => void;
}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

 const enriched = events
  .map((e) => ({ e, s: parseISO(e.start), t: parseISO(e.end) }))
  .filter((x) => !Number.isNaN(x.s.getTime()) && !Number.isNaN(x.t.getTime()))
  .sort((a, b) => a.s.getTime() - b.s.getTime());


  const next = enriched.find((x) => x.t.getTime() > now.getTime() && x.e.status !== "cancelado")?.e ?? null;

  const todayCount = enriched.filter((x) => sameDay(x.s, today) && x.e.status !== "cancelado").length;
  const tomorrowCount = enriched.filter((x) => sameDay(x.s, tomorrow) && x.e.status !== "cancelado").length;

  const pending = enriched.filter((x) => x.e.status === "pendiente").length;
  const canceled = enriched.filter((x) => x.e.status === "cancelado").length;

  const cards: { key: string; title: string; subtitle: string; meta?: string; onClick?: () => void }[] = [];

  cards.push({
    key: "next",
    title: "Próximo turno",
    subtitle: next ? `${next.title}${next.client ? ` · ${next.client}` : ""}` : "No hay próximos turnos",
    meta: next ? (() => {
      const s = parseISO(next.start);
      const t = parseISO(next.end);
      return `${s.toLocaleDateString("es-AR")} · ${fmtTime(s)}–${fmtTime(t)}`;
    })() : undefined,
    onClick: next ? () => onPickEvent?.(next) : undefined,
  });

  cards.push({
    key: "today",
    title: "Hoy",
    subtitle: `${todayCount} turno${todayCount === 1 ? "" : "s"}`,
    meta: "Vista rápida",
  });

  cards.push({
    key: "tomorrow",
    title: "Mañana",
    subtitle: `${tomorrowCount} turno${tomorrowCount === 1 ? "" : "s"}`,
    meta: "Planificación",
  });

  cards.push({
    key: "pending",
    title: "Pendientes",
    subtitle: `${pending} por confirmar`,
    meta: "Seguimiento",
  });

  cards.push({
    key: "cancel",
    title: "Cancelados",
    subtitle: `${canceled} cancelado${canceled === 1 ? "" : "s"}`,
    meta: "Historial",
  });
 
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-white/60">Resumen</div>
        <div className="text-[11px] text-white/40">{currentDate.toLocaleDateString("es-AR")}</div>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={c.onClick}
            disabled={!c.onClick}
            className={[
              "min-w-[240px] snap-start rounded-2xl border border-white/10 bg-white/5 p-3 text-left",
              "hover:bg-white/10 transition",
              !c.onClick ? "opacity-90" : "",
            ].join(" ")}
          >
            <div className="text-sm font-black">{c.title}</div>
            <div className="mt-1 text-sm font-semibold text-white/80">{c.subtitle}</div>
            {c.meta ? <div className="mt-1 text-[11px] text-white/55">{c.meta}</div> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

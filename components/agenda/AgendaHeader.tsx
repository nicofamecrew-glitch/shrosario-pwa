

import { useMemo } from "react";

export type AgendaView = "day" | "week";

function fmtMonthYear(d: Date) {
  const s = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  // Capitalizar primera letra
  return s.charAt(0).toUpperCase() + s.slice(1);
}

import type { Dispatch, SetStateAction } from "react";

export default function AgendaHeader(props: {
  currentDate: Date;
  view: AgendaView;
  onChangeView: Dispatch<SetStateAction<AgendaView>>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {

  const { currentDate, view, onChangeView, onPrev, onNext, onToday } = props;

  const title = useMemo(() => fmtMonthYear(currentDate), [currentDate]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-black tracking-tight">{title}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={view}
          onChange={(e) => onChangeView(e.target.value as any)}
          className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-semibold text-white outline-none"
        >
          <option value="day">Día</option>
          <option value="week">Semana</option>
        </select>

        <button
          type="button"
          onClick={onToday}
          className="h-10 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold hover:bg-white/15"
        >
          Hoy
        </button>

        <div className="flex items-center overflow-hidden rounded-xl border border-white/10">
          <button
            type="button"
            onClick={onPrev}
            className="h-10 w-10 bg-black/30 text-lg hover:bg-white/10"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-10 w-10 bg-black/30 text-lg hover:bg-white/10"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

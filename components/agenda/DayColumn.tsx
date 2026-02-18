import type React from "react";
import EventBlock, { CalendarEvent, LaidOutEvent } from "../agenda/EventBlock";

function parseISO(s: string) {
  // “YYYY-MM-DDTHH:mm:ss” -> Date local
  const [datePart, timePart] = s.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function minutesBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}

type Interval = {
  id: string;
  startMin: number;
  endMin: number;
  event: CalendarEvent;
};

function layoutOverlaps(items: Interval[]): { [id: string]: { col: number; cols: number } } {
  // Greedy interval graph coloring per cluster
  const sorted = [...items].sort((x, y) => x.startMin - y.startMin || x.endMin - y.endMin);

  const out: { [id: string]: { col: number; cols: number } } = {};
  let active: { endMin: number; col: number; id: string }[] = [];
  let clusterIds: string[] = [];
  let maxColsInCluster = 1;

  function flushCluster() {
    for (const id of clusterIds) {
      if (out[id]) out[id].cols = maxColsInCluster;
    }
    clusterIds = [];
    maxColsInCluster = 1;
  }

  for (const it of sorted) {
    // Remove finished
    active = active.filter((a) => a.endMin > it.startMin);

    // If cluster ended (no active before adding new)
    if (active.length === 0 && clusterIds.length > 0) flushCluster();

    // Pick lowest available column
    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col++;

    active.push({ endMin: it.endMin, col, id: it.id });
    clusterIds.push(it.id);

    out[it.id] = { col, cols: 1 };
    maxColsInCluster = Math.max(maxColsInCluster, used.size + 1);
  }

  if (clusterIds.length > 0) flushCluster();
  return out;
}

export default function DayColumn(props: {
  day: Date;
  startHour: number;
  endHour: number;
  pxPerMin: number;
  events: CalendarEvent[];
  onDoubleClickEmpty?: (day: Date, minutesFromStart: number) => void;
  onEventClick?: (ev: CalendarEvent) => void;
}) {
  const { day, startHour, endHour, pxPerMin, events, onEventClick, onDoubleClickEmpty } = props;


  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour, 0, 0, 0);
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endHour, 0, 0, 0);
  const totalMin = Math.max(1, minutesBetween(start, end));

  // Filter events for this day
  const dayEvents = events
    .map((e) => ({ e, s: parseISO(e.start), t: parseISO(e.end) }))
    .filter(({ s }) => sameDay(s, day));

  // Convert to minutes from start
  const intervals: Interval[] = dayEvents.map(({ e, s, t }) => {
    const startMin = Math.max(0, minutesBetween(start, s));
    const endMin = Math.min(totalMin, minutesBetween(start, t));
    return { id: e.id, startMin, endMin: Math.max(startMin + 1, endMin), event: e };
  });

  const layout = layoutOverlaps(intervals);

  const laidOut: LaidOutEvent[] = intervals.map((it) => {
    const top = it.startMin * pxPerMin;
    const height = (it.endMin - it.startMin) * pxPerMin;
    const meta = layout[it.id] ?? { col: 0, cols: 1 };
    return { ...it.event, top, height, col: meta.col, cols: meta.cols };
  });

  return (
  <div
  className="relative h-full border-l border-black/10 dark:border-white/10"

   onDoubleClick={(ev: React.MouseEvent<HTMLDivElement>) => {
  const rect = ev.currentTarget.getBoundingClientRect();
  const y = ev.clientY - rect.top;
  const minutesFromStart = Math.max(0, Math.floor(y / pxPerMin));
  onDoubleClickEmpty?.(day, minutesFromStart);
}}

  >

      {/* background grid hour lines */}
      <div className="absolute inset-0">
        {Array.from({ length: endHour - startHour + 1 }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="h-[72px] border-t border-white/10"
            style={{}}
          />
        ))}
      </div>

      {/* event layer */}
      <div className="absolute inset-0 px-1">
      {laidOut.map((e) => (
  <EventBlock key={e.id} e={e} onClick={onEventClick} />
))}

      </div>
    </div>
  );
}


import type { CalendarEvent } from "./EventBlock";
import DayColumn from "@/components/agenda/DayColumn";
import TimeColumn from "./TimeColumn";
import type { AgendaView } from "@/components/agenda/AgendaHeader";

const START_HOUR = 8;
const END_HOUR = 21;
const STEP_MIN = 30;
const PX_PER_MIN = 72 / 60; // 72px por hora -> 1.2 px/min (coherente con TimeColumn)

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const jsDay = x.getDay(); // 0 Sun .. 6 Sat
  const mondayOffset = (jsDay + 6) % 7; // Mon=0
  x.setDate(x.getDate() - mondayOffset);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function dayLabel(d: Date) {
  return d.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
}
function dayNum(d: Date) {
  return d.getDate();
}

export default function WeekGrid(props: {
  currentDate: Date;
  view: AgendaView;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
  onEventClick?: (ev: CalendarEvent) => void;
  onDoubleClickEmpty?: (day: Date, minutesFromStart: number) => void;

}) {
const { currentDate, view, events, onEventClick, onDoubleClickEmpty } = props;


  const weekStart = startOfWeekMonday(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Mobile: day view “automático” aunque estés en week
  const effectiveView: AgendaView =
    typeof window !== "undefined" && window.innerWidth < 1024 ? "day" : view;

  const daysToShow = effectiveView === "day" ? [currentDate] : days;

  return (
    <div className="h-[75svh] overflow-hidden">
      <div className="flex h-full flex-col">
        {/* Header row */}
        <div className="flex">
          <div className="w-14 shrink-0" />
          <div className="grid flex-1 grid-cols-1 lg:grid-cols-7">
            {daysToShow.map((d) => {
              const isActive = sameDay(d, currentDate);
              const isToday = sameDay(d, new Date());
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  
                  className={[
  "h-10 border-l border-black/10 dark:border-white/10 px-2 text-left",
  "hover:bg-black/5 dark:hover:bg-white/5",
  isActive ? "bg-black/5 dark:bg-white/5" : "bg-transparent",
].join(" ")}

                >
                  <div className="flex items-center gap-2">
                   <div className="text-[12px] font-semibold text-black/70 dark:text-white/70">

                      {dayLabel(d)}
                    </div>
                    <div
                      className={[
  "flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[12px] font-black",
  isActive
    ? "bg-[#dd1d03] text-white"
    : "bg-black/10 text-black/80 dark:bg-white/10 dark:text-white/80",
  isToday ? "ring-1 ring-black/20 dark:ring-white/20" : "",
].join(" ")}

                    >
                      {dayNum(d)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="flex flex-1 overflow-auto">
          <TimeColumn startHour={START_HOUR} endHour={END_HOUR} />

          <div
            className={[
              "grid flex-1",
              effectiveView === "day" ? "grid-cols-1" : "grid-cols-7",
            ].join(" ")}
            style={{
              minWidth: effectiveView === "day" ? 0 : 980,
            }}
          >
            {daysToShow.map((d) => (
              <DayColumn
                key={d.toISOString()}
                day={d}
                startHour={START_HOUR}
                endHour={END_HOUR}
                pxPerMin={PX_PER_MIN}
                events={events}
                onEventClick={onEventClick}
                onDoubleClickEmpty={onDoubleClickEmpty}
              />
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-black/50 dark:text-white/50">

          <div>
            Horario {String(START_HOUR).padStart(2, "0")}:00–{String(END_HOUR).padStart(2, "0")}:00 ·
            paso {STEP_MIN} min
          </div>
          <div className="hidden lg:block">Tip: en mobile se muestra “Día” automáticamente</div>
        </div>
      </div>
    </div>
  );
}

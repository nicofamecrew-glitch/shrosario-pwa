

export type CalendarEvent = {
  id: string;
  title: string;
  client?: string;
  start: string; // ISO local-like
  end: string;   // ISO local-like
  status: "confirmado" | "pendiente" | "cancelado";
};

export type LaidOutEvent = CalendarEvent & {
  top: number;
  height: number;
  col: number;
  cols: number;
};

function statusClass(s: CalendarEvent["status"]) {
  switch (s) {
    case "confirmado":
      return "bg-white/10 border-white/15";
    case "pendiente":
      return "bg-white/5 border-white/10";
    case "cancelado":
      return "bg-white/5 border-white/10 opacity-60 line-through";
    default:
      return "bg-white/10 border-white/10";
  }
}

export default function EventBlock(props: { e: LaidOutEvent; onClick?: (ev: CalendarEvent) => void }) {

 const { e, onClick } = props;

  const widthPct = 100 / e.cols;
  const leftPct = e.col * widthPct;

  return (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onClick?.(e)}
    onKeyDown={(ev) => {
      if (ev.key === "Enter" || ev.key === " ") onClick?.(e);
    }}
    className={[
      "absolute rounded-xl border p-2 text-[12px] shadow-sm cursor-pointer select-none",
      "hover:border-white/25 hover:bg-white/10 transition",
      statusClass(e.status),
    ].join(" ")}

      style={{
        top: e.top,
        height: Math.max(22, e.height),
        left: `calc(${leftPct}% + 4px)`,
        width: `calc(${widthPct}% - 8px)`,
      }}
    >
      <div className="font-black leading-4">
        {e.title}
      </div>
      {e.client ? (
        <div className="mt-0.5 text-[11px] font-semibold text-white/70">
          {e.client}
        </div>
      ) : null}
    </div>
  );
}

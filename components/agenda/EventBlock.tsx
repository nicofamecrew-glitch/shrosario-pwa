

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
      return "bg-white border-black/10 text-black dark:bg-white/10 dark:border-white/15 dark:text-white";
    case "pendiente":
      return "bg-white border-black/10 text-black dark:bg-white/5 dark:border-white/10 dark:text-white";
    case "cancelado":
      return "bg-white border-black/10 text-black opacity-70 line-through dark:bg-white/5 dark:border-white/10 dark:text-white";
    default:
      return "bg-white border-black/10 text-black dark:bg-white/10 dark:border-white/10 dark:text-white";
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
  "absolute rounded-xl border p-2 text-[12px] shadow-sm cursor-pointer select-none transition",
  "hover:bg-black/5 hover:border-black/20 dark:hover:bg-white/10 dark:hover:border-white/25",
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
<div className="mt-0.5 text-[11px] font-semibold text-black/70 dark:text-white/70">

          {e.client}
        </div>
      ) : null}
    </div>
  );
}

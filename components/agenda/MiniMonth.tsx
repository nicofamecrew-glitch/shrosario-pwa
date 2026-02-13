
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
// Week starts Monday (0=Sun -> convert)
function mondayIndex(jsDay: number) {
  // jsDay: 0 Sun .. 6 Sat
  return (jsDay + 6) % 7; // Mon=0 ... Sun=6
}

export default function MiniMonth(props: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const { value, onChange } = props;
  const m0 = startOfMonth(value);
  const total = daysInMonth(value);

  const lead = mondayIndex(m0.getDay()); // blanks before day 1
  const cells = Array.from({ length: lead + total }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 ? new Date(value.getFullYear(), value.getMonth(), day) : null;
  });

  const title = value.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const capTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-black">{capTitle}</div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-[11px] text-white/60">
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((d) => (
          <div key={d} className="px-1 py-1 text-center font-semibold">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          const isSelected = d ? sameDay(d, value) : false;
          const isToday = d ? sameDay(d, new Date()) : false;

          return (
            <button
              key={idx}
              type="button"
              disabled={!d}
              onClick={() => d && onChange(d)}
              className={[
                "h-8 rounded-lg text-xs font-semibold",
                !d ? "opacity-0" : "hover:bg-white/10",
                isToday ? "border border-white/20" : "border border-transparent",
                isSelected ? "bg-[#dd1d03] text-white" : "bg-black/20 text-white/80",
              ].join(" ")}
            >
              {d ? d.getDate() : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}



export default function TimeColumn(props: {
  startHour: number;
  endHour: number;
}) {
  const { startHour, endHour } = props;
  const hours = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  return (
    <div className="w-14 shrink-0">
      <div className="h-10" />
      <div className="relative">
        {hours.map((h) => (
    <div key={h} className="h-[72px] border-t border-black/10 dark:border-white/10 pr-2">
  <div className="pt-1 text-right text-[11px] font-semibold text-black/45 dark:text-white/45">

              {String(h).padStart(2, "0")}:00
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

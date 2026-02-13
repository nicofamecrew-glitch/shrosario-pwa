export default function LoadingCatalog() {
  return (
    <div className="mx-auto max-w-[520px] px-4 py-4">
      <div className="h-10 w-full animate-pulse rounded-2xl bg-black/10" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl bg-black/10" />
        ))}
      </div>
    </div>
  );
}

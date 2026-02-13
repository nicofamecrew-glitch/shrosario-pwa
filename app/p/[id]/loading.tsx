export default function LoadingProduct() {
  return (
    <div className="mx-auto max-w-[520px] px-4 py-4">
      <div className="h-64 w-full animate-pulse rounded-3xl bg-black/10" />
      <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-black/10" />
      <div className="mt-2 h-5 w-1/2 animate-pulse rounded bg-black/10" />

      <div className="mt-6 space-y-3">
        <div className="h-12 w-full animate-pulse rounded-2xl bg-black/10" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-black/10" />
      </div>

      <div className="mt-8 h-14 w-full animate-pulse rounded-full bg-black/10" />
    </div>
  );
}

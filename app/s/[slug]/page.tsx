import Link from "next/link";
import { notFound } from "next/navigation";
import { getSheetRows } from "@/lib/lib/sheets";

type HomeBlock = {
  id: string;
  title: string;
  subtitle?: string;
  active?: string | boolean;
  source?: string; // "tag" | "brand" | "line" | "category"
  value?: string;
};

function norm(v: any) {
  return String(v ?? "").trim();
}

function isActive(v: any) {
  if (typeof v === "boolean") return v;
  const s = norm(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "si";
}


function splitTags(raw: any) {
  const s = norm(raw).toLowerCase();
  if (!s) return [];

  const cleaned = s
    .split("|").join(",")
    .split(";").join(",")
    .split("\n").join(",")
    .split("\t").join(",")
    .split("  ").join(" ");

  if (cleaned.includes(",")) {
    return cleaned
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);
  }

  return cleaned
    .split(" ")
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0);
}


export default async function SectionPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = norm(params.slug);

  const blocksRaw = (await getSheetRows("home_blocks")) as any[];
  const blocks: HomeBlock[] = blocksRaw.map((b) => ({
    id: norm(b.id),
    title: norm(b.title),
    subtitle: norm(b.subtitle),
    active: b.active,
    source: norm(b.source),
    value: norm(b.value),
  }));

  function slugify(x: any) {
  return norm(x)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .join("-");
}

const block = blocks.find(
  (b) => slugify(b.id) === slugify(slug) && isActive(b.active)
);

if (!block) {
  return (
    <main className="px-4 pt-4 pb-28 text-white">
      <div className="text-sm text-white/70">Slug pedido: {slug}</div>
      <div className="mt-3 text-sm font-semibold">
        Blocks leídos de home_blocks:
      </div>
      <pre className="mt-2 text-xs text-white/80 whitespace-pre-wrap">
        {blocks
          .map(
            (b) =>
              `id="${b.id}" slug="${slugify(b.id)}" active="${String(b.active)}" title="${b.title}"`
          )
          .join("\n")}
      </pre>
    </main>
  );
}


  const products = (await getSheetRows("products")) as any[];

  const source = norm(block.source).toLowerCase();
  const value = norm(block.value);

  const filtered = products.filter((p) => {
    if (!source || !value) return true;

    if (source === "brand") {
      return norm(p.brand).toLowerCase() === value.toLowerCase();
    }

    if (source === "tag") {
  const tags = splitTags(p.tag || "");
  return tags.includes(value.toLowerCase());
}


    if (source === "line") {
      return norm(p.line).toLowerCase() === value.toLowerCase();
    }

    if (source === "category") {
      return norm(p.category).toLowerCase() === value.toLowerCase();
    }

    return true;
  });

  return (
  <main className="px-4 pt-4 pb-28">
    <div className="flex flex-col gap-2">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {block.title}
        </h1>

        {block.subtitle ? (
          <p className="mt-1 text-sm text-white/70">
            {block.subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Link
          href="/catalog"
          className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Categorías
        </Link>

        <Link
          href="/catalog"
          className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Ver todo
        </Link>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3">
      {filtered.map((p: any) => (
        <Link
          key={p.id || `${p.brand}-${p.name}`}
          href={p.id ? `/product/${p.id}` : "/catalog"}
          className="rounded-2xl border border-white/10 bg-white/5 p-3"
        >
          <div className="aspect-square w-full rounded-xl bg-white/5" />
          <div className="mt-2 text-sm font-semibold text-white line-clamp-2">
            {p.name || "Producto"}
          </div>
          <div className="mt-1 text-xs text-white/60">
            {p.brand || ""}
          </div>
        </Link>
      ))}
    </div>

    {filtered.length === 0 ? (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/80">
          Todavía no hay productos en esta sección.
        </p>
        <p className="mt-1 text-xs text-white/60">
          Podés ver el catálogo completo mientras tanto.
        </p>
      </div>
    ) : null}
  </main>
);
}
import GuiaChat from "@/components/guia/GuiaChat";
import type { Product } from "@/lib/types";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findMatchingProducts(
  products: Product[],
  query: string
) {
  const q = normalizeText(query);

  const words = q
    .split(/\s+/)
    .filter((word) => word.length >= 3);

  return products
    .map((product) => {
      const searchable = normalizeText(
        [
          product.name,
          product.brand,
          product.line,
          product.category,
          ...(product.tags ?? []),
          ...product.variants.map((variant) => variant.size),
        ]
          .filter(Boolean)
          .join(" ")
      );

      let score = 0;

      for (const word of words) {
        if (searchable.includes(word)) {
          score += 1;
        }
      }

      return {
        product,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.product);
}

export default function GuiaPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-6">
        
        <header className="flex items-center gap-3 border-b border-white/10 pb-4">
          <img
            src="/guia/guia-icon.png"
            alt="GUÍA"
            className="h-10 w-10 object-contain"
          />

          <div>
            <h1 className="text-xl font-bold">GUÍA</h1>

            <p className="text-sm text-white/50">
              Tu vendedor inteligente
            </p>
          </div>
        </header>

        <GuiaChat />
      </div>
    </main>
  );
}
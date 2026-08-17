"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import HomeProductCard from "@/components/HomeProductCard";
import {
  getFlashProducts,
  getFlashWindow,
} from "@/lib/flashSale";

export default function FlashPageClient({
  products,
}: {
  products: Product[];
}) {
  const router = useRouter();

  const flashProducts = useMemo(
    () => getFlashProducts(products),
    [products]
  );

  const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

  const { endsAt } = getFlashWindow();

  const endsText = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endsAt));

  return (
    <main className="min-h-screen bg-white px-4 pb-32 pt-8 text-black dark:bg-black dark:text-white">
      <div className="mx-auto max-w-md">
        <section className="rounded-[28px] bg-black p-5 text-white dark:border dark:border-white/10">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ee078e]">
            Ofertas Relámpago
          </div>

          <h1 className="mt-2 text-3xl font-black">
            15% OFF
          </h1>

          <p className="mt-2 text-sm text-white/60">
            10 productos seleccionados por tiempo limitado.
          </p>

          <div className="mt-4 text-xs text-white/40">
  {mounted
    ? `Esta tanda termina el ${endsText}`
    : "Oferta válida por 72 horas"}
</div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          {flashProducts.map((product) => (
            <div
              key={product.id}
              onClick={(e) => {
                const target = e.target as HTMLElement | null;

                if (target?.closest("[data-no-nav]")) {
                  return;
                }

                router.push(`/p/${product.id}`);
              }}
            >
              <HomeProductCard
  product={product}
  flashDiscountPercent={15}
/>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
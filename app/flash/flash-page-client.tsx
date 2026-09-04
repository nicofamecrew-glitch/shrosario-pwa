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
  const [now, setNow] = useState(Date.now());

useEffect(() => {
  setMounted(true);

  const id = window.setInterval(() => {
    setNow(Date.now());
  }, 1000);

  return () => window.clearInterval(id);
}, []);

  const { endsAt } = getFlashWindow();
 
  const remainingMs = Math.max(0, endsAt - now);

const totalSeconds = Math.floor(remainingMs / 1000);
const hours = Math.floor(totalSeconds / 3600);
const minutes = Math.floor((totalSeconds % 3600) / 60);
const seconds = totalSeconds % 60;

const countdownText = [hours, minutes, seconds]
  .map((n) => String(n).padStart(2, "0"))
  .join(":");

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
            10% OFF
          </h1>

          <p className="mt-2 text-sm text-white/60">
            10 productos seleccionados por tiempo limitado.
          </p>

         <div className="mt-4">
  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
    Tiempo restante
  </div>

  <div className="mt-1 text-3xl font-black tabular-nums tracking-tight text-white">
    {mounted ? countdownText : "--:--:--"}
  </div>

  <div className="mt-1 text-xs text-white/40">
    {mounted
      ? `Esta tanda termina el ${endsText}`
      : "Oferta válida por 72 horas"}
  </div>
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
  flashDiscountPercent={10}
/>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
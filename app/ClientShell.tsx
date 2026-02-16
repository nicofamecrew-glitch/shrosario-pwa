"use client";

import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/CartDrawer";
import { useCartStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import ToastHost from "@/components/ToastHost";
import CartFly from "@/components/CartFly";


export default function ClientShell({ children }: { children: React.ReactNode }) {
  const cartCount = useCartStore((s) => s.items.reduce((acc, it) => acc + it.quantity, 0));
  const setProducts = useCatalogStore((s) => s.setProducts);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/catalog", { cache: "no-store" });

        if (!res.ok) return;
       const data = await res.json();

if (!cancelled && Array.isArray(data)) {
  setProducts(data);

  // ✅ cargar stock por SKU en el store
  const { setStockBySku } = useCartStore.getState();

  for (const p of data as any[]) {
    const vars = Array.isArray(p?.variants) ? p.variants : [];
    for (const v of vars) {
      const sku = String(v?.sku ?? "").trim();
      if (!sku) continue;

      const raw = v?.stock;

      // si no viene stock, lo dejamos "ilimitado" (null)
      if (raw === undefined || raw === null || raw === "") continue;

      const n = Number(raw);
      if (Number.isFinite(n)) setStockBySku(sku, n);
    }
  }
}

      } catch {
        // no rompe UX
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setProducts]);

  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]">
      {/* Contenido: siempre arriba, con espacio para el nav */}
      <main
        className="relative z-0"
        style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>

      {/* UI global */}
     <CartFly />
      <ToastHost />
      <CartDrawer />
         

      {/* Nav: siempre arriba, pero SOLO su propia area */}
      <div className="fixed inset-x-0 bottom-0 z-50">
        <BottomNav cartCount={cartCount} />
      </div>
    </div>
  );
}

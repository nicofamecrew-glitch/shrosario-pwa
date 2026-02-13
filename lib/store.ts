import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

type CartState = {
  items: CartItem[];
  isWholesale: boolean;

  // ✅ stock cacheado por SKU (si no existe, se asume "sin límite")
  stockBySku: Record<string, number>;
  setStockBySku: (sku: string, stock: number) => void;
  getStockBySku: (sku: string) => number | null;

  // ✅ helpers
  getQtyBySku: (sku: string) => number;

  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, variantSku: string, quantity: number) => void;
  removeItem: (productId: string, variantSku: string) => void;
  clearCart: () => void;
  setWholesale: (enabled: boolean) => void;
};

function toast(message: string, kind: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("toast", { detail: { message, kind } })
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isWholesale: false,

      stockBySku: {},

      setStockBySku: (sku, stock) =>
        set((state) => ({
          stockBySku: {
            ...state.stockBySku,
            [sku]: Math.max(0, Number.isFinite(stock as any) ? Number(stock) : 0),
          },
        })),

      getStockBySku: (sku) => {
        const v = get().stockBySku?.[sku];
        if (v === undefined) return null; // null = desconocido (no limitamos)
        return Math.max(0, Number(v) || 0);
      },

      getQtyBySku: (sku) => {
        const found = get().items.find((i) => i.variantSku === sku);
        return found?.quantity ?? 0;
      },

      addItem: (item) =>
        set((state) => {
          const sku = item.variantSku;
          const qtyToAdd = Math.max(1, Number(item.quantity) || 1);

          // stock conocido?
          const stockKnown = state.stockBySku?.[sku];
          const stock =
            stockKnown === undefined ? null : Math.max(0, Number(stockKnown) || 0);

          const existing = state.items.find(
            (entry) =>
              entry.productId === item.productId && entry.variantSku === item.variantSku
          );

          const currentQty = existing?.quantity ?? 0;
          const nextQty = currentQty + qtyToAdd;

          if (stock !== null) {
            if (stock <= 0) {
              toast("Sin stock", "error");
              return state;
            }
            if (nextQty > stock) {
              toast(`Stock insuficiente (disponible: ${stock})`, "error");
              return state;
            }
          }

          if (existing) {
            toast("Agregado al carrito", "success");
            return {
              items: state.items.map((entry) =>
                entry.productId === item.productId && entry.variantSku === item.variantSku
                  ? { ...entry, quantity: nextQty }
                  : entry
              ),
            };
          }

          toast("Agregado al carrito", "success");
          return { items: [...state.items, { ...item, quantity: nextQty }] };
        }),

      updateQuantity: (productId, variantSku, quantity) =>
        set((state) => {
          const q = Math.max(0, Number(quantity) || 0);

          // stock conocido?
          const stockKnown = state.stockBySku?.[variantSku];
          const stock =
            stockKnown === undefined ? null : Math.max(0, Number(stockKnown) || 0);

          if (stock !== null && q > stock) {
            toast(`Stock insuficiente (disponible: ${stock})`, "error");
            return {
              items: state.items.map((entry) =>
                entry.productId === productId && entry.variantSku === variantSku
                  ? { ...entry, quantity: stock }
                  : entry
              ),
            };
          }

          return {
            items: state.items
              .map((entry) =>
                entry.productId === productId && entry.variantSku === variantSku
                  ? { ...entry, quantity: q }
                  : entry
              )
              .filter((entry) => entry.quantity > 0),
          };
        }),

      removeItem: (productId, variantSku) =>
        set((state) => ({
          items: state.items.filter(
            (entry) => !(entry.productId === productId && entry.variantSku === variantSku)
          ),
        })),

      clearCart: () => set({ items: [] }),
      setWholesale: (enabled) => set({ isWholesale: enabled }),
    }),
    {
      name: "shrosario_cart",
      storage: createJSONStorage(() => localStorage),
      // ✅ si querés, podés versionar en el futuro
      // version: 1,
    }
  )
);
// -----------------------------
// FAVORITES STORE (restaurado)
// -----------------------------
type FavoritesState = {
  favorites: string[]; // product.id
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (id) =>
        set((state) => {
          const exists = state.favorites.includes(id);
          return {
            favorites: exists
              ? state.favorites.filter((f) => f !== id)
              : [...state.favorites, id],
          };
        }),

      isFavorite: (id) => get().favorites.includes(id),
    }),
    {
      name: "shrosario_favorites",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

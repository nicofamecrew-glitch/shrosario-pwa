import { create } from "zustand";
import type { Product } from "@/lib/types";

type CatalogState = {
  products: Product[];
  byId: Record<string, Product>;
  setProducts: (products: Product[]) => void;
};

export const useCatalogStore = create<CatalogState>((set) => ({
  products: [],
  byId: {},
  setProducts: (products) =>
    set({
      products,
      byId: Object.fromEntries(products.map((p) => [p.id, p])),
    }),
}));

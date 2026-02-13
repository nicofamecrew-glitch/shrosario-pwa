"use client";

import { useEffect, useState } from "react";

export type HomeCarouselItem = {
  id: string;
  brand: string;
  image_url: string;
  order: number;
  active: boolean;
};

export function useHomeCarousel() {
  const [items, setItems] = useState<HomeCarouselItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch("/api/home-carousel", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;

        const list = (data.items ?? []) as HomeCarouselItem[];

        setItems(
          list
            .map((x) => ({
              ...x,
              id: (x.id ?? "").trim(),
              brand: (x.brand ?? "").trim(),
              image_url: (x.image_url ?? "").trim(),
            }))
            .filter((x) => x.active && x.image_url.length > 0)
            .sort((a, b) => a.order - b.order)
        );
      })
      .finally(() => {
        if (!alive) return; // ✅ FIX: estaba invertido
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { items, loading };
}

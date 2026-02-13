"use client";

import { useEffect, useState } from "react";

export type HomeBlock = {
  id: string;
  title: string;
  subtitle?: string;
  active: boolean;
  order: number;
  source: string;
  value: string;
  limit?: number;
  ctaLabel?: string;
  ctaHref?: string;
};

function toBool(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "si";
}

export function useHomeBlocks() {
  const [items, setItems] = useState<HomeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch("/api/home-blocks", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;

        const list = Array.isArray(data?.rows) ? data.rows : [];

        setItems(
          list
            .map((x: any) => ({
              id: String(x.id ?? "").trim(),
              title: String(x.title ?? "").trim(),
              subtitle: String(x.subtitle ?? "").trim(),
              active: toBool(x.active),
              order: Number(x.order) || 0,
              source: String(x.source ?? "").trim(),
              value: String(x.value ?? "").trim(),
              limit: Number(x.limit) || 5,
              ctaLabel: String(x.ctaLabel ?? "").trim(),
              ctaHref: String(x.ctaHref ?? "").trim(),
            }))
            .filter((x: HomeBlock) => x.active && x.title.length > 0)
            .sort((a: HomeBlock, b: HomeBlock) => a.order - b.order)
        );
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { items, loading };
}

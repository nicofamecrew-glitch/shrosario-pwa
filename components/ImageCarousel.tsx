"use client";

import { useEffect, useMemo, useRef } from "react";

export default function ImageCarousel({
  images,
  alt,
  className = "",
  onIndexChange,
}: {
  images: string[];
  alt: string;
  className?: string;
  onIndexChange?: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const safe = useMemo(() => {
    const arr = Array.isArray(images) ? images.filter(Boolean) : [];
    return arr.length ? arr : ["/product/placeholder.png"];
  }, [images]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = () => {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      onIndexChange?.(Math.max(0, Math.min(i, safe.length - 1)));
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler as any);
  }, [safe.length, onIndexChange]);

  return (
    <div
      ref={ref}
      className={[
        "flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      ].join(" ")}
    >
      {safe.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full shrink-0 snap-center object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/product/placeholder.png";
          }}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import { useCartStore } from "@/lib/store";
export default function Header({ onCartClick }: { onCartClick?: () => void }) {
  const handleCartClick = onCartClick ?? (() => {});

const { items } = useCartStore();
  const [menuOpen, setMenuOpen] = useState(false);
const openScrollY = useRef(0);
const armedRef = useRef(false);

  const closeMenu = () => setMenuOpen(false);
 const toggleMenu = () => {
  setMenuOpen((prev) => {
    const next = !prev;

    if (next) {
      openScrollY.current = window.scrollY;
      armedRef.current = false;

      setTimeout(() => {
        armedRef.current = true;
      }, 200);
    }

    return next;
  });
};


 
  // ✅ Cerrar con Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);
  // ✅ Cerrar al scrollear (cuando el menú está abierto)
  useEffect(() => {
    if (!menuOpen) return;

    const onScroll = () => {
      if (!armedRef.current) return;

      const delta = Math.abs(window.scrollY - openScrollY.current);

      if (delta > 10) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-panel bg-ink/90 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-accent text-black flex items-center justify-center font-bold">
            SH
          </div>
          <div>
          
            <p className="text-xs text-muted">Distribucion capilar</p>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="hidden items-center gap-6 md:flex">
          <a className="text-sm text-muted hover:text-white" href="#catalogo">
            Catalogo
          </a>
          <a className="text-sm text-muted hover:text-white" href="#novedades">
            Novedades
          </a>
          <button
            onClick={onCartClick}
            className="rounded-full border border-panel px-4 py-2 text-sm"
          >
            Carrito ({items.length})
          </button>
        </div>

        {/* MOBILE TOP BAR */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onCartClick}
            className="rounded-full border border-panel px-3 py-2 text-sm"
            aria-label="Abrir carrito"
          >
            Carrito ({items.length})
          </button>

          <button
            className="rounded-full border border-panel px-3 py-2 text-sm"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            Menu
          </button>
        </div>
      </div>

      {/* ✅ MOBILE DROPDOWN + overlay click afuera */}
      {menuOpen && (
        <div className="md:hidden">
          {/* overlay */}
          <div
            className="fixed inset-0 z-20 bg-black/40"
            onClick={closeMenu}
          />

          {/* menu */}
          <div
            id="mobile-menu"
            className="relative z-30 border-t border-panel bg-surface"
          >
            <div className="container flex flex-col gap-3 py-4 text-sm">
              <a
                className="text-muted"
                href="#catalogo"
                onClick={closeMenu}
              >
                Catalogo
              </a>

              <a
                className="text-muted"
                href="#novedades"
                onClick={closeMenu}
              >
                Novedades
              </a>

              <button
                onClick={() => {
                  handleCartClick();
                  closeMenu();
                }}
                className="rounded-full border border-panel px-4 py-2 text-sm"
              >
                Carrito ({items.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

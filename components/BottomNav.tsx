"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ACCENT = "#ee078e";

type BottomNavProps = {
  cartCount?: number;
  agendaHref?: string; // default: "/agenda"
};


export default function BottomNav({
  cartCount = 0,
  
    agendaHref = "/agenda",
}: BottomNavProps) {
  const pathname = usePathname();

  // Nota: pathname NO incluye query, así que /catalog?q=combo sigue siendo "/catalog"
    const activeKey =
    pathname === "/"
      ? "home"
      : pathname?.startsWith("/catalog")
      ? "catalog"
      : pathname?.startsWith("/agenda")
      ? "agenda"
      : pathname?.startsWith("/account")
      ? "account"
      : "none";



  const openCart = () => {
    // compatibilidad: si te pasan handler, lo usamos
   
    // fallback: evento global (tu arquitectura actual)
    window.dispatchEvent(new CustomEvent("cart:open"));
  };

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        bg-black/40 backdrop-blur-md
        border-t border-white/10
        pb-[env(safe-area-inset-bottom)]
      "
      aria-label="Bottom Navigation"
    >
      <div className="mx-auto max-w-md">
        <div className="relative">
          {/* NOTCH */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute left-1/2 top-0
              -translate-x-1/2 -translate-y-1/2
              h-16 w-16 rounded-full
              bg-black/40 backdrop-blur-md
              border border-white/10
            "
          />

          <div className="relative grid grid-cols-5 items-end px-2 pt-2">
            <NavItem href="/" active={activeKey === "home"} label="Inicio">
              <HomeIcon />
            </NavItem>

            <NavItem href="/catalog" active={activeKey === "catalog"} label="Categorías">
              <GridIcon />
            </NavItem>

            {/* Carrito central */}
            <div className="flex items-end justify-center">
             <button
  type="button"
  data-cart-target
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    openCart();
  }}
  className="
    relative z-10
    -translate-y-[38px]
    h-14 w-14 rounded-full
    bg-black text-white
    border-2 border-[#ee078e]
    shadow-xl
    ring-4 ring-black/40
    active:scale-95 transition
    flex items-center justify-center
  "
  aria-label="Abrir carrito"
>

                <CartIcon />
                {cartCount > 0 && (
                  <span
                    className="
                      absolute -right-1 -top-1
                      min-w-5 h-5 px-1
                      rounded-full
                      bg-[#ee078e] text-white
                      text-[11px] font-semibold
                      flex items-center justify-center
                    "
                    aria-label={`Productos en carrito: ${cartCount}`}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>
            </div>

  <NavItem href={agendaHref} active={activeKey === "agenda"} label="Agenda">
  <CalendarIcon />
</NavItem>



            <NavItem href="/account" active={activeKey === "account"} label="Cuenta">
              <UserIcon />
            </NavItem>
          </div>
        </div>

        <div className="h-2" />
      </div>

      
    </nav>
  );
}

function NavItem({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => window.dispatchEvent(new CustomEvent("cart:close"))}
      className={[
  "flex flex-col items-center justify-center gap-1 py-2 transition-colors",
  active
    ? "text-[#ee078e] drop-shadow-[0_0_10px_rgba(238,7,142,0.35)]"
    : "text-white",
].join(" ")}

      aria-current={active ? "page" : undefined}
    >
      {children}
      <span className="text-[11px]">{label}</span>
    </Link>
  );
}

/** ICONOS */
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6h15l-1.5 8H8L6 3H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3v3M17 3v3M4 8h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 12h2M12 12h2M16 12h0.01M8 16h2M12 16h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

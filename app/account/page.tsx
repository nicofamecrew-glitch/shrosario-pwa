"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";

const items = [
  { href: "/account/profile", title: "Mi cuenta", subtitle: "Datos y preferencias" },
  { href: "/account/orders", title: "Mis pedidos", subtitle: "Historial y estados" },
  { href: "/account/favorites", title: "Favoritos", subtitle: "Guardados para después" },
  { href: "/account/wholesale", title: "Mayorista", subtitle: "Acceso y condiciones" },
  { href: "/help", title: "Ayuda", subtitle: "Envíos, pagos y contacto" },
];

export default function AccountPage() {
  const { data: session, status } = useSession();

  const pageBg = "bg-[#f6f7f8] text-black dark:bg-black dark:text-white";
  const muted = "text-black/60 dark:text-white/60";
  const muted2 = "text-black/70 dark:text-white/70";

  const card =
    "rounded-2xl border border-black/10 bg-white shadow-sm " +
    "dark:border-white/10 dark:bg-white/5 dark:shadow-none";

  const row =
    "flex items-center justify-between " +
    "rounded-2xl border border-black/10 bg-white p-4 shadow-sm " +
    "dark:border-white/10 dark:bg-white/5 dark:shadow-none";

  const chevron = "text-black/35 dark:text-white/40";

  return (
    <main className={`min-h-[100svh] px-4 pt-16 pb-24 ${pageBg}`}>
      <h1 className="text-xl font-bold">Cuenta</h1>
      <p className={`mt-1 text-sm ${muted}`}>Tu información y tu actividad.</p>

      {/* BLOQUE LOGIN / SESIÓN */}
      {status === "loading" ? null : !session ? (
        <div className="mt-6 space-y-3">
          <p className={`text-sm ${muted2}`}>
            Iniciá sesión para ver tus pedidos y guardar tus datos.
          </p>
          <div className={card}>
            <div className="p-3">
              <GoogleButton />
            </div>
          </div>
        </div>
      ) : (
        <div className={`mt-4 ${row}`}>
          <div>
            <div className={`text-xs ${muted}`}>Sesión iniciada</div>
            <div className="font-semibold leading-tight">
              Hola, {session.user?.name || "usuario"}
            </div>
            <div className={`text-xs ${muted}`}>{session.user?.email}</div>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-semibold text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* BLOQUE LINKS */}
      <div className="mt-8 space-y-4">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            prefetch={false}
            className={row}
          >
            <div>
              <div className="font-semibold">{it.title}</div>
              <div className={`text-sm ${muted}`}>{it.subtitle}</div>
            </div>
            <div className={chevron}>›</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

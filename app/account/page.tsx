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

  const page = "min-h-[100svh] bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))] px-4 pt-16 pb-24";
  const muted = "text-[hsl(var(--app-muted))]";
  const muted2 = "text-[hsl(var(--app-muted-2))]";

  const card =
    "rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] shadow-sm";

  const row =
    "flex items-center justify-between rounded-2xl border border-[hsl(var(--app-border))] " +
    "bg-[hsl(var(--app-surface))] p-4 shadow-sm hover:brightness-[1.03] transition";

  const chevron = "text-[hsl(var(--app-muted))] opacity-70";

  return (
    <main className={page}>
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
            className="text-xs font-semibold hover:opacity-80"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* BLOQUE LINKS */}
      <div className="mt-8 space-y-4">
        {items.map((it) => (
          <Link key={it.href} href={it.href} prefetch={false} className={row}>
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

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

  return (
    <main className="px-4 pt-16 pb-24">
      <h1 className="text-xl font-bold">Cuenta</h1>
      <p className="mt-1 text-sm text-white/60">
        Tu información y tu actividad.
      </p>

      {/* BLOQUE LOGIN / SESIÓN */}

{status === "loading" ? null : !session ? (
  <div className="mt-6 space-y-3">
    <p className="text-sm text-white/70">
      Iniciá sesión para ver tus pedidos y guardar tus datos.
    </p>
    <GoogleButton />
  </div>
) : (
  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
    <div>
      <div className="text-xs text-white/50">Sesión iniciada</div>
      <div className="font-semibold leading-tight">
        Hola, {session.user?.name || "usuario"}
      </div>
      <div className="text-xs text-white/50">{session.user?.email}</div>
    </div>

    <button
      type="button"
      onClick={() => signOut()}
      className="text-xs text-white/60 hover:text-white"
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
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <div>
        <div className="font-semibold">{it.title}</div>
        <div className="text-sm text-white/60">{it.subtitle}</div>
      </div>
      <div className="text-white/40">›</div>
    </Link>
  ))}
</div>
</main>
);
}

"use client";

import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import GoogleButton from "@/components/GoogleButton";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  // SIN SESION
  if (!session) {
    return (
      <main className="px-4 pt-16 pb-24">
        <h1 className="text-xl font-bold">Mi perfil</h1>
        <p className="mt-1 text-sm text-white/60">
          Iniciá sesión para ver tu cuenta.
        </p>

        <div className="mt-6">
          <GoogleButton callbackUrl="/account/profile" />
        </div>
      </main>
    );
  }

  // CON SESION
  const email = session.user?.email ?? "";
  const name = session.user?.name ?? "";

  return (
    <main className="px-4 pt-16 pb-24">
      <h1 className="text-xl font-bold">Mi perfil</h1>
      <p className="mt-1 text-sm text-white/60">
        Datos de tu cuenta. Sin vueltas.
      </p>

      {/* Tarjeta Google */}
      <div className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black flex items-center gap-3">
        <span className="relative h-5 w-5 shrink-0">
          <Image
            src="/google.svg"
            alt=""
            fill
            sizes="20px"
            className="object-contain"
            priority
          />
        </span>
        <div className="min-w-0">
          {name ? <div className="truncate">{name}</div> : null}
          <div className="truncate text-black/70">{email}</div>
        </div>
      </div>

      {/* Estado Mayorista (placeholder sobrio) */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-xs text-white/60">Estado mayorista</div>
        <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-white/80">
          {/** Si ya tenés el estado en store, después lo conectamos. Por ahora: no mentimos */}
          Consultalo desde “Mayorista”
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="mt-6 w-full rounded-full border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 active:scale-[0.99]"
      >
        Cerrar sesión
      </button>
    </main>
  );
}

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
      <main className="min-h-screen px-4 pt-16 pb-24 text-black dark:text-white">
        <h1 className="text-xl font-bold">Mi perfil</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-white/60">
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
    <main className="min-h-screen px-4 pt-16 pb-24 text-black dark:text-white">
      <h1 className="text-xl font-bold">Mi perfil</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-white/60">
        Datos de tu cuenta. Sin vueltas.
      </p>

      {/* Tarjeta Google */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm dark:border-white/10 dark:bg-white dark:text-black">
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

      {/* Estado Mayorista */}
      <div className="mt-4 rounded-2xl border border-black/10 bg-zinc-50 px-4 py-3 text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
        <div className="text-xs text-zinc-500 dark:text-white/60">
          Estado mayorista
        </div>
        <div className="mt-2 inline-flex items-center rounded-full border border-black/10 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 dark:border-white/10 dark:bg-black/40 dark:text-white/80">
          Consultalo desde “Mayorista”
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="mt-6 w-full rounded-full border border-black/10 bg-white py-3 text-sm font-semibold text-black shadow-sm hover:bg-zinc-50 active:scale-[0.99] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      >
        Cerrar sesión
      </button>
    </main>
  );
}
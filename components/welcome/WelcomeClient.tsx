"use client";

import Image from "next/image";
import Link from "next/link";

// ✅ Elegí UNA de estas dos opciones según tu NextAuth
// Opción A (NextAuth v4): descomentá la siguiente línea
import { signIn } from "next-auth/react";

// Opción B (NextAuth v5): si en tu repo ya usás "@/auth", comentá la de arriba y usá esto:
// import { signIn } from "@/auth";

export default function WelcomeClient() {
  const loginGoogle = async () => {
    // ✅ NextAuth v4: signIn(provider, options, authorizationParams)
    // Fuerza selector de cuenta SIEMPRE
    await signIn(
      "google",
      { callbackUrl: "/" },
      { prompt: "select_account" }
    );

    // ✅ NextAuth v5 (si usás esa): suele ser distinto.
    // Si tu signIn viene de "@/auth", probá esto:
    // await signIn("google", { redirectTo: "/" }, { prompt: "select_account" });
  };

  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6 bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/brand/sh-logo.png"
            alt="SH Rosario"
            width={220}
            height={220}
            priority
          />
        </div>

        {/* Botón Google */}
       <button
  onClick={loginGoogle}
  className="w-full h-12 rounded-full border border-black/10 bg-white text-black font-semibold shadow-sm flex items-center justify-center gap-3"
>
  <img src="/icons/google-g.svg" alt="" className="h-5 w-5" />
  Continuar con Google
</button>

        {/* Entrada sin cuenta (opcional, tradicional) */}
        <Link
          href="/catalog"
          className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
        >
          Entrar sin cuenta
        </Link>
      </div>
    </main>
  );
}


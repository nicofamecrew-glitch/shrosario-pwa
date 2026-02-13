"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

type GoogleButtonProps = {
  /** opcional: a dónde volver luego del login */
  callbackUrl?: string;
  /** opcional: texto del botón */
  label?: string;
  /** opcional: deshabilitar */
  disabled?: boolean;
  /** opcional: className extra */
  className?: string;
};

export default function GoogleButton({
  callbackUrl = "/account",
  label = "Continuar con Google",
  disabled = false,
  className = "",
}: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      disabled={disabled}
      className={[
  "w-full inline-flex items-center justify-center gap-3",
  "h-11 px-4",
  "rounded-lg",
  "bg-white text-[#3c4043] font-medium",
  "border border-[#dadce0]",
  "shadow-sm",
  "transition",
  "hover:bg-[#f7f8f8]",
  "active:scale-[0.99]",
  "disabled:opacity-60 disabled:cursor-not-allowed",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
  className,
].join(" ")}

      aria-label={label}
    >
      <span className="relative h-5 w-5">
        <Image
          src="/google.svg"
          alt=""
          fill
          sizes="20px"
          className="object-contain"
          priority
        />
      </span>
      <span className="text-[15px] leading-none">{label}</span>
    </button>
  );
}

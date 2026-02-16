"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";

export default function WholesaleGate() {
  const router = useRouter();
  const { isWholesale } = useCartStore();

  return (
    <div>
      <button
        className="rounded-full border border-panel px-4 py-2 text-sm"
        onClick={() => router.push("/account/wholesale")}
      >
        {isWholesale ? "Mayorista: gestión" : "Solicitar mayorista"}
      </button>
    </div>
  );
}

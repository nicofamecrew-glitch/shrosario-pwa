import HomeSteamPage from "../components/HomeSteamPage";
import { headers } from "next/headers";
import PromoPopup from "@/components/PromoPopup";
import { getServerSession } from "next-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession();

  const h = await headers();
  const host = h.get("host");
  const proto = process.env.NODE_ENV === "development" ? "http" : "https";

  const res = await fetch(`${proto}://${host}/api/catalog`, {
    cache: "no-store",
  });

  const products = await res.json();

  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]">
      <HomeSteamPage
        products={products as any}
        userName={session?.user?.name ?? null}
      />

      <PromoPopup
        promoId="oro-liquido-2026-08"
        cooldownHours={96}
        title="¿Te quedaste con las ganas?"
        subtitle="Oro Líquido ya está disponible en SH Rosario."
        ctaLabel="Quiero el mío"
        ctaHref="/p/ossono-oro-liquido-30ml"
        waNumberE164="5493413389133"
        waText="Hola, vengo desde la app SH Rosario. Quiero la promo Vexa."
        imageUrl="/promo/promo-vexa.webp"
      />
    </div>
  );
}
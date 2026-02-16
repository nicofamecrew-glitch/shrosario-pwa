import "./globals.css";
import Providers from "./providers";
import ClientShell from "@/app/ClientShell";
import Script from "next/script";
import { Poppins } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import AppTransitions from "@/components/AppTransitions";
import NavDebug from "@/components/dev/NavDebug";

const inter = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production";
 
  return (
    <html lang="es" className="bg-black text-white">
  <body className={inter.className}>



        <Providers>
          <ClientShell>
            {isProd ? <NextTopLoader showSpinner={false} /> : null}

            <AppTransitions>{children}</AppTransitions>

            {isProd ? null : <NavDebug />}
          </ClientShell>
        </Providers>

        {/* Mercado Pago SDK */}
        <Script
          src="https://sdk.mercadopago.com/js/v2"
          strategy="afterInteractive"
        />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

import { Suspense } from "react";
import MpSuccessClient from "./MpSuccessClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="px-4 pt-16 pb-24">Cargando...</div>}>
      <MpSuccessClient />
    </Suspense>
  );
}
  
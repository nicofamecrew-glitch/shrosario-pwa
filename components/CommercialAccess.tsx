"use client";
import { useState } from 'react';
import WholesaleApplication from './WholesaleApplication';

export default function CommercialAccess({ sellersUrl }: { sellersUrl: string | null }) {
  const [kind, setKind] = useState<'wholesale' | 'seller'>('wholesale');
  return <>
    <div className="px-4 pt-16 text-[hsl(var(--app-fg))]">
      <h1 className="text-xl font-bold">Mayorista</h1>
      <p className="mt-1 text-sm text-[hsl(var(--app-muted))]">Elegí el tipo de cuenta que necesitás.</p>
      <div className="mt-4 flex gap-2" role="group" aria-label="Tipo de cuenta">
        {(['wholesale', 'seller'] as const).map(value => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)} className={`rounded-full border px-4 py-2 text-sm ${kind === value ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-500' : 'border-[hsl(var(--app-border))]'}`}>{value === 'seller' ? 'Vendedor' : 'Mayorista'}</button>)}
      </div>
    </div>
    <div hidden={kind !== 'wholesale'}><WholesaleApplication /></div>
    {kind === 'seller' && <section className="mx-4 mt-5 rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] p-4 text-[hsl(var(--app-fg))]">
      <h2 className="font-semibold">Vendedor SH Sellers</h2>
      <p className="mt-2 text-sm text-[hsl(var(--app-muted))]">Administrá tus clientes, visitas y pedidos. Ingresá con Google y solicitá tu cuenta; SH revisa y habilita el acceso.</p>
      {sellersUrl ? <a href={sellersUrl} className="mt-4 inline-block rounded-full bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white">Ingresar como vendedor</a> : <p className="mt-4 text-sm text-[hsl(var(--app-muted))]">El acceso a Sellers estará disponible cuando se publique su enlace.</p>}
    </section>}
  </>;
}

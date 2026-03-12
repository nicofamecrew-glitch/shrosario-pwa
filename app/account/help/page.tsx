export default function Page() {
  const card =
    "mt-4 rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] p-4";

  const muted = "text-[hsl(var(--app-muted))]";

  return (
    <main className="min-h-[100svh] bg-[hsl(var(--app-bg))] px-4 pt-16 pb-24 text-[hsl(var(--app-fg))]">
      <h1 className="text-xl font-bold">Ayuda</h1>
      <p className={`mt-1 text-sm ${muted}`}>Respuestas rápidas.</p>

      {/* Cómo comprar */}
      <div className={card}>
        <h2 className="text-sm font-semibold">Cómo comprar</h2>
        <p className={`mt-1 text-sm ${muted}`}>
          Elegí productos del catálogo, agregalos al carrito y confirmá el
          pedido. Después coordinamos pago y envío.
        </p>
      </div>

      {/* Envíos */}
      <div className={card}>
        <h2 className="text-sm font-semibold">Envíos</h2>
        <p className={`mt-1 text-sm ${muted}`}>
          Los envíos se coordinan según tu ciudad y transporte disponible.
          Confirmamos el costo antes de despachar.
        </p>
      </div>

      {/* Pagos */}
      <div className={card}>
        <h2 className="text-sm font-semibold">Pagos</h2>
        <p className={`mt-1 text-sm ${muted}`}>
          Aceptamos transferencia, efectivo o Mercado Pago. El pedido no se
          cancela automáticamente si el pago no se hace en el momento.
        </p>
      </div>

      {/* WhatsApp */}
      <a
        href="https://wa.me/5493413389133?text=Hola%20Shirt%20House,%20necesito%20ayuda%20con%20mi%20pedido"
        target="_blank"
        className="mt-6 flex w-full items-center justify-center rounded-full bg-[hsl(var(--app-fg))] px-4 py-3 text-sm font-semibold text-[hsl(var(--app-bg))]"
      >
        Hablar por WhatsApp
      </a>
    </main>
  );
}
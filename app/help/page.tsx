export default function HelpPage() {
  return (
    <main className="px-4 pt-16 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Ayuda</h1>
      <p className="text-sm text-white/60">
        Respuestas rápidas. Sin vueltas.
      </p>

      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Cómo comprar</div>
          <p className="mt-1 text-sm text-white/60">
            Elegí productos, agregalos al carrito y confirmá el pedido. Después coordinamos pago y envío.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Envíos</div>
          <p className="mt-1 text-sm text-white/60">
            Se coordinan según tu ciudad y transporte disponible. El costo se confirma antes de despachar.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Pagos</div>
          <p className="mt-1 text-sm text-white/60">
            Transferencia, efectivo y Mercado Pago. No frenamos el pedido por el pago en el momento.
          </p>
        </div>
      </div>

   <a
  href="https://wa.me/549XXXXXXXXXX"
  target="_blank"
  rel="noopener noreferrer"
  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3 font-semibold text-black active:scale-[0.99] leading-none"
>
  <svg
    viewBox="0 0 24 24"
    width="26"
    height="26"
    className="block"
    aria-hidden="true"
  >
    <path
      d="M12 2C6.48 2 2 6.14 2 11.26c0 1.86.62 3.59 1.68 4.99L2 22l5.93-1.55c1.22.63 2.62.99 4.07.99 5.52 0 10-4.14 10-9.18C22 6.14 17.52 2 12 2z"
      fill="#25D366"
    />
   <path
  d="M16.6 14.73c-.22-.11-1.3-.64-1.5-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.48.06-.22-.11-.91-.34-1.74-1.09-.64-.57-1.07-1.29-1.2-1.5-.13-.22-.02-.32.1-.44.1-.1.22-.26.32-.38.11-.13.15-.22.22-.35.07-.13.04-.26-.02-.38-.06-.11-.5-1.2-.69-1.64-.18-.43-.36-.37-.5-.38h-.42c-.15 0-.38.06-.57.29-.2.22-.75.75-.75 1.84s.77 2.13.87 2.28c.11.15 1.51 2.33 3.66 3.26.51.22.91.35 1.22.46.51.16.97.14 1.34.09.4-.06 1.25-.51 1.43-1 .18-.49.18-.92.13-1-.05-.09-.2-.15-.42-.26z"
  fill="#ffffff"
  transform="translate(0 -0.6)"
/>

  </svg>
  Hablar por WhatsApp
</a>


    </main>
  );
}


  



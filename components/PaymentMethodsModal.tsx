"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentMethod = "card" | "cash" | "mp" | "modo";

type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "naranja"
  | "cabal"
  | "maestro"
  | "debito";

type InstallmentRow = {
  label: string; // "6 Cuotas Sin Interés"
  installments: number; // 6
  installment_amount: number; // 88333
  total_amount: number; // 529998
  interest_rate?: number; // 0
  cft?: number; // 0
  tea?: number; // 0
  highlight?: boolean; // para resaltar "sin interés"
};

type Issuer = { id: string; name: string };

function formatARS(n: number) {
  // sin Intl para evitar sorpresas de runtime; si querés Intl lo cambiamos
  const s = Math.round(n).toString();
  const withDots = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${withDots}`;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PaymentMethodsModal({
  open,
  onClose,
  amount,
  productName,
  // Hooks para integrar después:
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  amount: number; // precio del carrito o del producto
  productName?: string;
  onConfirm?: (payload: any) => Promise<void> | void;
}) {
  const [step, setStep] = useState<"method" | "brand" | "issuer" | "installments">("method");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [brand, setBrand] = useState<CardBrand | null>(null);
  const [issuerId, setIssuerId] = useState<string>("");

  const [loading, setLoading] = useState(false);

  // Datos demo (los reemplazás por tu backend / Mercado Pago)
  const issuers: Issuer[] = useMemo(
    () => [
      { id: "bbva", name: "BBVA Banco Francés S.A." },
      { id: "galicia", name: "Banco Galicia" },
      { id: "santafe", name: "Banco Santa Fe" },
      { id: "macro", name: "Banco Macro" },
    ],
    []
  );

  const [rows, setRows] = useState<InstallmentRow[]>([]);

  useEffect(() => {
    if (!open) return;
    // reset al abrir
    setStep("method");
    setMethod(null);
    setBrand(null);
    setIssuerId("");
    setRows([]);
    setLoading(false);
  }, [open]);

  async function fetchInstallmentsDemo() {
    // Reemplazar por fetch real: /api/payments/installments?amount=...&brand=...&issuer=...
    // Esto solo emula tu screenshot:
    const base = amount;

    const demo: InstallmentRow[] = [
      {
        label: "6 Cuotas Sin Interés*",
        installments: 6,
        installment_amount: Math.round(base / 6),
        total_amount: base,
        interest_rate: 0,
        cft: 0,
        tea: 0,
        highlight: true,
      },
      {
        label: "3 Cuotas Sin Interés*",
        installments: 3,
        installment_amount: Math.round(base / 3),
        total_amount: base,
        interest_rate: 0,
        cft: 0,
        tea: 0,
        highlight: true,
      },
      {
        label: "1 Cuota + 10% Extra Off",
        installments: 1,
        installment_amount: Math.round(base * 0.9),
        total_amount: Math.round(base * 0.9),
        interest_rate: 0,
        cft: 0,
        tea: 0,
      },
      {
        label: "9 Cuotas*",
        installments: 9,
        installment_amount: Math.round(base * 1.29 / 9),
        total_amount: Math.round(base * 1.29),
        interest_rate: 29,
        cft: 87,
        tea: 0,
      },
      {
        label: "12 Cuotas*",
        installments: 12,
        installment_amount: Math.round(base * 1.40 / 12),
        total_amount: Math.round(base * 1.40),
        interest_rate: 40,
        cft: 91,
        tea: 0,
      },
    ];

    setRows(demo);
  }

  async function handleChooseMethod(m: PaymentMethod) {
    setMethod(m);

    // Si elegís MP o MODO, normalmente no necesitás wizard de cuotas; redirigís.
    // Igual lo dejamos listo para que decidas.
    if (m === "card") {
      setStep("brand");
    } else {
      // Podés confirmar directo o pasar a otra UI según método
      setStep("method");
    }
  }

  async function handleChooseBrand(b: CardBrand) {
    setBrand(b);
    setStep("issuer");
  }

  async function handleChooseIssuer(id: string) {
    setIssuerId(id);
    setLoading(true);
    try {
      await fetchInstallmentsDemo();
      setStep("installments");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(row?: InstallmentRow) {
    const payload = {
      amount,
      productName,
      method,
      brand,
      issuerId,
      installment: row ?? null,
    };

    setLoading(true);
    try {
      await onConfirm?.(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function back() {
    if (step === "installments") return setStep("issuer");
    if (step === "issuer") return setStep("brand");
    if (step === "brand") return setStep("method");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* overlay */}
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-neutral-900">Seleccioná un método de pago</div>
            <div className="mt-1 text-sm text-neutral-500">
              {productName ? (
                <span className="truncate">{productName} · {formatARS(amount)}</span>
              ) : (
                <span>{formatARS(amount)}</span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="border-t border-neutral-200" />

        {/* content */}
        <div className="px-6 py-6">
          {/* Steps */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className={cn("rounded-full px-3 py-1", step === "method" && "bg-neutral-900 text-white")}>Método</span>
            <span>→</span>
            <span className={cn("rounded-full px-3 py-1", step === "brand" && "bg-neutral-900 text-white")}>Tarjeta</span>
            <span>→</span>
            <span className={cn("rounded-full px-3 py-1", step === "issuer" && "bg-neutral-900 text-white")}>Banco</span>
            <span>→</span>
            <span className={cn("rounded-full px-3 py-1", step === "installments" && "bg-neutral-900 text-white")}>Cuotas</span>
          </div>

          {/* Step: method */}
          {step === "method" && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <MethodTile
                title="Tarjetas Crédito/Débito"
                subtitle="Cuotas y bancos"
                selected={method === "card"}
                onClick={() => handleChooseMethod("card")}
                icon="💳"
              />
              <MethodTile
                title="Pago Contado"
                subtitle="Transferencia / efectivo"
                selected={method === "cash"}
                onClick={() => handleChooseMethod("cash")}
                icon="💵"
              />
              <MethodTile
                title="Mercado Pago"
                subtitle="Checkout / QR"
                selected={method === "mp"}
                onClick={() => handleChooseMethod("mp")}
                icon="🟦"
              />
              <MethodTile
                title="MODO"
                subtitle="Billetera"
                selected={method === "modo"}
                onClick={() => handleChooseMethod("modo")}
                icon="🟩"
              />
            </div>
          )}

          {/* Step: brand */}
          {step === "brand" && (
            <div>
              <div className="mb-3 text-sm font-semibold text-neutral-900">Seleccioná tu Tarjeta</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <BrandTile label="VISA" selected={brand === "visa"} onClick={() => handleChooseBrand("visa")} />
                <BrandTile label="Mastercard" selected={brand === "mastercard"} onClick={() => handleChooseBrand("mastercard")} />
                <BrandTile label="Amex" selected={brand === "amex"} onClick={() => handleChooseBrand("amex")} />
                <BrandTile label="Naranja" selected={brand === "naranja"} onClick={() => handleChooseBrand("naranja")} />
                <BrandTile label="Cabal" selected={brand === "cabal"} onClick={() => handleChooseBrand("cabal")} />
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={back} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
                  ← Volver
                </button>
              </div>
            </div>
          )}

          {/* Step: issuer */}
          {step === "issuer" && (
            <div>
              <div className="mb-3 text-sm font-semibold text-neutral-900">Elegí tu Banco emisor</div>
              <div className="flex items-center gap-3">
                <select
                  value={issuerId}
                  onChange={(e) => setIssuerId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="" disabled>Seleccionar banco…</option>
                  {issuers.map((it) => (
                    <option key={it.id} value={it.id}>{it.name}</option>
                  ))}
                </select>

                <button
                  disabled={!issuerId || loading}
                  onClick={() => handleChooseIssuer(issuerId)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold",
                    (!issuerId || loading)
                      ? "bg-neutral-200 text-neutral-500"
                      : "bg-neutral-900 text-white hover:bg-neutral-800"
                  )}
                >
                  {loading ? "Cargando…" : "Ver cuotas"}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={back} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
                  ← Volver
                </button>
              </div>
            </div>
          )}

          {/* Step: installments */}
          {step === "installments" && (
            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">Tarjeta de crédito</div>
                  <div className="mt-1 text-sm text-neutral-600">{formatARS(amount)}</div>
                </div>

                <button
                  onClick={() => handleConfirm()}
                  disabled={loading}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold",
                    loading ? "bg-neutral-200 text-neutral-500" : "bg-neutral-900 text-white hover:bg-neutral-800"
                  )}
                >
                  Confirmar método
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="grid grid-cols-12 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-600">
                  <div className="col-span-5">Cantidad de cuotas</div>
                  <div className="col-span-3">Valor cuota</div>
                  <div className="col-span-2">CFT</div>
                  <div className="col-span-2">TEA</div>
                </div>

                {rows.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => handleConfirm(r)}
                    className={cn(
                      "grid w-full grid-cols-12 items-center px-4 py-4 text-left text-sm hover:bg-neutral-50",
                      r.highlight && "bg-orange-50/60"
                    )}
                  >
                    <div className={cn("col-span-5 font-semibold", r.highlight ? "text-orange-600" : "text-neutral-900")}>
                      {r.label}
                    </div>
                    <div className="col-span-3 font-semibold text-neutral-900">{formatARS(r.installment_amount)}</div>
                    <div className="col-span-2 text-neutral-700">{typeof r.cft === "number" ? `${r.cft}%` : "-"}</div>
                    <div className="col-span-2 text-neutral-700">{typeof r.tea === "number" ? `${r.tea}%` : "-"}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={back} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
                  ← Volver
                </button>
                <div className="text-xs text-neutral-500">*Ejemplo UI. Las condiciones reales salen del proveedor.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MethodTile({
  title,
  subtitle,
  icon,
  selected,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition",
        selected ? "border-red-500 ring-2 ring-red-200" : "border-neutral-200 hover:border-neutral-300"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="mt-3 text-sm font-semibold text-neutral-900">{title}</div>
      <div className="mt-1 text-xs text-neutral-500">{subtitle}</div>
    </button>
  );
}

function BrandTile({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-16 items-center justify-center rounded-xl border text-sm font-semibold transition",
        selected ? "border-red-500 ring-2 ring-red-200" : "border-neutral-200 hover:border-neutral-300"
      )}
    >
      {label}
    </button>
  );
}

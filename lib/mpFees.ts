// lib/mpFees.ts

export const MP_CHECKOUT_FEES = {
  // Contado: vos absorbés 4,37%, el cliente ve el mismo precio
  cash_fee: 0.0437,

  // Cuotas (costos MP para el comercio) - Checkout
  installments: {
    2: 0.1861,
    3: 0.2404,
    6: 0.3895,
    9: 0.6038,
    12: 0.7973,
  } as Record<number, number>,
};

export function roundPeso(n: number) {
  // redondeo a peso
  return Math.round(n);
}

export function calcInstallmentPlan(priceCash: number, n: number) {
  const fee = MP_CHECKOUT_FEES.installments[n] ?? 0;
  const total = priceCash * (1 + fee);
  const per = total / n;

  return {
    installments: n,
    fee, // decimal
    total: roundPeso(total),
    per: roundPeso(per),
  };
}

export function calcAllPlans(priceCash: number, ns: number[] = [2, 3, 6, 9, 12]) {
  return ns
    .filter((n) => n > 1)
    .map((n) => calcInstallmentPlan(priceCash, n))
    .sort((a, b) => a.installments - b.installments);
}

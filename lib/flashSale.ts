import type { Product } from "@/lib/types";

const FLASH_COUNT = 10;
const FLASH_DURATION_MS = 72 * 60 * 60 * 1000;

function hashString(input: string) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;

    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const arr = [...items];
  const random = seededRandom(seed);

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export function getFlashWindow(now = Date.now()) {
  const windowIndex = Math.floor(now / FLASH_DURATION_MS);
  const startsAt = windowIndex * FLASH_DURATION_MS;
  const endsAt = startsAt + FLASH_DURATION_MS;

  return {
    windowIndex,
    startsAt,
    endsAt,
  };
}

export function getFlashProducts(
  products: Product[],
  now = Date.now()
) {
  const safeProducts = Array.isArray(products)
    ? products.filter((p) => p?.id)
    : [];

  if (safeProducts.length <= FLASH_COUNT) {
    return safeProducts;
  }

  const { windowIndex } = getFlashWindow(now);

  // Tanda anterior
  const previousSeed = hashString(
    `flash-${windowIndex - 1}`
  );

  const previous = shuffleWithSeed(
    safeProducts,
    previousSeed
  ).slice(0, FLASH_COUNT);

  const previousIds = new Set(
    previous.map((p) => p.id)
  );

  // Excluimos los 10 anteriores
  const eligible = safeProducts.filter(
    (p) => !previousIds.has(p.id)
  );

  const currentSeed = hashString(
    `flash-${windowIndex}`
  );

  return shuffleWithSeed(
    eligible,
    currentSeed
  ).slice(0, FLASH_COUNT);
}
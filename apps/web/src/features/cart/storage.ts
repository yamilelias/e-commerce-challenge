import type { CartLine } from "@/lib/api/types";

export const CART_STORAGE_KEY = "ecommerce_cart_v1";

export function normalizeCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<number, number>();
  for (const line of value) {
    if (typeof line !== "object" || line === null || Array.isArray(line)) continue;
    const { product_id, quantity } = line as Partial<CartLine>;
    if (!Number.isSafeInteger(product_id) || !Number.isSafeInteger(quantity) || product_id! <= 0 || quantity! < 1 || quantity! > 999) continue;
    byId.set(product_id!, Math.min(999, (byId.get(product_id!) ?? 0) + quantity!));
  }
  return [...byId].map(([product_id, quantity]) => ({ product_id, quantity }));
}

export function readCart(): CartLine[] {
  try { return normalizeCart(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]")); }
  catch { return []; }
}

export function writeCart(lines: CartLine[]): void {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines)); }
  catch { /* Cart remains in memory if storage is unavailable. */ }
}

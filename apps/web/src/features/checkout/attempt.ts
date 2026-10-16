import type { OrderRequest } from "@/lib/api/types";

const ATTEMPT_KEY = "ecommerce_checkout_attempt_v1";

export type CheckoutAttempt = { key: string; fingerprint: string; body: OrderRequest };

export function normalizeOrder(body: OrderRequest): OrderRequest {
  return {
    buyer_name: body.buyer_name.trim(),
    buyer_email: body.buyer_email.trim().toLowerCase(),
    items: [...body.items].sort((a, b) => a.product_id - b.product_id),
  };
}

export function orderFingerprint(body: OrderRequest): string {
  return JSON.stringify(normalizeOrder(body));
}

export function readAttempt(): CheckoutAttempt | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const attempt = value as Partial<CheckoutAttempt>;
    if (typeof attempt.key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attempt.key) || typeof attempt.fingerprint !== "string" || typeof attempt.body !== "object" || attempt.body === null || Array.isArray(attempt.body)) return null;
    if (typeof attempt.body.buyer_name !== "string" || typeof attempt.body.buyer_email !== "string" || !Array.isArray(attempt.body.items) || attempt.fingerprint !== orderFingerprint(attempt.body as OrderRequest)) return null;
    return attempt as CheckoutAttempt;
  } catch { return null; }
}

export function prepareAttempt(body: OrderRequest): CheckoutAttempt {
  const normalized = normalizeOrder(body);
  const fingerprint = orderFingerprint(normalized);
  const previous = readAttempt();
  if (previous?.fingerprint === fingerprint) return previous;
  if (previous) throw new Error("An earlier checkout attempt must be resolved or reset first.");
  const attempt = { key: crypto.randomUUID(), fingerprint, body: normalized };
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  return attempt;
}

export function clearAttempt(): void {
  try { sessionStorage.removeItem(ATTEMPT_KEY); }
  catch { /* The paid response still confirms the order. */ }
}

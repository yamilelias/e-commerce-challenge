"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiRequestError, createOrder } from "@/lib/api/client";
import { useCart } from "@/features/cart/CartProvider";
import { useCartProducts } from "@/features/cart/useCartProducts";
import { clearAttempt, prepareAttempt, readAttempt } from "@/features/checkout/attempt";
import { formatUsd } from "@/lib/money";
import type { OrderRequest } from "@/lib/api/types";

export function CheckoutPageClient() {
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const { items, loading } = useCartProducts(lines);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [conflict, setConflict] = useState(false);
  const [unresolved, setUnresolved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const attempt = readAttempt();
      if (attempt) { setName(attempt.body.buyer_name); setEmail(attempt.body.buyer_email); setUnresolved(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const availabilityIssue = lines.some((line) => !items[line.product_id]?.product || items[line.product_id].product!.stock < line.quantity);
  const estimate = lines.reduce((total, line) => total + (items[line.product_id]?.product?.price_cents ?? 0) * line.quantity, 0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || unresolved || !ready || loading || lines.length === 0 || availabilityIssue) return;
    const body: OrderRequest = { buyer_name: name.trim(), buyer_email: email.trim().toLowerCase(), items: lines };
    let key: string;
    try { key = prepareAttempt(body).key; }
    catch (reason) { setError(reason instanceof Error && reason.message.includes("earlier checkout") ? "Resolve the previous checkout attempt before starting a changed order." : "Browser session storage is unavailable. Enable it before placing an order so a retry remains safe."); setUnresolved(Boolean(readAttempt())); return; }
    setUnresolved(true);
    await performOrder(body, key);
  }

  async function retryPrevious() {
    if (pending || conflict) return;
    const attempt = readAttempt();
    if (!attempt) { setError("The previous attempt is no longer available. Review your cart before starting again."); setUnresolved(false); return; }
    await performOrder(attempt.body, attempt.key);
  }

  function resetAttempt() {
    if (!window.confirm("The previous order might have completed. Starting a new order could create another purchase. Start a new order anyway?")) return;
    clearAttempt();
    setUnresolved(false);
    setConflict(false);
    setError("");
    setFields({});
  }

  async function performOrder(body: OrderRequest, key: string) {
    setPending(true);
    setError("");
    setFields({});
    try {
      const { data } = await createOrder(body, key);
      if (data.status !== "paid" || !data.receipt_token || !data.reference) throw new Error("The order response was incomplete. Retry with the same details.");
      clearAttempt();
      clear();
      router.replace(`/orders/${encodeURIComponent(data.reference)}?token=${encodeURIComponent(data.receipt_token)}`);
    } catch (reason) {
      if (reason instanceof ApiRequestError) {
        setError(reason.message);
        setFields(reason.fields);
        if (reason.code === "IDEMPOTENCY_CONFLICT") setConflict(true);
        const definitive = ["VALIDATION_ERROR", "INVALID_FIELD", "INSUFFICIENT_STOCK", "PRODUCT_UNAVAILABLE", "BAD_JSON", "BAD_QUERY"].includes(reason.code);
        if (definitive) { clearAttempt(); setUnresolved(false); }
        else setUnresolved(true);
      } else {
        setError("The order result could not be confirmed. Retry with the same details; your cart is still here.");
        setUnresolved(true);
      }
    } finally { setPending(false); }
  }

  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
    <h1 className="editorial text-4xl font-semibold">Checkout</h1>
    {!ready || loading ? <p className="mt-8" role="status">Checking cart…</p> : lines.length === 0 && !unresolved ? <div className="mt-8 rounded-box bg-base-100 p-8"><p>Your cart is empty.</p><Link className="btn btn-primary mt-5" href="/products">Browse products</Link></div> : <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form className="rounded-box border border-base-300 bg-base-100 p-6" onSubmit={submit}>
        <h2 className="editorial text-2xl font-semibold">Your details</h2>
        <p className="mt-2 text-sm text-base-content/70">Payment is simulated. Your order total is confirmed by the server.</p>
        <label className="mt-6 flex flex-col gap-2"><span className="font-semibold">Name</span><input className="input input-bordered w-full" required maxLength={200} autoComplete="name" value={name} disabled={unresolved} aria-invalid={Boolean(fields.buyer_name)} aria-describedby={fields.buyer_name ? "name-error" : undefined} onChange={(event) => setName(event.target.value)} /></label>
        {fields.buyer_name && <p id="name-error" className="mt-1 text-sm text-error">{fields.buyer_name.join(" ")}</p>}
        <label className="mt-5 flex flex-col gap-2"><span className="font-semibold">Email</span><input className="input input-bordered w-full" type="email" required maxLength={254} autoComplete="email" value={email} disabled={unresolved} aria-invalid={Boolean(fields.buyer_email)} aria-describedby={fields.buyer_email ? "email-error" : undefined} onChange={(event) => setEmail(event.target.value)} /></label>
        {fields.buyer_email && <p id="email-error" className="mt-1 text-sm text-error">{fields.buyer_email.join(" ")}</p>}
        {error && <div className="alert alert-error mt-6" role="alert">{error}</div>}
        {fields.items && <p className="mt-2 text-sm text-error">{fields.items.join(" ")}</p>}
        {availabilityIssue && <div className="alert alert-warning mt-6" role="alert">An item is unavailable or exceeds current stock. <Link className="link" href="/cart">Update your cart</Link> before checkout.</div>}
        {unresolved && <div className="alert alert-warning mt-6" role="status">{conflict ? "This attempt cannot be retried with its key. Review whether the purchase completed before starting over." : "A previous purchase may have completed. Retry its original details to confirm the result before changing the order."}</div>}
        {unresolved ? <div className="mt-6 flex flex-wrap gap-3"><button className="btn btn-primary" type="button" disabled={pending || conflict} onClick={retryPrevious}>{pending ? "Confirming purchase…" : "Retry previous attempt"}</button><button className="btn btn-outline" type="button" disabled={pending} onClick={resetAttempt}>Start a new order</button></div> : <button className="btn btn-primary mt-7 w-full" type="submit" disabled={pending || availabilityIssue}>{pending ? "Confirming purchase…" : "Place simulated order"}</button>}
      </form>
      <aside className="h-fit rounded-box border border-base-300 bg-base-100 p-6" aria-label="Order summary"><h2 className="editorial text-2xl font-semibold">Order summary</h2><ul className="mt-5 divide-y divide-base-300">{lines.map((line) => <li className="flex justify-between gap-4 py-3" key={line.product_id}><span>{items[line.product_id]?.product?.name ?? `Product #${line.product_id}`} × {line.quantity}</span><span>{items[line.product_id]?.product ? formatUsd(items[line.product_id].product!.price_cents * line.quantity) : "Unavailable"}</span></li>)}</ul><div className="mt-5 flex justify-between border-t border-base-300 pt-4 text-lg font-bold"><span>Estimated total</span><span>{formatUsd(estimate)}</span></div><p className="mt-2 text-xs text-base-content/70">The paid receipt uses the server total.</p><Link className="link link-primary mt-4 inline-block text-sm" href="/cart">Edit cart</Link></aside>
    </div>}
  </div>;
}

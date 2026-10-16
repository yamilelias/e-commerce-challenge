"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getOrder } from "@/lib/api/client";
import type { OrderReceipt } from "@/lib/api/types";
import { formatUsd } from "@/lib/money";

const inaccessible = "This receipt is unavailable. Check the full link you received after purchase.";

export function ReceiptPageClient({ reference }: { reference: string }) {
  const token = useSearchParams().get("token") ?? "";
  const valid = /^[0-9a-f]{64}$/.test(token) && /^[A-Za-z0-9-]+$/.test(reference);
  const [state, setState] = useState<{ key: string; receipt: OrderReceipt | null; error: string }>({ key: "", receipt: null, error: "" });
  const key = `${reference}:${token}`;
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    getOrder(reference, token, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setState({ key, receipt: data, error: "" }); })
      .catch(() => { if (!controller.signal.aborted) setState({ key, receipt: null, error: inaccessible }); });
    return () => controller.abort();
  }, [reference, token, valid, key]);

  if (!valid || (state.key === key && state.error)) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><h1 className="editorial text-4xl">Receipt unavailable</h1><p className="mt-4">{inaccessible}</p><Link className="btn btn-primary mt-7" href="/products">Back to shop</Link></div>;
  if (state.key !== key) return <div className="mx-auto max-w-4xl px-4 py-20" role="status">Loading receipt…</div>;
  const receipt = state.receipt!;
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
    <div className="rounded-box border border-base-300 bg-base-100 p-6 sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-success">Payment confirmed</p>
      <h1 className="editorial mt-3 text-4xl font-semibold">Thank you for your order</h1>
      <p className="mt-3 text-base-content/70">Reference {receipt.reference}</p>
      <dl className="mt-8 grid gap-3 border-y border-base-300 py-6 text-sm sm:grid-cols-2"><div><dt className="text-base-content/60">Purchased by</dt><dd>{receipt.buyer_name}</dd></div><div><dt className="text-base-content/60">Email</dt><dd>{receipt.buyer_email}</dd></div><div><dt className="text-base-content/60">Paid at</dt><dd>{new Date(receipt.paid_at).toLocaleString("en-US")}</dd></div><div><dt className="text-base-content/60">Status</dt><dd className="capitalize">{receipt.status}</dd></div></dl>
      <h2 className="editorial mt-8 text-2xl font-semibold">Items</h2>
      <ul className="mt-3 divide-y divide-base-300">{receipt.items.map((item) => <li className="flex justify-between gap-5 py-4" key={item.product_id}><div><p className="font-semibold">{item.name}</p><p className="text-sm text-base-content/70">{item.sku} · {item.quantity} × {formatUsd(item.unit_price_cents)}</p></div><strong>{formatUsd(item.line_total_cents)}</strong></li>)}</ul>
      <div className="mt-5 flex justify-between border-t border-base-300 pt-5 text-xl font-bold"><span>Total paid</span><span>{formatUsd(receipt.total_cents)}</span></div>
      <Link className="btn btn-primary mt-8" href="/products">Continue shopping</Link>
    </div>
  </div>;
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiptPageClient } from "./ReceiptPageClient";

export const metadata: Metadata = { title: "Order receipt", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-16" role="status">Loading receipt…</div>}><ReceiptPageClient reference={reference} /></Suspense>;
}

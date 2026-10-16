import { Suspense } from "react";
import { AdminProductsClient } from "./AdminProductsClient";

export default function AdminProductsPage() {
  return <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12" role="status">Loading products…</div>}><AdminProductsClient /></Suspense>;
}

import { Suspense } from "react";
import { CatalogPageClient } from "./CatalogPageClient";

export const metadata = { title: "Shop products" };

export default function ProductsPage() {
  return <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16" role="status">Loading catalog…</div>}><CatalogPageClient /></Suspense>;
}

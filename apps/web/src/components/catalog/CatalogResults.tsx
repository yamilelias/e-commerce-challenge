"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/products/ProductCard";
import { getProducts, productQueryString, type ProductQuery } from "@/lib/api/client";
import type { ListResponse, Product } from "@/lib/api/types";
import { Reveal } from "@/components/home/motion/Reveal";
import styles from "./ProductPages.module.css";

export function CatalogResults({ query, retryKey = 0, compact = false }: { query: ProductQuery; retryKey?: number; compact?: boolean }) {
  const [state, setState] = useState<{ key: string; result: ListResponse<Product> | null; error: string }>({ key: "", result: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const queryKey = JSON.stringify(query);
  const requestKey = `${queryKey}:${retryKey}:${attempt}`;
  const loading = state.key !== requestKey;
  const result = loading ? null : state.result;
  const error = loading ? "" : state.error;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getProducts(query, controller.signal)
      .then((data) => { if (active) setState({ key: requestKey, result: data, error: "" }); })
      .catch((reason: unknown) => { if (active && !controller.signal.aborted) setState({ key: requestKey, result: null, error: reason instanceof Error ? reason.message : "Products could not be loaded." }); });
    return () => { active = false; controller.abort(); };
    // queryKey represents the URL-backed query; request cancellation prevents stale results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  if (loading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-live="polite"><span className="sr-only">Loading products…</span>{Array.from({ length: compact ? 4 : 8 }, (_, index) => <div className="card h-80 animate-pulse bg-base-100" key={index}><div className="h-44 bg-base-300" /><div className="card-body gap-3"><div className="h-4 w-1/2 rounded bg-base-300" /><div className="h-5 w-3/4 rounded bg-base-300" /><div className="h-4 w-full rounded bg-base-300" /></div></div>)}</div>;
  if (error) return <div className="alert alert-error flex-wrap" role="alert"><span>{error}</span><button className="btn btn-sm" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>;
  if (!result || result.data.length === 0) return <div className="rounded-box border border-base-300 bg-base-100 p-10 text-center"><h2 className="editorial text-2xl">No products found</h2><p className="mt-2 text-base-content/70">Try a different search or category.</p><Link className="btn btn-outline mt-5" href="/products">View all products</Link></div>;

  return (
    <>
      <div className={styles.productGrid} aria-live="polite">
        {result.data.map((product, index) => <Reveal key={product.id} index={index} className={styles.productReveal}><ProductCard product={product} variant="editorial" /></Reveal>)}
      </div>
      {!compact && <p className="mt-5 text-sm text-base-content/70">Showing {result.data.length} of {result.pagination.total} products</p>}
      {!compact && result.pagination.pages > 1 && <nav className="mt-7 flex flex-wrap items-center justify-center gap-3" aria-label="Catalog pages">
        {result.pagination.page > 1 && <Link className="btn btn-outline" href={`/products?${productQueryString({ ...query, page: result.pagination.page - 1 })}`}>Previous</Link>}
        <span className="text-sm">Page {result.pagination.page} of {result.pagination.pages}</span>
        {result.pagination.page < result.pagination.pages && <Link className="btn btn-outline" href={`/products?${productQueryString({ ...query, page: result.pagination.page + 1 })}`}>Next</Link>}
      </nav>}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiRequestError, getProduct } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { useCart } from "@/features/cart/CartProvider";
import { formatUsd } from "@/lib/money";
import { ProductImage } from "@/components/products/ProductImage";

export function ProductDetail({ id }: { id: string }) {
  const numericId = Number(id);
  const [state, setState] = useState<{ id: string; product: Product | null; error: string; missing: boolean }>({ id: "", product: null, error: "", missing: false });
  const [added, setAdded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { add } = useCart();

  useEffect(() => {
    if (!Number.isSafeInteger(numericId) || numericId < 1) return;
    const controller = new AbortController();
    getProduct(numericId, controller.signal)
      .then(({ data }) => setState({ id, product: data, error: "", missing: false }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ id, product: null, error: error instanceof Error ? error.message : "Product could not be loaded.", missing: error instanceof ApiRequestError && error.status === 404 }); });
    return () => controller.abort();
  }, [id, numericId, attempt]);

  if (!Number.isSafeInteger(numericId) || numericId < 1 || (state.id === id && state.missing)) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><h1 className="editorial text-4xl">Product unavailable</h1><p className="mt-3">This product could not be found.</p><Link className="btn btn-primary mt-7" href="/products">Back to products</Link></div>;
  if (state.id !== id) return <div className="mx-auto max-w-5xl px-4 py-20" role="status">Loading product…</div>;
  if (state.error) return <div className="mx-auto max-w-5xl px-4 py-20"><h1 className="editorial text-4xl">Product details</h1><div className="alert alert-error mt-6" role="alert">{state.error} <button className="btn btn-sm" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div></div>;
  const product = state.product!;
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
    <Link className="link link-primary text-sm" href="/products">← All products</Link>
    <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-14">
      <figure>
        <ProductImage product={product} className="aspect-square rounded-box text-[10rem]" />
        {product.image_url && (product.image_source_url || product.image_attribution || product.image_license) && <figcaption className="mt-2 text-xs text-base-content/70">
          Photo{product.image_attribution ? ` by ${product.image_attribution}` : ""}
          {product.image_source_url && <> · <a className="link" href={product.image_source_url} target="_blank" rel="noopener noreferrer">Source</a></>}
          {product.image_license && <> · {product.image_license_url ? <a className="link" href={product.image_license_url} target="_blank" rel="noopener noreferrer">{product.image_license}</a> : product.image_license}</>}
        </figcaption>}
      </figure>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{product.category.name}</p>
        <h1 className="editorial mt-3 text-4xl font-semibold sm:text-5xl">{product.name}</h1>
        <p className="mt-3 text-sm text-base-content/60">SKU {product.sku}</p>
        <p className="mt-8 text-3xl font-bold">{formatUsd(product.price_cents)}</p>
        <p className="mt-5 leading-relaxed text-base-content/80">{product.description || "No description provided."}</p>
        <dl className="mt-7 grid gap-2 border-y border-base-300 py-5 text-sm"><div className="flex justify-between gap-4"><dt>Weight</dt><dd>{product.weight_kg} kg</dd></div><div className="flex justify-between gap-4"><dt>Availability</dt><dd>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</dd></div></dl>
        <button className="btn btn-primary mt-7 w-full sm:w-auto" disabled={product.stock === 0} onClick={() => { add(product.id); setAdded(true); }}>{product.stock > 0 ? "Add to cart" : "Out of stock"}</button>
        {added && <p className="mt-3 text-sm text-success" role="status">Added to cart. <Link className="link" href="/cart">View cart</Link></p>}
      </div>
    </div>
  </div>;
}

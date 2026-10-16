"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/CartProvider";
import { useCartProducts } from "@/features/cart/useCartProducts";
import { formatUsd } from "@/lib/money";
import { ProductImage } from "@/components/products/ProductImage";

export function CartPageClient() {
  const { lines, ready, setQuantity, remove, clear } = useCart();
  const { loading, items } = useCartProducts(lines);
  const issue = lines.some((line) => !items[line.product_id]?.product || items[line.product_id].product!.stock < line.quantity);
  const total = lines.reduce((sum, line) => sum + (items[line.product_id]?.product?.price_cents ?? 0) * line.quantity, 0);

  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
    <h1 className="editorial text-4xl font-semibold">Your cart</h1>
    {!ready || loading ? <p className="mt-10" role="status">Loading cart…</p> : lines.length === 0 ? <div className="mt-10 rounded-box border border-base-300 bg-base-100 p-10 text-center"><p>Your cart is empty.</p><Link className="btn btn-primary mt-5" href="/products">Browse products</Link></div> : <>
      <ul className="mt-8 space-y-4">{lines.map((line) => {
        const item = items[line.product_id];
        const product = item?.product;
        return <li className="rounded-box border border-base-300 bg-base-100 p-5" key={line.product_id}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-4">{product && <Link href={`/products/${product.id}`} aria-label={`View ${product.name}`}><ProductImage product={product} className="h-20 w-20 shrink-0 rounded-lg text-3xl" /></Link>}<div><h2 className="font-semibold">{product ? <Link className="link link-hover" href={`/products/${product.id}`}>{product.name}</Link> : `Product #${line.product_id}`}</h2><p className="text-sm text-base-content/70">{product ? formatUsd(product.price_cents) : "Price unavailable"}</p></div></div><button className="btn btn-ghost btn-sm text-error" onClick={() => remove(line.product_id)} aria-label={`Remove product ${product?.name ?? line.product_id}`}>Remove</button></div>
          <div className="mt-4 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm">Quantity<input className="input input-bordered w-24" type="number" min={1} max={999} value={line.quantity} onChange={(event) => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 999) setQuantity(line.product_id, value); }} /></label>{product && <span className="font-semibold">{formatUsd(product.price_cents * line.quantity)}</span>}</div>
          {item?.error === "unavailable" && <p className="mt-3 text-sm text-error" role="alert">This product is no longer available. Remove it to continue.</p>}
          {item?.error === "network" && <p className="mt-3 text-sm text-error" role="alert">Could not check this product. Refresh and try again.</p>}
          {product && product.stock < line.quantity && <p className="mt-3 text-sm text-error" role="alert">Only {product.stock} available. Reduce the quantity or remove this item.</p>}
        </li>;
      })}</ul>
      <div className="mt-8 flex flex-col items-start gap-4 rounded-box bg-base-100 p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-base-content/70">Estimated subtotal</p><p className="text-3xl font-bold">{formatUsd(total)}</p><p className="mt-1 text-xs text-base-content/60">Final total is set by the server at checkout.</p></div><div className="flex flex-wrap gap-3"><button className="btn btn-ghost" onClick={clear}>Empty cart</button><Link className={`btn btn-primary ${issue ? "btn-disabled" : ""}`} href={issue ? "/cart" : "/checkout"} aria-disabled={issue}>Checkout</Link></div></div>
    </>}
  </div>;
}

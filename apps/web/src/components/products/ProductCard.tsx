import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { formatUsd } from "@/lib/money";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card overflow-hidden border border-base-300 bg-base-100 shadow-sm">
      <div className="product-placeholder flex aspect-[4/3] items-center justify-center text-center" aria-hidden="true">
        <span className="editorial text-6xl font-semibold text-primary/70">{product.category.name.slice(0, 1).toUpperCase()}</span>
      </div>
      <div className="card-body gap-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{product.category.name}</p>
        <h3 className="card-title text-lg leading-snug"><Link className="hover:underline" href={`/products/${product.id}`}>{product.name}</Link></h3>
        <p className="line-clamp-2 min-h-10 text-sm text-base-content/70">{product.description || `SKU ${product.sku}`}</p>
        <div className="card-actions mt-3 items-center justify-between gap-2">
          <strong className="text-lg">{formatUsd(product.price_cents)}</strong>
          {product.stock > 0 ? <Link className="btn btn-primary btn-sm" href={`/products/${product.id}`}>View product</Link> : <span className="badge badge-outline">Out of stock</span>}
        </div>
      </div>
    </article>
  );
}

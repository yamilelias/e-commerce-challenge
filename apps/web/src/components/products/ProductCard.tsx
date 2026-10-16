import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { formatUsd } from "@/lib/money";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card overflow-hidden border border-base-300 bg-base-100 shadow-sm">
      <Link href={`/products/${product.id}`} aria-label={`View ${product.name}`}><ProductImage product={product} className="aspect-[4/3] text-6xl" /></Link>
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

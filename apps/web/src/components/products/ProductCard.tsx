import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { formatUsd } from "@/lib/money";
import { ProductImage } from "./ProductImage";
import styles from "./ProductCard.module.css";

export function ProductCard({ product, variant = "default" }: { product: Product; variant?: "default" | "editorial" }) {
  if (variant === "editorial") return <article className={styles.editorialCard}>
    <Link className={styles.imageLink} href={`/products/${product.id}`} aria-label={`View ${product.name}`}><ProductImage product={product} hoverAlternate className={`${styles.image} text-6xl`} /></Link>
    <div className={styles.editorialBody}>
      <p className={styles.category}>{product.category.name}</p>
      <h3 className={styles.title}><Link href={`/products/${product.id}`}>{product.name}</Link></h3>
      <p className={styles.price}>{formatUsd(product.price_cents)}</p>
      {product.stock === 0 && <p className={styles.stock}>Out of stock</p>}
    </div>
  </article>;
  return (
    <article className={`card overflow-hidden border border-base-300 bg-base-100 shadow-sm ${styles.hoverCard}`}>
      <Link href={`/products/${product.id}`} aria-label={`View ${product.name}`}><ProductImage product={product} hoverAlternate className={`aspect-[4/3] text-6xl ${styles.defaultImage}`} /></Link>
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

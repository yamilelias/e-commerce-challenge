import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { ProductCard } from "@/components/products/ProductCard";
import { Reveal } from "@/components/home/motion/Reveal";
import styles from "./sections.module.css";

type FeaturedProductsProps = { products: Product[]; loading?: boolean; error?: boolean };

export function FeaturedProducts({ products, loading = false, error = false }: FeaturedProductsProps) {
  return (
    <section id="featured" className={styles.featured} aria-labelledby="featured-heading">
      <div className={styles.container}>
        <Reveal>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>From the catalog</p>
              <h2 id="featured-heading" className={styles.heading}>Worth a closer look.</h2>
            </div>
            <Link className={styles.textLink} href="/products">See all products <span aria-hidden="true">↗</span></Link>
          </div>
        </Reveal>
        {loading ? (
          <div className={styles.statusPanel} role="status" aria-live="polite">Loading products…</div>
        ) : error ? (
          <div className={styles.statusPanel} role="alert">
            <p>Products could not be loaded right now.</p>
            <Link className={styles.textLink} href="/products">Browse the catalog <span aria-hidden="true">↗</span></Link>
          </div>
        ) : products.length === 0 ? (
          <div className={styles.statusPanel} role="status">
            <p>There are no products to feature yet.</p>
            <Link className={styles.textLink} href="/products">Visit the catalog <span aria-hidden="true">↗</span></Link>
          </div>
        ) : (
          <div className={styles.featuredGrid}>
            {products.slice(0, 8).map((product, index) => (
              <Reveal key={product.id} index={index} className={styles.productReveal}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

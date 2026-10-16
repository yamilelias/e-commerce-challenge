"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories, getProducts } from "@/lib/api/client";
import type { Category, Product } from "@/lib/api/types";
import { CollectionEditorial } from "./CollectionEditorial";
import { FeaturedProducts } from "./FeaturedProducts";
import { BrandStory } from "./BrandStory";
import styles from "./sections.module.css";

type LoadState<T> = { data: T; loading: boolean; error: boolean };

function selectFeaturedProducts(products: Product[]): Product[] {
  const seenNames = new Set<string>();

  return products.filter((product) => {
    const name = product.name.trim();
    const key = name.toLocaleLowerCase();
    if (!name || /[<>]/.test(name) || seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  }).slice(0, 8);
}

export function HomeSections() {
  const [categories, setCategories] = useState<LoadState<Category[]>>({ data: [], loading: true, error: false });
  const [products, setProducts] = useState<LoadState<Product[]>>({ data: [], loading: true, error: false });

  useEffect(() => {
    const controller = new AbortController();

    getCategories(controller.signal)
      .then((response) => setCategories({ data: response.data, loading: false, error: false }))
      .catch(() => { if (!controller.signal.aborted) setCategories({ data: [], loading: false, error: true }); });

    getProducts({ page: 1, per_page: 16 }, controller.signal)
      .then((response) => setProducts({ data: selectFeaturedProducts(response.data), loading: false, error: false }))
      .catch(() => { if (!controller.signal.aborted) setProducts({ data: [], loading: false, error: true }); });

    return () => controller.abort();
  }, []);

  return (
    <>
      {categories.loading ? (
        <section id="collections" className={styles.collections} aria-label="Collections">
          <div className={`${styles.container} ${styles.statusPanel}`} role="status" aria-live="polite">Loading collections…</div>
        </section>
      ) : categories.error ? (
        <section id="collections" className={styles.collections} aria-label="Collections">
          <div className={`${styles.container} ${styles.statusPanel}`} role="alert">
            <p>Collections could not be loaded right now.</p>
            <Link className={styles.textLink} href="/products">Browse all products <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      ) : <CollectionEditorial categories={categories.data} />}
      <FeaturedProducts products={products.data} loading={products.loading} error={products.error} />
      <BrandStory />
    </>
  );
}

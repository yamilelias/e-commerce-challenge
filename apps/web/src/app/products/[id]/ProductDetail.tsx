"use client";
/* eslint-disable @next/next/no-img-element -- Catalog images load from credited direct remote URLs. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiRequestError, getProduct, getProducts } from "@/lib/api/client";
import type { Product, ProductPhoto } from "@/lib/api/types";
import { useCart } from "@/features/cart/CartProvider";
import { formatUsd } from "@/lib/money";
import { ProductCard } from "@/components/products/ProductCard";
import { Reveal } from "@/components/home/motion/Reveal";
import { ContactSection } from "@/components/catalog/ContactSection";
import styles from "@/components/catalog/ProductPages.module.css";

function photosFor(product: Product): ProductPhoto[] {
  if (product.images?.length) return product.images;
  return product.image_url ? [{ url: product.image_url, source_url: product.image_source_url, attribution: product.image_attribution, license: product.image_license, license_url: product.image_license_url }] : [];
}

function PhotoCredit({ photo }: { photo: ProductPhoto }) {
  if (!photo.source_url && !photo.attribution && !photo.license) return null;
  return <figcaption className={styles.photoCredit}>
    Photo{photo.attribution ? ` by ${photo.attribution}` : ""}
    {photo.source_url && <> · <a href={photo.source_url} target="_blank" rel="noopener noreferrer">Source</a></>}
    {photo.license && <> · {photo.license_url ? <a href={photo.license_url} target="_blank" rel="noopener noreferrer">{photo.license}</a> : photo.license}</>}
  </figcaption>;
}

export function ProductDetail({ id }: { id: string }) {
  const numericId = Number(id);
  const [state, setState] = useState<{ id: string; product: Product | null; error: string; missing: boolean }>({ id: "", product: null, error: "", missing: false });
  const [related, setRelated] = useState<{ category: string; products: Product[]; error: boolean }>({ category: "", products: [], error: false });
  const [selection, setSelection] = useState<{ id: string; index: number }>({ id: "", index: 0 });
  const [failedPhotos, setFailedPhotos] = useState<{ id: string; urls: string[] }>({ id: "", urls: [] });
  const [quantity, setQuantity] = useState<{ id: string; value: number }>({ id: "", value: 1 });
  const [addedId, setAddedId] = useState("");
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

  const product = state.id === id ? state.product : null;
  const categorySlug = product?.category.slug;
  useEffect(() => {
    if (!categorySlug) return;
    const controller = new AbortController();
    getProducts({ category: categorySlug, per_page: 8, page: 1 }, controller.signal)
      .then((response) => setRelated({ category: categorySlug, products: response.data.filter((item) => item.id !== numericId).slice(0, 4), error: false }))
      .catch(() => { if (!controller.signal.aborted) setRelated({ category: categorySlug, products: [], error: true }); });
    return () => controller.abort();
  }, [categorySlug, numericId]);

  if (!Number.isSafeInteger(numericId) || numericId < 1 || (state.id === id && state.missing)) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><h1 className="editorial text-4xl">Product unavailable</h1><p className="mt-3">This product could not be found.</p><Link className="btn btn-primary mt-7" href="/products">Back to products</Link></div>;
  if (state.id !== id) return <div className="mx-auto max-w-5xl px-4 py-20" role="status">Loading product…</div>;
  if (state.error || !product) return <div className="mx-auto max-w-5xl px-4 py-20"><h1 className="editorial text-4xl">Product details</h1><div className="alert alert-error mt-6" role="alert">{state.error || "Product could not be loaded."} <button className="btn btn-sm" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div></div>;

  const photos = photosFor(product).filter((photo) => photo.url.startsWith("https://"));
  const failedUrls = failedPhotos.id === id ? failedPhotos.urls : [];
  const selectedIndex = selection.id === id ? Math.min(selection.index, Math.max(0, photos.length - 1)) : 0;
  const visibleIndex = photos[selectedIndex] && !failedUrls.includes(photos[selectedIndex].url) ? selectedIndex : photos.findIndex((photo) => !failedUrls.includes(photo.url));
  const currentPhoto = visibleIndex >= 0 ? photos[visibleIndex] : undefined;
  const effectiveQuantity = Math.min(quantity.id === id ? quantity.value : 1, product.stock, 999);
  const shownRelated = related.category === product.category.slug && !related.error ? related.products.filter((item) => item.id !== product.id) : [];

  return <>
    <section className={styles.detail}>
      <div className={styles.content}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/products">Products</Link><span aria-hidden="true">/</span><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`}>{product.category.name}</Link><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span></nav>
        <div className={styles.detailGrid}>
          <figure>
            <div className={styles.galleryMain}>
              {currentPhoto ? <img src={currentPhoto.url} alt={`Photo ${visibleIndex + 1} of ${product.name}`} onError={() => setFailedPhotos((previous) => ({ id, urls: [...(previous.id === id ? previous.urls : []), currentPhoto.url] }))} /> : <div className={styles.galleryPlaceholder} role="img" aria-label={`No photo available for ${product.name}`}>{product.category.name.slice(0, 1).toUpperCase()}</div>}
            </div>
            {photos.length > 1 && <div className={styles.thumbnails} role="group" aria-label="Product photos">{photos.map((photo, index) => <button type="button" className={styles.thumbnail} aria-label={`Show photo ${index + 1} of ${product.name}`} aria-pressed={index === visibleIndex} onClick={() => setSelection({ id, index })} key={`${photo.url}-${index}`}>{failedUrls.includes(photo.url) ? <span aria-hidden="true">{index + 1}</span> : <img src={photo.url} alt="" onError={() => setFailedPhotos((previous) => ({ id, urls: [...(previous.id === id ? previous.urls : []), photo.url] }))} />}</button>)}</div>}
            {currentPhoto && <PhotoCredit photo={currentPhoto} />}
          </figure>
          <div>
            <p className={styles.detailCategory}>{product.category.name}</p>
            <h1 className={styles.detailTitle}>{product.name}</h1>
            <p className={styles.sku}>SKU {product.sku}</p>
            <p className={styles.detailPrice}>{formatUsd(product.price_cents)}</p>
            <p className={styles.description}>{product.description || "No description provided."}</p>
            <dl className={styles.facts}><div className={styles.fact}><dt>Weight</dt><dd>{product.weight_kg} kg</dd></div><div className={styles.fact}><dt>Availability</dt><dd>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</dd></div></dl>
            {product.stock > 0 && <div className={styles.quantityRow}>
              <div><span className={styles.controlLabel} id="quantity-label">Quantity</span><div className={styles.quantityControl} role="group" aria-labelledby="quantity-label"><button type="button" aria-label="Decrease quantity" disabled={effectiveQuantity <= 1} onClick={() => setQuantity({ id, value: Math.max(1, effectiveQuantity - 1) })}>−</button><output aria-live="polite">{effectiveQuantity}</output><button type="button" aria-label="Increase quantity" disabled={effectiveQuantity >= Math.min(999, product.stock)} onClick={() => setQuantity({ id, value: Math.min(999, product.stock, effectiveQuantity + 1) })}>+</button></div></div>
              <button className={styles.addButton} onClick={() => { add(product.id, effectiveQuantity); setAddedId(id); }}>Add to cart <span aria-hidden="true">↗</span></button>
            </div>}
            {product.stock === 0 && <p className={styles.added}>Currently out of stock.</p>}
            {addedId === id && <p className={styles.added} role="status">Added to cart. <Link className="underline" href="/cart">View cart</Link></p>}
          </div>
        </div>
      </div>
    </section>
    {shownRelated.length > 0 && <section className={styles.related} aria-labelledby="related-title"><div className={styles.content}><div className={styles.relatedHead}><div><p className={styles.detailCategory}>More to explore</p><h2 className={styles.sectionTitle} id="related-title">From the same collection.</h2></div><Link className={styles.relatedLink} href={`/products?category=${encodeURIComponent(product.category.slug)}`}>View {product.category.name}</Link></div><div className={styles.productGrid}>{shownRelated.map((item, index) => <Reveal key={item.id} index={index}><ProductCard product={item} variant="editorial" /></Reveal>)}</div></div></section>}
    <ContactSection />
  </>;
}

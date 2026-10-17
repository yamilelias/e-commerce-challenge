"use client";
/* eslint-disable @next/next/no-img-element -- Direct remote loading avoids caching image bytes in Next.js. */

import { useState } from "react";
import type { Product } from "@/lib/api/types";
import styles from "./ProductCard.module.css";

export function ProductImage({ product, className = "", hoverAlternate = false }: { product: Product; className?: string; hoverAlternate?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [failedAlternate, setFailedAlternate] = useState<string | null>(null);
  const url = product.image_url?.startsWith("https://") ? product.image_url : null;
  const showPhoto = url !== null && url !== failedUrl;
  const alternateUrl = hoverAlternate && product.images?.[1]?.url?.startsWith("https://") ? product.images[1].url : null;
  const showAlternate = alternateUrl !== null && alternateUrl !== url && alternateUrl !== failedAlternate;

  return <div className={`product-placeholder relative overflow-hidden ${className}`}>
    {showPhoto ? <img
      src={url}
      alt={`Photo representing ${product.name}`}
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(url)}
    /> : <span className="editorial absolute inset-0 flex items-center justify-center font-semibold text-primary/60" aria-hidden="true">{product.category.name.slice(0, 1).toUpperCase()}</span>}
    {showAlternate && <img
      src={alternateUrl}
      alt=""
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full object-cover ${styles.alternate}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailedAlternate(alternateUrl)}
    />}
  </div>;
}

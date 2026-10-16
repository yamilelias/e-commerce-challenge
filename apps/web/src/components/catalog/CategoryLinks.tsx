"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";

export function CategoryLinks() {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal).then((response) => setCategories(response.data)).catch(() => {});
    return () => controller.abort();
  }, []);
  if (categories.length === 0) return null;
  return <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-labelledby="categories-heading">
    <h2 id="categories-heading" className="editorial mb-6 text-3xl font-semibold">Browse by category</h2>
    <div className="flex flex-wrap gap-3">{categories.map((category) => <Link className="btn btn-outline rounded-full border-primary/25 bg-base-100" href={`/products?category=${encodeURIComponent(category.slug)}`} key={category.id}>{category.name}</Link>)}</div>
  </section>;
}

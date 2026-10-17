"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CatalogResults } from "@/components/catalog/CatalogResults";
import { getCategories } from "@/lib/api/client";
import type { Category, ProductSort } from "@/lib/api/types";
import { ContactSection } from "@/components/catalog/ContactSection";
import styles from "@/components/catalog/ProductPages.module.css";

const sorts: { value: ProductSort; label: string }[] = [
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

export function CatalogPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = sorts.find((option) => option.value === searchParams.get("sort"))?.value ?? "name_asc";
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [searchDraft, setSearchDraft] = useState({ urlQ: q, value: q });
  const draft = searchDraft.urlQ === q ? searchDraft.value : q;
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal).then((result) => setCategories(result.data)).catch(() => {});
    return () => controller.abort();
  }, []);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value); else params.delete(name);
    params.delete("page");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`);
  }

  useEffect(() => {
    if (draft === q || searchDraft.urlQ !== q) return;
    const timer = window.setTimeout(() => updateParam("q", draft.trim().slice(0, 100)), 300);
    return () => window.clearTimeout(timer);
    // Navigation is intentionally derived from the current URL search state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, q, searchDraft.urlQ]);

  return <>
    <section className={styles.hero} aria-labelledby="catalog-title">
      <div className={styles.heroInner}>
        <p className={styles.eyebrow}>The collection</p>
        <h1 className={styles.heroTitle} id="catalog-title">All products.</h1>
        <p className={styles.heroText}>Objects for everyday living. Considered finds for your home, your rituals, and all the moments in between.</p>
        <p className={styles.imageCredit}>Photo by Shixart1985 · <a href="https://commons.wikimedia.org/wiki/File:Modern_luxury_living_room_with_kitchen_interior.jpg" target="_blank" rel="noopener noreferrer">Source</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a></p>
      </div>
    </section>
    <section className={styles.catalog} aria-labelledby="browse-title">
      <div className={styles.content}>
        <div className={styles.sectionLead}><div><p className={styles.eyebrow}>Explore the catalog</p><h2 className={styles.sectionTitle} id="browse-title">Find your next favorite.</h2></div><p className={styles.sectionCopy}>Browse what is currently available, or search for something specific.</p></div>
        <nav className={styles.categoryScroll} aria-label="Product categories">
          <button type="button" className={`${styles.categoryButton} ${!category ? styles.categoryButtonActive : ""}`} aria-current={!category ? "page" : undefined} onClick={() => updateParam("category", "")}>All products</button>
          {categories.map((item) => <button type="button" className={`${styles.categoryButton} ${category === item.slug ? styles.categoryButtonActive : ""}`} aria-current={category === item.slug ? "page" : undefined} onClick={() => updateParam("category", item.slug)} key={item.id}>{item.name}</button>)}
        </nav>
        <div className={styles.controls}>
          <label className={styles.controlLabel}>Search products<input className={styles.controlInput} type="search" maxLength={100} value={draft} onChange={(event) => setSearchDraft({ urlQ: q, value: event.target.value })} placeholder="Search by name or SKU" /></label>
          <label className={styles.controlLabel}>Sort by<select className={styles.controlInput} value={sort} onChange={(event) => updateParam("sort", event.target.value)}>{sorts.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
        </div>
        <CatalogResults query={{ q, category, sort, page, per_page: 12 }} />
      </div>
    </section>
    <ContactSection />
  </>;
}

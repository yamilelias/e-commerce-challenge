"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CatalogResults } from "@/components/catalog/CatalogResults";
import { getCategories } from "@/lib/api/client";
import type { Category, ProductSort } from "@/lib/api/types";

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

  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Browse</p>
    <h1 className="editorial mt-2 text-4xl font-semibold sm:text-5xl">Shop all products</h1>
    <p className="mt-3 max-w-2xl text-base-content/70">Search by name or SKU, then explore the categories currently in the catalog.</p>
    <div className="my-8 grid gap-4 rounded-box border border-base-300 bg-base-100 p-5 sm:grid-cols-3">
      <label className="form-control flex flex-col gap-1"><span className="label-text font-semibold">Search products</span><input className="input input-bordered w-full" type="search" maxLength={100} value={draft} onChange={(event) => setSearchDraft({ urlQ: q, value: event.target.value })} placeholder="Name or SKU" /></label>
      <label className="form-control flex flex-col gap-1"><span className="label-text font-semibold">Category</span><select className="select select-bordered w-full" value={category} onChange={(event) => updateParam("category", event.target.value)}><option value="">All categories</option>{categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label>
      <label className="form-control flex flex-col gap-1"><span className="label-text font-semibold">Sort by</span><select className="select select-bordered w-full" value={sort} onChange={(event) => updateParam("sort", event.target.value)}>{sorts.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
    </div>
    <CatalogResults query={{ q, category, sort, page, per_page: 12 }} />
  </div>;
}

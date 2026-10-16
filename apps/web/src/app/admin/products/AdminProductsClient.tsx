"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteProduct, getAdminProducts, type AdminProductQuery } from "@/lib/api/client";
import type { ListResponse, Product, ProductSort } from "@/lib/api/types";
import { useAdminSession } from "@/features/admin/AdminSessionProvider";
import { formatUsd } from "@/lib/money";

const sorts: { value: ProductSort; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" }, { value: "name_desc", label: "Name Z–A" },
  { value: "price_asc", label: "Price low–high" }, { value: "price_desc", label: "Price high–low" },
  { value: "newest", label: "Newest" },
];

export function AdminProductsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, handleProtectedError } = useAdminSession();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = sorts.find((item) => item.value === searchParams.get("sort"))?.value ?? "name_asc";
  const statusParam = searchParams.get("status");
  const status = statusParam === "active" || statusParam === "inactive" ? statusParam : "all";
  const parsedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const query: AdminProductQuery = { q, category, sort, status, page, per_page: 12 };
  const queryKey = JSON.stringify(query);
  const [searchDraft, setSearchDraft] = useState({ urlQ: q, value: q });
  const draft = searchDraft.urlQ === q ? searchDraft.value : q;
  const [state, setState] = useState<{ key: string; result: ListResponse<Product> | null; error: string }>({ key: "", result: null, error: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const requestKey = `${queryKey}:${refreshKey}`;
  const loading = state.key !== requestKey;
  const result = loading ? null : state.result;
  const error = loading ? "" : state.error;

  useEffect(() => {
    if (!session?.authenticated) return;
    const controller = new AbortController();
    getAdminProducts(query, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ key: requestKey, result: data, error: "" }); })
      .catch(async (reason) => { if (!controller.signal.aborted) setState({ key: requestKey, result: null, error: await handleProtectedError(reason) }); });
    return () => controller.abort();
    // Query is derived from URL state; the stable serialized key captures it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, session?.authenticated, handleProtectedError]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, q, searchDraft.urlQ]);

  async function remove(product: Product) {
    if (!session?.authenticated || deletingId !== null || !window.confirm(`Delete ${product.name}? This product will no longer appear in the storefront.`)) return;
    setDeletingId(product.id);
    setActionError("");
    try { await deleteProduct(product.id, session.csrf_token); setRefreshKey((value) => value + 1); }
    catch (reason) {
      if (reason && typeof reason === "object" && "status" in reason && reason.status === 404) setRefreshKey((value) => value + 1);
      else setActionError(await handleProtectedError(reason));
    } finally { setDeletingId(null); }
  }

  function pageHref(target: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    return `${pathname}?${params}`;
  }

  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p><h1 className="editorial mt-2 text-4xl font-semibold">Products</h1></div><div className="flex flex-wrap gap-2"><Link className="btn btn-outline" href="/admin/import">Import CSV</Link><Link className="btn btn-primary" href="/admin/products/new">Add product</Link></div></div>
    <div className="my-7 grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">Search<input className="input input-bordered w-full font-normal" type="search" maxLength={100} value={draft} onChange={(event) => setSearchDraft({ urlQ: q, value: event.target.value })} placeholder="Name or SKU" /></label>
      <label className="flex flex-col gap-1 text-sm font-semibold">Category slug<input className="input input-bordered w-full font-normal" value={category} onChange={(event) => updateParam("category", event.target.value.trim())} placeholder="All categories" /></label>
      <label className="flex flex-col gap-1 text-sm font-semibold">Status<select className="select select-bordered w-full font-normal" value={status} onChange={(event) => updateParam("status", event.target.value)}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label className="flex flex-col gap-1 text-sm font-semibold">Sort<select className="select select-bordered w-full font-normal" value={sort} onChange={(event) => updateParam("sort", event.target.value)}>{sorts.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
    </div>
    {actionError && <p className="alert alert-error mb-5" role="alert">{actionError}</p>}
    {loading ? <p role="status">Loading products…</p> : error ? <div className="alert alert-error" role="alert"><span>{error}</span><button className="btn btn-sm" onClick={() => setRefreshKey((value) => value + 1)}>Retry</button></div> : result?.data.length === 0 ? <div className="rounded-box bg-base-100 p-10 text-center"><p>No products match these filters.</p><button className="btn btn-outline mt-5" onClick={() => router.replace(pathname)}>Clear filters</button></div> : <>
      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100"><table className="table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{result?.data.map((product) => <tr key={product.id}><td className="min-w-40 font-semibold">{product.name}</td><td>{product.sku}</td><td>{product.category.name}</td><td>{formatUsd(product.price_cents)}</td><td>{product.stock}</td><td>{product.is_active ? <span className="badge badge-success">Active</span> : <span className="badge">Inactive</span>}</td><td><div className="flex gap-2">{product.is_active && <><Link className="btn btn-ghost btn-sm" href={`/admin/products/${product.id}/edit`}>Edit</Link><button className="btn btn-ghost btn-sm text-error" disabled={deletingId !== null} onClick={() => remove(product)} aria-label={`Delete ${product.name}`}>{deletingId === product.id ? "Deleting…" : "Delete"}</button></>}</div></td></tr>)}</tbody></table></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><span>{result?.pagination.total} matching products</span>{result && result.pagination.pages > 1 && <nav className="flex items-center gap-3" aria-label="Admin product pages">{page > 1 && <Link className="btn btn-outline btn-sm" href={pageHref(page - 1)}>Previous</Link>}<span>Page {page} of {result.pagination.pages}</span>{page < result.pagination.pages && <Link className="btn btn-outline btn-sm" href={pageHref(page + 1)}>Next</Link>}</nav>}</div>
    </>}
  </div>;
}

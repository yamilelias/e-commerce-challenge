"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiRequestError, createProduct, getAdminProduct, updateProduct } from "@/lib/api/client";
import type { Product, ProductWrite } from "@/lib/api/types";
import { useAdminSession } from "./AdminSessionProvider";

type FormState = { name: string; sku: string; description: string; category: string; price: string; stock: string; weight_kg: string };
const empty: FormState = { name: "", sku: "", description: "", category: "", price: "", stock: "0", weight_kg: "0" };

export function centsToDecimal(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function fromProduct(product: Product): FormState {
  return { name: product.name, sku: product.sku, description: product.description, category: product.category.name, price: centsToDecimal(product.price_cents), stock: String(product.stock), weight_kg: product.weight_kg };
}

export function ProductFormClient({ id }: { id?: number }) {
  const router = useRouter();
  const { session, handleProtectedError } = useAdminSession();
  const [form, setForm] = useState<FormState>(empty);
  const [loaded, setLoaded] = useState(!id);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!id || !session?.authenticated) return;
    const controller = new AbortController();
    getAdminProduct(id, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) {
        if (!data.is_active) setNotFound(true);
        else { setForm(fromProduct(data)); setLoaded(true); }
      }
    }).catch(async (reason) => {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiRequestError && reason.status === 404) setNotFound(true);
      else setLoadError(await handleProtectedError(reason));
    });
    return () => controller.abort();
  }, [id, session?.authenticated, handleProtectedError, retry]);

  function change(key: keyof FormState, value: string) { setForm((previous) => ({ ...previous, [key]: value })); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.authenticated || pending) return;
    setError(""); setFields({});
    if (!/^\d+$/.test(form.stock) || !Number.isSafeInteger(Number(form.stock))) { setFields({ stock: ["Enter a non-negative whole number."] }); return; }
    const body: ProductWrite = { name: form.name, sku: form.sku, description: form.description, category: form.category, price: form.price, stock: Number(form.stock), weight_kg: form.weight_kg };
    setPending(true);
    try {
      if (id) await updateProduct(id, body, session.csrf_token);
      else await createProduct(body, session.csrf_token);
      router.push("/admin/products");
      router.refresh();
    } catch (reason) {
      if (reason instanceof ApiRequestError) {
        setFields(reason.fields);
        if (reason.status === 404) setNotFound(true);
      }
      setError(await handleProtectedError(reason));
    } finally { setPending(false); }
  }

  const title = id ? "Edit product" : "Add product";
  if (notFound) return <div className="mx-auto max-w-3xl px-4 py-16"><h1 className="editorial text-4xl">Product unavailable</h1><p className="mt-4">This product cannot be edited.</p><Link className="btn btn-primary mt-6" href="/admin/products">Back to products</Link></div>;
  if (!loaded && !loadError) return <div className="mx-auto max-w-3xl px-4 py-16" role="status">Loading product…</div>;
  if (loadError) return <div className="mx-auto max-w-3xl px-4 py-16"><h1 className="editorial text-4xl">{title}</h1><p className="alert alert-error mt-5" role="alert">{loadError}</p><button className="btn btn-primary mt-5" onClick={() => { setLoadError(""); setRetry((value) => value + 1); }}>Retry</button></div>;

  const input = (key: keyof FormState, label: string, required = true, hint = "") => <div className="flex flex-col gap-1" key={key}>
    <label className="font-semibold" htmlFor={`field-${key}`}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    <input id={`field-${key}`} className="input input-bordered w-full" required={required} value={form[key]} onChange={(event) => change(key, event.target.value)} aria-invalid={Boolean(fields[key])} aria-describedby={fields[key] ? `${key}-error` : hint ? `${key}-hint` : undefined} inputMode={key === "price" || key === "weight_kg" ? "decimal" : key === "stock" ? "numeric" : undefined} maxLength={key === "name" ? 200 : key === "sku" || key === "category" ? 100 : undefined} />
    {hint && <p className="text-xs text-base-content/60" id={`${key}-hint`}>{hint}</p>}
    {fields[key] && <p className="text-sm text-error" id={`${key}-error`}>{fields[key].join(" ")}</p>}
  </div>;

  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
    <Link className="link link-primary text-sm" href="/admin/products">← Admin products</Link>
    <h1 className="editorial mt-5 text-4xl font-semibold">{title}</h1>
    <p className="mt-2 text-sm text-base-content/70">Fields marked * are required. Price is in USD.</p>
    <form className="mt-7 space-y-5 rounded-box border border-base-300 bg-base-100 p-5 sm:p-8" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">{input("name", "Name")}{input("sku", "SKU", true, "SKU is stored in uppercase.")}</div>
      <div className="grid gap-5 sm:grid-cols-2">{input("category", "Category")}{input("price", "Price", true, "Example: 29.99")}</div>
      <div className="grid gap-5 sm:grid-cols-2">{input("stock", "Stock", true, "Non-negative whole number")}{input("weight_kg", "Weight (kg)", true, "Up to three decimal places")}</div>
      <div className="flex flex-col gap-1"><label className="font-semibold" htmlFor="field-description">Description</label><textarea id="field-description" className="textarea textarea-bordered min-h-28 w-full" maxLength={5000} value={form.description} onChange={(event) => change("description", event.target.value)} aria-invalid={Boolean(fields.description)} aria-describedby={fields.description ? "description-error" : undefined} />{fields.description && <p className="text-sm text-error" id="description-error">{fields.description.join(" ")}</p>}</div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3"><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Saving…" : id ? "Save changes" : "Create product"}</button><Link className="btn btn-ghost" href="/admin/products">Cancel</Link></div>
    </form>
  </div>;
}

import type { ApiErrorResponse, DataResponse, ListResponse, Product, Category, ProductSort, OrderRequest, OrderConfirmation, OrderReceipt, AdminSession, ProductWrite, ImportResult } from "./types";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as ApiErrorResponse | null)?.error;
    throw new ApiRequestError(
      response.status,
      typeof error?.code === "string" ? error.code : "REQUEST_FAILED",
      typeof error?.message === "string" ? error.message : "The request could not be completed.",
      error?.fields && typeof error.fields === "object" ? error.fields : {},
    );
  }
  return payload as T;
}

function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(path, { signal });
}

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: ProductSort;
  page?: number;
  per_page?: number;
};

export function productQueryString(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q.trim());
  if (query.category) params.set("category", query.category);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.per_page) params.set("per_page", String(query.per_page));
  return params.toString();
}

export function getProducts(query: ProductQuery = {}, signal?: AbortSignal): Promise<ListResponse<Product>> {
  const params = productQueryString(query);
  return getJson<ListResponse<Product>>(`/products${params ? `?${params}` : ""}`, signal);
}

export function getCategories(signal?: AbortSignal): Promise<DataResponse<Category[]>> {
  return getJson<DataResponse<Category[]>>("/categories", signal);
}

export function getProduct(id: number, signal?: AbortSignal): Promise<DataResponse<Product>> {
  return getJson<DataResponse<Product>>(`/products/${id}`, signal);
}

export function createOrder(body: OrderRequest, key: string): Promise<DataResponse<OrderConfirmation>> {
  return requestJson<DataResponse<OrderConfirmation>>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}

export function getOrder(reference: string, token: string, signal?: AbortSignal): Promise<DataResponse<OrderReceipt>> {
  return getJson<DataResponse<OrderReceipt>>(`/orders/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`, signal);
}

export function getAdminSession(): Promise<DataResponse<AdminSession>> {
  return getJson<DataResponse<AdminSession>>("/admin/session");
}

export function loginAdmin(username: string, password: string, csrf: string): Promise<DataResponse<AdminSession>> {
  return requestJson<DataResponse<AdminSession>>("/admin/login", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ username, password }) });
}

export function logoutAdmin(csrf: string): Promise<void> {
  return requestJson<void>("/admin/logout", { method: "POST", headers: { "X-CSRF-Token": csrf } });
}

export type AdminProductQuery = ProductQuery & { status?: "all" | "active" | "inactive" };

export function getAdminProducts(query: AdminProductQuery, signal?: AbortSignal): Promise<ListResponse<Product>> {
  const params = new URLSearchParams(productQueryString(query));
  if (query.status) params.set("status", query.status);
  return getJson<ListResponse<Product>>(`/admin/products?${params}`, signal);
}

export function getAdminProduct(id: number, signal?: AbortSignal): Promise<DataResponse<Product>> {
  return getJson<DataResponse<Product>>(`/admin/products/${id}`, signal);
}

export function createProduct(body: ProductWrite, csrf: string): Promise<DataResponse<Product>> {
  return requestJson<DataResponse<Product>>("/products", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(body) });
}

export function updateProduct(id: number, body: ProductWrite, csrf: string): Promise<DataResponse<Product>> {
  return requestJson<DataResponse<Product>>(`/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(body) });
}

export function deleteProduct(id: number, csrf: string): Promise<void> {
  return requestJson<void>(`/products/${id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
}

export function importProducts(file: File, csrf: string): Promise<DataResponse<ImportResult>> {
  const body = new FormData();
  body.append("file", file);
  return requestJson<DataResponse<ImportResult>>("/products/import", { method: "POST", headers: { "X-CSRF-Token": csrf }, body });
}

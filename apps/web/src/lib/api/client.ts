import type { ApiErrorResponse, DataResponse, ListResponse, Product, Category, ProductSort } from "./types";

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

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
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

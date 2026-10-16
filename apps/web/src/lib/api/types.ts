export type Category = { id: number; name: string; slug: string };

export type Product = {
  id: number;
  name: string;
  sku: string;
  description: string;
  category: Category;
  price_cents: number;
  currency: "USD";
  stock: number;
  weight_kg: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWrite = {
  name: string;
  sku: string;
  description?: string;
  category: string;
  price: string;
  stock: number;
  weight_kg: string;
};

export type ListResponse<T> = {
  data: T[];
  pagination: { page: number; per_page: number; total: number; pages: number };
};

export type DataResponse<T> = { data: T };

export type ApiErrorResponse = {
  error: { code: string; message: string; fields: Record<string, string[]> };
};

export type ProductSort = "name_asc" | "name_desc" | "price_asc" | "price_desc" | "newest";

export type Category = { id: number; name: string; slug: string };

export type ProductPhoto = {
  url: string;
  source_url: string | null;
  attribution: string | null;
  license: string | null;
  license_url: string | null;
};

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
  image_url: string | null;
  image_source_url: string | null;
  image_attribution: string | null;
  image_license: string | null;
  image_license_url: string | null;
  images: ProductPhoto[];
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

export type CartLine = { product_id: number; quantity: number };
export type OrderRequest = { buyer_name: string; buyer_email: string; items: CartLine[] };
export type OrderItem = {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};
export type OrderReceipt = {
  reference: string;
  status: "paid";
  currency: "USD";
  total_cents: number;
  buyer_name: string;
  buyer_email: string;
  items: OrderItem[];
  created_at: string;
  paid_at: string;
};
export type OrderConfirmation = OrderReceipt & { receipt_token: string };

export type AdminSession = { authenticated: boolean; username: string | null; csrf_token: string };
export type ImportIssue = { row: number; field: string; code: string; message: string };
export type ImportResult = {
  total_rows: number;
  inserted: number;
  skipped: number;
  rejected: number;
  issues: ImportIssue[];
  truncated: boolean;
};

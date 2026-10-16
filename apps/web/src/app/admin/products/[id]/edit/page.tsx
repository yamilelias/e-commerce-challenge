import { ProductFormClient } from "@/features/admin/ProductFormClient";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return <div className="mx-auto max-w-3xl px-4 py-16"><h1 className="editorial text-4xl">Product unavailable</h1><p className="mt-3">This product cannot be edited.</p></div>;
  return <ProductFormClient id={id} />;
}

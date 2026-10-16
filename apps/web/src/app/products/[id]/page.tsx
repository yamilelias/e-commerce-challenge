import type { Metadata } from "next";
import { ProductDetail } from "./ProductDetail";

export const metadata: Metadata = { title: "Product details" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  return <ProductDetail id={id} />;
}

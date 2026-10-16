"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/CartProvider";

export function StoreHeader() {
  const { count, ready } = useCart();
  return <header className="border-b border-base-300 bg-base-100">
    <nav className="navbar mx-auto max-w-7xl gap-4 px-4 sm:px-6" aria-label="Main navigation">
      <Link className="editorial mr-auto text-2xl font-bold tracking-tight text-primary" href="/">Field &amp; Form</Link>
      <Link className="btn btn-ghost" href="/products">Shop</Link>
      <Link className="btn btn-ghost" href="/cart">Cart{ready && count > 0 && <span className="badge badge-primary ml-1" aria-label={`${count} items in cart`}>{count}</span>}</Link>
    </nav>
  </header>;
}

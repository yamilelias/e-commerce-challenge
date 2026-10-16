import type { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/StoreHeader";
import { CartProvider } from "@/features/cart/CartProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Field & Form", template: "%s | Field & Form" },
  description: "Browse an everyday collection across home, outdoors, food, and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="garden">
      <body className="flex min-h-screen flex-col bg-base-200">
        <CartProvider>
          <StoreHeader />
          <main id="main-content" className="flex-1">{children}</main>
        </CartProvider>
        <footer className="mt-16 border-t border-base-300 bg-base-100 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-base-content/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>© {new Date().getFullYear()} Field &amp; Form</span>
            <div className="flex gap-5"><Link className="link link-hover" href="/products">Browse products</Link><Link className="link link-hover" href="/admin/login">Admin</Link></div>
          </div>
        </footer>
      </body>
    </html>
  );
}

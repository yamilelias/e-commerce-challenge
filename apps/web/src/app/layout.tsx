import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Field & Form", template: "%s | Field & Form" },
  description: "Browse an everyday collection across home, outdoors, food, and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="garden">
      <body className="flex min-h-screen flex-col bg-base-200">
        <header className="border-b border-base-300 bg-base-100">
          <nav className="navbar mx-auto max-w-7xl gap-4 px-4 sm:px-6" aria-label="Main navigation">
            <Link className="editorial mr-auto text-2xl font-bold tracking-tight text-primary" href="/">Field &amp; Form</Link>
            <Link className="btn btn-ghost" href="/products">Shop</Link>
            <Link className="btn btn-ghost" href="/cart">Cart</Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
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

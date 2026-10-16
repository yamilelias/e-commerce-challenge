"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenu } from "@/components/home/navigation/MobileMenu";
import navStyles from "@/components/home/navigation/navigation.module.css";
import { useCart } from "@/features/cart/CartProvider";

export function StoreHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { count, ready } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const cartLabel = ready && count > 0 ? `Cart, ${count} items` : "Cart";

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-base-100 focus:px-4 focus:py-3 focus:text-primary focus:shadow-lg">
        Skip to main content
      </a>
      <header
        className={`${navStyles.header} sticky top-0 z-50 h-[4.75rem] border-b border-primary/10 bg-base-100/95 text-base-content backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-200 data-[scrolled=true]:border-primary/15 data-[scrolled=true]:bg-base-100 data-[scrolled=true]:shadow-[0_8px_28px_rgba(32,40,34,0.09)] md:h-[5rem]`}
        data-scrolled={scrolled}
        data-home={isHome}
      >
        <nav className="mx-auto flex h-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-10" aria-label="Main navigation">
          <Link className={`editorial mr-auto inline-flex min-h-11 items-center whitespace-nowrap font-bold tracking-[-0.035em] text-primary transition-[font-size] duration-200 ${scrolled ? "text-[1.3rem] sm:text-[1.4rem]" : "text-[1.35rem] sm:text-2xl"}`} href="/">
            Field &amp; Form
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {isHome && (
              <>
                <Link className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors hover:bg-base-200 hover:text-primary" href="#collections">Collections</Link>
                <Link className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors hover:bg-base-200 hover:text-primary" href="#featured">Featured</Link>
              </>
            )}
            <Link className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors hover:bg-base-200 hover:text-primary" href="/products">Shop</Link>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-base-200 sm:px-4" href="/cart" aria-label={cartLabel}>
            <span aria-hidden="true">Cart</span>
            {ready && count > 0 && <span className="badge badge-primary badge-sm" aria-hidden="true">{count}</span>}
          </Link>
          <MobileMenu isHome={isHome} />
        </nav>
      </header>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navigation.module.css";

interface MobileMenuProps {
  isHome: boolean;
}

export function MobileMenu({ isHome }: MobileMenuProps) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = "store-mobile-navigation";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      const oldOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      firstLinkRef.current?.focus();

      const onDesktop = (event: MediaQueryListEvent) => {
        if (event.matches) dialog.close();
      };
      const desktop = window.matchMedia("(min-width: 48rem)");
      desktop.addEventListener("change", onDesktop);
      if (desktop.matches) dialog.close();

      return () => {
        desktop.removeEventListener("change", onDesktop);
        document.body.style.overflow = oldOverflow;
        if (dialog.open) dialog.close();
      };
    }

    if (dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    // A route change can unmount the clicked link before the dialog's close event.
    if (dialogRef.current?.open) dialogRef.current.close();
  }, [pathname]);

  function closeMenu() {
    dialogRef.current?.close();
  }

  function onDialogClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-primary transition-colors hover:bg-base-200 md:hidden"
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(true)}
      >
        <span className="flex w-5 flex-col gap-[5px]" aria-hidden="true"><span className="h-[2px] w-full rounded-full bg-current" /><span className="h-[2px] w-full rounded-full bg-current" /><span className="h-[2px] w-full rounded-full bg-current" /></span>
      </button>

      <dialog
        ref={dialogRef}
        id={menuId}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-transparent p-0 text-base-content backdrop:bg-primary/55 md:hidden"
        onClose={onDialogClose}
        onClick={(event) => { if (event.target === dialogRef.current) closeMenu(); }}
        aria-label="Mobile navigation"
        data-open={open}
      >
        <div className="ml-auto flex min-h-[calc(100dvh-4.75rem)] w-full flex-col border-b border-primary/10 bg-base-100 px-4 pb-8 pt-5 shadow-xl sm:px-6" style={{ marginTop: "4.75rem" }}>
          <div className="mb-6 flex items-center justify-between border-b border-base-300 pb-4">
            <span className="editorial text-xl font-bold text-primary">Explore</span>
            <button className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-primary hover:bg-base-200" type="button" onClick={closeMenu} aria-label="Close navigation menu">Close</button>
          </div>
          <nav className="flex flex-col" aria-label="Mobile navigation links">
            <Link ref={firstLinkRef} className={`${styles.menuLink} border-b border-base-300 py-3 text-xl font-medium text-primary`} href="/" onClick={closeMenu} style={{ animationDelay: "0ms" }}>Home</Link>
            {isHome && <Link className={`${styles.menuLink} border-b border-base-300 py-3 text-xl font-medium text-primary`} href="#collections" onClick={closeMenu} style={{ animationDelay: "40ms" }}>Collections</Link>}
            {isHome && <Link className={`${styles.menuLink} border-b border-base-300 py-3 text-xl font-medium text-primary`} href="#featured" onClick={closeMenu} style={{ animationDelay: "80ms" }}>Featured</Link>}
            <Link className={`${styles.menuLink} border-b border-base-300 py-3 text-xl font-medium text-primary`} href="/products" onClick={closeMenu} style={{ animationDelay: isHome ? "120ms" : "40ms" }}>Shop all</Link>
            <Link className={`${styles.menuLink} border-b border-base-300 py-3 text-xl font-medium text-primary`} href="/cart" onClick={closeMenu} style={{ animationDelay: isHome ? "160ms" : "80ms" }}>Cart</Link>
          </nav>
          <Link className="mt-8 inline-flex min-h-11 items-center text-sm text-base-content/70 underline-offset-4 hover:underline" href="/admin/login" onClick={closeMenu}>Admin sign in</Link>
        </div>
      </dialog>
    </>
  );
}

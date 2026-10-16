"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminSession } from "./AdminSessionProvider";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, bootstrapError, refresh, logout, handleProtectedError } = useAdminSession();
  const [logoutError, setLogoutError] = useState("");
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!isLogin && !loading && !bootstrapError && !session?.authenticated) router.replace("/admin/login");
  }, [isLogin, loading, bootstrapError, session?.authenticated, router]);

  async function doLogout() {
    setLogoutError("");
    try { await logout(); }
    catch (reason) { setLogoutError(await handleProtectedError(reason)); }
  }

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-16" role="status">Checking admin session…</div>;
  if (bootstrapError) return <div className="mx-auto max-w-5xl px-4 py-16"><h1 className="editorial text-3xl">Admin unavailable</h1><p className="alert alert-error mt-5" role="alert">{bootstrapError}</p><button className="btn btn-primary mt-5" onClick={() => refresh().catch(() => {})}>Retry session check</button></div>;
  if (isLogin) return children;
  if (!session?.authenticated) return <div className="mx-auto max-w-5xl px-4 py-16" role="status">Opening sign in…</div>;

  return <>
    <nav className="border-b border-base-300 bg-base-100" aria-label="Admin navigation"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6"><span className="mr-auto text-sm font-semibold text-primary">Admin · {session.username}</span><Link className="btn btn-ghost btn-sm" href="/admin/products">Products</Link><Link className="btn btn-ghost btn-sm" href="/admin/import">Import CSV</Link><button className="btn btn-outline btn-sm" onClick={doLogout}>Sign out</button></div></nav>
    {logoutError && <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6"><p className="alert alert-error" role="alert">{logoutError}</p></div>}
    {children}
  </>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/features/admin/AdminSessionProvider";
import { ApiRequestError } from "@/lib/api/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, login, refresh } = useAdminSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try { await login(username, password); setPassword(""); router.replace("/admin/products"); }
    catch (reason) {
      if (reason instanceof ApiRequestError && reason.code === "CSRF_INVALID") {
        await refresh().catch(() => {});
        setError("Session validation changed. Review your details and retry.");
      } else setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally { setPending(false); }
  }

  return <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
    <h1 className="editorial text-4xl font-semibold">Admin sign in</h1>
    <p className="mt-3 text-base-content/70">Manage products and import catalog CSV files.</p>
    {session?.authenticated ? <button className="btn btn-primary mt-8" onClick={() => router.replace("/admin/products")}>Open admin products</button> : <form className="mt-8 rounded-box border border-base-300 bg-base-100 p-6" onSubmit={submit}>
      <label className="flex flex-col gap-2"><span className="font-semibold">Username</span><input className="input input-bordered w-full" required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
      <label className="mt-5 flex flex-col gap-2"><span className="font-semibold">Password</span><input className="input input-bordered w-full" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="alert alert-error mt-5" role="alert">{error}</p>}
      <button className="btn btn-primary mt-6 w-full" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button>
    </form>}
  </div>;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError, getAdminSession, loginAdmin, logoutAdmin } from "@/lib/api/client";
import type { AdminSession } from "@/lib/api/types";

type AdminContextValue = {
  session: AdminSession | null;
  loading: boolean;
  bootstrapError: string;
  refresh: () => Promise<AdminSession>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  handleProtectedError: (reason: unknown) => Promise<string>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState("");

  const refresh = useCallback(async () => {
    const { data } = await getAdminSession();
    setSession(data);
    setBootstrapError("");
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    getAdminSession().then(({ data }) => { if (active) { setSession(data); setLoading(false); } })
      .catch(() => { if (active) { setBootstrapError("Could not check the admin session."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const current = session ?? await refresh();
    const { data } = await loginAdmin(username, password, current.csrf_token);
    setSession(data); // Login rotates the session ID and CSRF token.
  }, [session, refresh]);

  const logout = useCallback(async () => {
    if (!session?.authenticated) return;
    await logoutAdmin(session.csrf_token);
    setSession(null);
    router.replace("/admin/login");
  }, [session, router]);

  const handleProtectedError = useCallback(async (reason: unknown) => {
    if (reason instanceof ApiRequestError && reason.status === 401) {
      setSession(null);
      router.replace("/admin/login");
      return "Admin session expired. Sign in again.";
    }
    if (reason instanceof ApiRequestError && reason.status === 403 && reason.code === "CSRF_INVALID") {
      try { await refresh(); } catch { setBootstrapError("Could not refresh the admin session."); }
      return "Session validation changed. Review the form and retry manually.";
    }
    return reason instanceof Error ? reason.message : "The request could not be completed.";
  }, [refresh, router]);

  const value = useMemo(() => ({ session, loading, bootstrapError, refresh, login, logout, handleProtectedError }), [session, loading, bootstrapError, refresh, login, logout, handleProtectedError]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminSession(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminSessionProvider is missing.");
  return value;
}

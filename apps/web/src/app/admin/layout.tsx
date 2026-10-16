import { AdminSessionProvider } from "@/features/admin/AdminSessionProvider";
import { AdminShell } from "@/features/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminSessionProvider><AdminShell>{children}</AdminShell></AdminSessionProvider>;
}

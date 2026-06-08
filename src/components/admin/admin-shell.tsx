"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

interface AdminUser {
  uid: string;
  email: string;
}

interface AdminContextValue {
  admin: AdminUser | null;
  loading: boolean;
}

const AdminContext = createContext<AdminContextValue>({ admin: null, loading: true });

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ffmanage/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAdmin({ uid: data.uid, email: data.email });
        } else {
          router.replace("/ffmanage/login");
        }
      })
      .catch(() => router.replace("/ffmanage/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminContext.Provider value={{ admin, loading }}>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
        {/* Sidebar */}
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentPath={pathname}
          adminEmail={admin.email}
        />

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader
            onMenuClick={() => setSidebarOpen(true)}
            adminEmail={admin.email}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

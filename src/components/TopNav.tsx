"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  name: string;
  role: "admin" | "viewer";
  allowedPages: ("dashboard" | "admin")[];
}

export default function TopNav({ name, role, allowedPages }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="bg-brand text-slate-900 font-bold px-2.5 py-1 rounded-md text-sm">
            MENTORES
          </span>
          <nav className="flex items-center gap-1">
            {allowedPages.includes("dashboard") && link("/dashboard", "Royalty")}
            {role === "admin" && allowedPages.includes("admin") && link("/admin", "Administración")}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:inline">{name}</span>
          <button
            onClick={logout}
            className="text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md px-3 py-1.5"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

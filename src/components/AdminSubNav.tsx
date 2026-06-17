"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSubNav() {
  const pathname = usePathname();
  const tab = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
          active
            ? "border-slate-900 text-slate-900"
            : "border-transparent text-slate-500 hover:text-slate-800"
        }`}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="border-b border-slate-200 mb-6 flex gap-2">
      {tab("/admin/config", "Configuración del mes")}
      {tab("/admin/users", "Usuarios y permisos")}
    </div>
  );
}

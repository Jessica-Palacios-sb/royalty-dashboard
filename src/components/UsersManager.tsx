"use client";

import { useEffect, useState } from "react";
import { PageKey, Role } from "@/lib/types";

interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  allowedPages: PageKey[];
  active: boolean;
  createdAt: string;
}

const ALL_PAGES: { key: PageKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "admin", label: "Administración" },
];

// Admin principal: su acceso no se puede desactivar ni quitar (siempre activo).
const PRIMARY_ADMIN_EMAIL = "jpalacios@smartbeemo.com";

export default function UsersManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // formulario de nuevo usuario
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "viewer" as Role,
    allowedPages: ["dashboard"] as PageKey[],
    tempPassword: "",
  });

  async function load() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => {
    load();
  }, []);

  function notify(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      notify("err", d.error || "Error al crear usuario");
      return;
    }
    setForm({ name: "", email: "", role: "viewer", allowedPages: ["dashboard"], tempPassword: "" });
    notify("ok", "Usuario creado. Deberá cambiar la contraseña en su primer ingreso.");
    load();
  }

  async function patchUser(id: string, patch: Partial<PublicUser>) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      notify("err", d.error || "Error al actualizar");
      return;
    }
    load();
  }

  async function editName(u: PublicUser) {
    const nuevo = prompt("Nuevo nombre:", u.name);
    if (!nuevo || !nuevo.trim() || nuevo.trim() === u.name) return;
    await patchUser(u.id, { name: nuevo.trim() });
    notify("ok", "Nombre actualizado.");
  }

  async function resetPassword(id: string) {
    const temp = prompt("Nueva contraseña temporal (mín. 8 caracteres):");
    if (!temp) return;
    const res = await fetch(`/api/users/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempPassword: temp }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      notify("err", d.error || "Error al restablecer");
      return;
    }
    notify("ok", "Contraseña restablecida. El usuario deberá cambiarla al ingresar.");
    load();
  }

  async function removeUser(id: string) {
    if (!confirm("¿Quitar el acceso de este usuario?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      notify("err", d.error || "Error al eliminar");
      return;
    }
    notify("ok", "Usuario eliminado.");
    load();
  }

  function togglePage(u: PublicUser, page: PageKey) {
    const has = u.allowedPages.includes(page);
    const next = has
      ? u.allowedPages.filter((p) => p !== page)
      : [...u.allowedPages, page];
    patchUser(u.id, { allowedPages: next });
  }

  return (
    <div className="space-y-8">
      {msg && (
        <div
          className={`text-sm rounded-md px-3 py-2 border ${
            msg.type === "ok"
              ? "text-green-800 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Crear usuario */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Agregar usuario</h2>
        <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="viewer">Visualizador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña temporal
            </label>
            <input
              value={form.tempPassword}
              onChange={(e) => setForm({ ...form, tempPassword: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              minLength={8}
              placeholder="Mín. 8 caracteres"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Páginas con acceso
            </label>
            <div className="flex gap-3">
              {ALL_PAGES.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.allowedPages.includes(p.key)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.allowedPages, p.key]
                        : form.allowedPages.filter((x) => x !== p.key);
                      setForm({ ...form, allowedPages: next });
                    }}
                    className="accent-slate-900"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="bg-brand hover:bg-brand-dark text-slate-900 font-semibold rounded-md px-5 py-2"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </section>

      {/* Lista de usuarios */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Usuarios</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Usuario</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Páginas</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const locked = u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL;
                return (
                <tr key={u.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {u.name}
                      {locked && (
                        <span className="ml-2 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                          Admin principal
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs">{u.email}</div>
                    {u.mustChangePassword && (
                      <span className="inline-block mt-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        Cambio de contraseña pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span className="text-sm text-slate-600">Administrador</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => patchUser(u.id, { role: e.target.value as Role })}
                        className="border border-slate-300 rounded-md px-2 py-1 bg-white text-sm"
                      >
                        <option value="viewer">Visualizador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {ALL_PAGES.map((p) => (
                        <label key={p.key} className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={u.allowedPages.includes(p.key)}
                            onChange={() => togglePage(u, p.key)}
                            className="accent-slate-900"
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span
                        title="El administrador principal siempre está activo"
                        className="inline-block text-xs rounded-full px-2.5 py-1 bg-green-50 text-green-700 border border-green-200"
                      >
                        Activo
                      </span>
                    ) : (
                      <button
                        onClick={() => patchUser(u.id, { active: !u.active })}
                        className={`text-xs rounded-full px-2.5 py-1 ${
                          u.active
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {u.active ? "Activo" : "Inactivo"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => editName(u)}
                        className="text-slate-600 hover:text-slate-900 underline"
                      >
                        Editar nombre
                      </button>
                      <button
                        onClick={() => resetPassword(u.id)}
                        className="text-slate-600 hover:text-slate-900 underline"
                      >
                        Restablecer clave
                      </button>
                      {u.id !== currentUserId && !locked && (
                        <button
                          onClick={() => removeUser(u.id)}
                          className="text-red-600 hover:text-red-800 underline"
                        >
                          Quitar acceso
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [mustChange, setMustChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
        else setMustChange(d.user.mustChangePassword);
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al cambiar la contraseña");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8"
      >
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Cambiar contraseña</h1>
        <p className="text-sm text-slate-500 mb-6">
          {mustChange
            ? "Es tu primer ingreso: define una contraseña nueva."
            : "Actualiza tu contraseña."}
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {!mustChange && (
          <>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand"
              required
            />
          </>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand"
          minLength={8}
          required
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-brand"
          minLength={8}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-dark text-slate-900 font-semibold rounded-md py-2 transition disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}

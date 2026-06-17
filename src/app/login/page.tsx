"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al iniciar sesión");
      return;
    }
    const { user } = await res.json();
    router.push(user.mustChangePassword ? "/change-password" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8"
      >
        <div className="mb-6">
          <div className="inline-block bg-brand text-slate-900 font-bold px-3 py-1 rounded-md text-sm mb-3">
            ROYALTIES
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Panel de Mentores</h1>
          <p className="text-sm text-slate-500 mt-1">Ingresa con tu correo corporativo</p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="tucorreo@smartbeemo.com"
          required
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-brand"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-dark text-slate-900 font-semibold rounded-md py-2 transition disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

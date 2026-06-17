"use client";

import { useEffect, useState } from "react";
import { MonthConfig } from "@/lib/types";
import { mesLabel } from "@/lib/format";

interface ConfigPayload {
  mes: string;
  config: MonthConfig;
  mentoresDisponibles: { id: string; nombre: string }[];
  mesesDisponibles: string[];
}

export default function ConfigEditor() {
  const [mes, setMes] = useState("");
  const [payload, setPayload] = useState<ConfigPayload | null>(null);
  const [pesos, setPesos] = useState({ clases: 40, videos: 40, bootcamp: 20 });
  const [comisionTotal, setComisionTotal] = useState(0);
  const [aplican, setAplican] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(targetMes?: string) {
    const qs = targetMes ? `?mes=${targetMes}` : "";
    const res = await fetch(`/api/config${qs}`);
    const data: ConfigPayload = await res.json();
    setPayload(data);
    setMes(data.mes);
    setPesos(data.config.pesos);
    setComisionTotal(data.config.comisionTotal);
    setAplican(new Set(data.config.mentoresAplican));
    setMsg(null);
  }

  useEffect(() => {
    load();
  }, []);

  if (!payload) return <div className="text-slate-500">Cargando...</div>;

  const sumaPesos = pesos.clases + pesos.videos + pesos.bootcamp;
  const pesosOk = sumaPesos === 100;

  function toggleMentor(id: string) {
    setAplican((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setMsg(null);
    if (!pesosOk) {
      setMsg({ type: "err", text: "Los pesos deben sumar exactamente 100%." });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes,
        pesos,
        comisionTotal,
        mentoresAplican: Array.from(aplican),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: d.error || "Error al guardar" });
      return;
    }
    setMsg({ type: "ok", text: `Configuración de ${mesLabel(mes)} guardada.` });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Mes a configurar:</label>
        <select
          value={mes}
          onChange={(e) => load(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
        >
          {payload.mesesDisponibles.map((m) => (
            <option key={m} value={m}>
              {mesLabel(m)}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          Los pesos y el monto se guardan por mes; los mentores que aplican son globales.
        </span>
      </div>

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

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Pesos por segmento</h2>
        <p className="text-sm text-slate-500 mb-4">
          Define cuánto pesa cada segmento en el reparto. Deben sumar 100%.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["clases", "videos", "bootcamp"] as const).map((k) => (
            <div key={k}>
              <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                {k === "clases" ? "Clases en vivo" : k === "videos" ? "Videos" : "Bootcamp"}
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={pesos[k]}
                  onChange={(e) =>
                    setPesos({ ...pesos, [k]: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
                <span className="ml-2 text-slate-500">%</span>
              </div>
            </div>
          ))}
        </div>
        <div
          className={`mt-3 text-sm ${pesosOk ? "text-slate-500" : "text-red-600 font-medium"}`}
        >
          Suma actual: {sumaPesos}% {pesosOk ? "✓" : "(debe ser 100%)"}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Comisión total a repartir</h2>
        <p className="text-sm text-slate-500 mb-4">Monto en USD que se distribuye este mes.</p>
        <div className="flex items-center max-w-xs">
          <span className="mr-2 text-slate-500">USD</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={comisionTotal}
            onChange={(e) => setComisionTotal(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-slate-900">Mentores que aplican</h2>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setAplican(new Set(payload.mentoresDisponibles.map((m) => m.id)))}
              className="text-slate-600 hover:text-slate-900 underline"
            >
              Seleccionar todos
            </button>
            <button
              onClick={() => setAplican(new Set())}
              className="text-slate-600 hover:text-slate-900 underline"
            >
              Ninguno
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Solo los mentores marcados entran en el cálculo de participación y comisión.
          Esta selección es <strong>global</strong>: aplica a todos los meses.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {payload.mentoresDisponibles.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-2 text-sm border border-slate-200 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={aplican.has(m.id)}
                onChange={() => toggleMentor(m.id)}
                className="accent-slate-900"
              />
              {m.nombre}
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !pesosOk}
          className="bg-brand hover:bg-brand-dark text-slate-900 font-semibold rounded-md px-5 py-2 transition disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar configuración del mes"}
        </button>
      </div>
    </div>
  );
}

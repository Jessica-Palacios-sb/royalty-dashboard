"use client";

import { useEffect, useState } from "react";
import { DashboardResponse } from "@/lib/types";
import { fmtInt, fmtPct, fmtUSD, mesLabel } from "@/lib/format";

function Bar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="h-2 rounded-full bg-slate-100 w-20 overflow-hidden">
        <div className="h-full rounded-full bg-brand" style={{ width: `${w}%` }} />
      </div>
      <span className="tabular-nums font-semibold text-slate-700 w-16 text-right">
        {fmtPct(value)}
      </span>
    </div>
  );
}

export default function DashboardTable() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [mes, setMes] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load(targetMes?: string) {
    setLoading(true);
    const qs = targetMes ? `?mes=${targetMes}` : "";
    const res = await fetch(`/api/dashboard${qs}`);
    const json: DashboardResponse = await res.json();
    setData(json);
    setMes(json.mes);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return <div className="text-slate-500">Cargando...</div>;
  }
  if (!data) return null;

  const t = data.totals;
  const comisionConfigurada = data.config.comisionTotal > 0;
  const maxPond = Math.max(0, ...data.rows.map((r) => r.pctTotal));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Royalties por mentor</h1>
          <p className="text-sm text-slate-500">
            Participación por segmento y comisión asignada · {mesLabel(data.mes)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Mes:</label>
          <select
            value={mes}
            onChange={(e) => load(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
          >
            {data.mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {mesLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!comisionConfigurada && (
        <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Este mes aún no tiene un monto de comisión configurado. Defínelo en{" "}
          <span className="font-medium">Administración → Configuración del mes</span>.
        </div>
      )}

      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-600 text-xs uppercase tracking-wide bg-slate-50 border-b border-slate-200">
              <th rowSpan={2} className="px-4 py-2 text-left align-bottom">Mentor</th>
              <th rowSpan={2} className="px-3 py-2 text-right align-bottom" title="Chargebacks">CB</th>
              <th colSpan={2} className="px-3 py-2 text-center border-l border-slate-200">Clases en vivo</th>
              <th colSpan={2} className="px-3 py-2 text-center border-l border-slate-200">Videos</th>
              <th colSpan={2} className="px-3 py-2 text-center border-l border-slate-200">Bootcamp</th>
              <th rowSpan={2} className="px-4 py-2 text-right align-bottom border-l border-slate-200 bg-amber-50">
                Participación ponderada
              </th>
              <th rowSpan={2} className="px-4 py-2 text-right align-bottom">Comisión</th>
            </tr>
            <tr className="text-slate-400 text-[11px] bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-1 text-right border-l border-slate-200">Asist.</th>
              <th className="px-3 py-1 text-right">%</th>
              <th className="px-3 py-1 text-right border-l border-slate-200">Asist.</th>
              <th className="px-3 py-1 text-right">%</th>
              <th className="px-3 py-1 text-right border-l border-slate-200">Asist.</th>
              <th className="px-3 py-1 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r.idMentor} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="px-4 py-2.5 font-medium text-slate-800">
                  <span className="text-slate-400 mr-1.5 tabular-nums">{i + 1}</span>
                  {r.nombreMentor}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500">{fmtInt(r.chargebacks)}</td>
                <td className="px-3 py-2.5 text-right border-l border-slate-100">{fmtInt(r.clasesEnVivo)}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{fmtPct(r.pctClases)}</td>
                <td className="px-3 py-2.5 text-right border-l border-slate-100">{fmtInt(r.videos)}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{fmtPct(r.pctVideos)}</td>
                <td className="px-3 py-2.5 text-right border-l border-slate-100">{fmtInt(r.bootcamp)}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{fmtPct(r.pctBootcamp)}</td>
                <td className="px-4 py-2.5 border-l border-slate-100 bg-amber-50/40">
                  <Bar value={r.pctTotal} max={maxPond} />
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                  {fmtUSD(r.comision)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold text-slate-900 border-t border-slate-300">
              <td className="px-4 py-3">Total {mesLabel(data.mes)}</td>
              <td className="px-3 py-3 text-right">{fmtInt(t.chargebacks)}</td>
              <td className="px-3 py-3 text-right border-l border-slate-200">{fmtInt(t.clasesEnVivo)}</td>
              <td className="px-3 py-3 text-right">{t.clasesEnVivo > 0 ? "100,00 %" : "0,00 %"}</td>
              <td className="px-3 py-3 text-right border-l border-slate-200">{fmtInt(t.videos)}</td>
              <td className="px-3 py-3 text-right">{t.videos > 0 ? "100,00 %" : "0,00 %"}</td>
              <td className="px-3 py-3 text-right border-l border-slate-200">{fmtInt(t.bootcamp)}</td>
              <td className="px-3 py-3 text-right">{t.bootcamp > 0 ? "100,00 %" : "0,00 %"}</td>
              <td className="px-4 py-3 text-right border-l border-slate-200">{fmtPct(t.pctTotal)}</td>
              <td className="px-4 py-3 text-right">{fmtUSD(t.comision)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Pesos del mes — Clases: {data.config.pesos.clases}% · Videos: {data.config.pesos.videos}% ·
        Bootcamp: {data.config.pesos.bootcamp}% · Comisión total: {fmtUSD(data.config.comisionTotal)}
      </div>
    </div>
  );
}

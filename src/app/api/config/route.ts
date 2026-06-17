import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { upsertMonthConfig } from "@/lib/store";
import { getDashboard, effectiveConfig, currentMonth } from "@/lib/dashboard";
import { MonthConfig } from "@/lib/types";

/** GET ?mes=YYYY-MM -> config efectiva del mes + lista de mentores del mes. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || currentMonth();
  const data = await getDashboard(mes);
  // Lista de todos los mentores con actividad en el mes (para seleccionar cuáles aplican).
  const mentores = data.rows
    .map((r) => ({ id: r.idMentor, nombre: r.nombreMentor }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return NextResponse.json({
    mes,
    config: data.config,
    mentoresDisponibles: mentores,
    mesesDisponibles: data.mesesDisponibles,
  });
}

/** PUT -> guarda la config del mes. Solo admin. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<MonthConfig>;
  if (!body.mes) {
    return NextResponse.json({ error: "Mes requerido" }, { status: 400 });
  }
  const pesos = {
    clases: Number(body.pesos?.clases) || 0,
    videos: Number(body.pesos?.videos) || 0,
    bootcamp: Number(body.pesos?.bootcamp) || 0,
  };
  const config: MonthConfig = {
    mes: body.mes,
    pesos,
    comisionTotal: Number(body.comisionTotal) || 0,
    mentoresAplican: Array.isArray(body.mentoresAplican) ? body.mentoresAplican : [],
  };
  await upsertMonthConfig(config);
  return NextResponse.json({ ok: true, config });
}

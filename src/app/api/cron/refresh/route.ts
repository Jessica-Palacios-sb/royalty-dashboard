import { NextResponse } from "next/server";

// Endpoint que invoca el cron diario de Vercel (ver vercel.json) para refrescar
// el snapshot de Redshift. Protegido con CRON_SECRET (Vercel lo envía como
// "Authorization: Bearer <CRON_SECRET>" cuando la variable está configurada).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  if ((process.env.DATA_SOURCE || "mock") !== "redshift") {
    return NextResponse.json({ ok: true, skipped: "DATA_SOURCE no es redshift" });
  }

  try {
    const { refreshRedshiftCache } = await import("@/lib/redshift");
    const result = await refreshRedshiftCache();
    return NextResponse.json({ ok: true, at: new Date().toISOString(), ...result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error al refrescar" },
      { status: 500 }
    );
  }
}

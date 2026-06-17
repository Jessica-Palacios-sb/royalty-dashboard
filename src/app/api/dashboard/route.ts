import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDashboard, currentMonth } from "@/lib/dashboard";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.allowedPages.includes("dashboard")) {
    return NextResponse.json({ error: "Sin acceso al dashboard" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || currentMonth();
  const data = await getDashboard(mes);
  return NextResponse.json(data);
}

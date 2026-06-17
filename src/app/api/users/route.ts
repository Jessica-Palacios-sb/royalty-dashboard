import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createUser, getUsers } from "@/lib/store";
import { PageKey, Role } from "@/lib/types";

function sanitize(u: Awaited<ReturnType<typeof getUsers>>[number]) {
  const { passwordHash, ...rest } = u;
  return rest;
}

/** GET -> lista de usuarios (solo admin). */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  const users = await getUsers();
  return NextResponse.json({ users: users.map(sanitize) });
}

/** POST -> crea usuario con contraseña temporal (solo admin). */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim();
  const role: Role = body.role === "admin" ? "admin" : "viewer";
  const allowedPages: PageKey[] = Array.isArray(body.allowedPages)
    ? body.allowedPages.filter((p: string): p is PageKey => p === "dashboard" || p === "admin")
    : ["dashboard"];
  const tempPassword = String(body.tempPassword || "").trim();

  if (!email || !name || tempPassword.length < 8) {
    return NextResponse.json(
      { error: "Nombre, correo y contraseña temporal (mín. 8 caracteres) son requeridos" },
      { status: 400 }
    );
  }
  try {
    const user = await createUser({ email, name, role, allowedPages, tempPassword });
    return NextResponse.json({ user: sanitize(user) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error al crear usuario" }, { status: 400 });
  }
}

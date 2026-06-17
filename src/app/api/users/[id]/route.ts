import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteUser, updateUser } from "@/lib/store";
import { PageKey, Role } from "@/lib/types";

/** PATCH -> actualiza rol, permisos de páginas o estado activo (solo admin). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: { role?: Role; allowedPages?: PageKey[]; active?: boolean; name?: string } = {};
  if (body.role === "admin" || body.role === "viewer") patch.role = body.role;
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.active === "boolean") patch.active = body.active;
  if (Array.isArray(body.allowedPages)) {
    patch.allowedPages = body.allowedPages.filter(
      (p: string): p is PageKey => p === "dashboard" || p === "admin"
    );
  }
  try {
    const user = await updateUser(params.id, patch);
    const { passwordHash, ...rest } = user;
    return NextResponse.json({ user: rest });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error" }, { status: 400 });
  }
}

/** DELETE -> quita el acceso del usuario (solo admin). No permite auto-borrarse. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  if (me.id === params.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });
  }
  await deleteUser(params.id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateUser } from "@/lib/store";
import { hashPassword } from "@/lib/password";

/** POST -> restablece la contraseña a una temporal y fuerza el cambio (solo admin). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { tempPassword } = await req.json().catch(() => ({}));
  if (!tempPassword || String(tempPassword).length < 8) {
    return NextResponse.json(
      { error: "La contraseña temporal debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }
  await updateUser(params.id, {
    passwordHash: hashPassword(String(tempPassword)),
    mustChangePassword: true,
  });
  return NextResponse.json({ ok: true });
}

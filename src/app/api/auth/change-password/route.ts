import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { updateUser } from "@/lib/store";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }
  // Si NO es primer ingreso, exige la contraseña actual.
  if (!user.mustChangePassword) {
    if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }
  }
  await updateUser(user.id, {
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
  });
  return NextResponse.json({ ok: true });
}

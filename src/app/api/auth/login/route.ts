import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/store";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie, publicUser } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Correo y contraseña requeridos" }, { status: 400 });
  }
  const user = await findUserByEmail(email);
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }
  setSessionCookie(user.id);
  return NextResponse.json({ user: publicUser(user) });
}

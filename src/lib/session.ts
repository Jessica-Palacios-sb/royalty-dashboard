import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { findUserById } from "./store";
import { User } from "./types";

const COOKIE_NAME = "rd_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

function secret(): string {
  return process.env.SESSION_SECRET || "insecure-dev-secret";
}

/** Firma un payload (userId + expiración) con HMAC. */
function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function encode(userId: string): string {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const payload = `${userId}.${exp}`;
  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  if (Date.now() > Number(exp)) return null;
  return { userId };
}

export function setSessionCookie(userId: string): void {
  cookies().set(COOKIE_NAME, encode(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

/** Devuelve el usuario autenticado (o null) a partir de la cookie. */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = decode(token);
  if (!decoded) return null;
  const user = await findUserById(decoded.userId);
  if (!user || !user.active) return null;
  return user;
}

/** Versión "segura" para enviar al cliente (sin hash de contraseña). */
export function publicUser(u: User) {
  const { passwordHash, ...rest } = u;
  return rest;
}

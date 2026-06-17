// Aplica el esquema (src/lib/schema.sql) y siembra el admin inicial.
//
// Uso local:
//   node --env-file=.env.local scripts/db-setup.mjs
// Contra producción (tras `vercel env pull .env.production.local`):
//   node --env-file=.env.production.local scripts/db-setup.mjs
//
// Idempotente: el esquema usa "if not exists" y el admin solo se crea si no hay
// usuarios. Debe coincidir con hashPassword() de src/lib/password.ts.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, scryptSync, randomUUID } from "node:crypto";
import pg from "pg";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta POSTGRES_URL (o DATABASE_URL) en el entorno.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  const schema = await readFile(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf-8"
  );
  await pool.query(schema);
  console.log("✓ Esquema aplicado.");

  const { rows } = await pool.query("select count(*)::int as n from users");
  if (rows[0].n === 0) {
    const email = "jpalacios@smartbeemo.com";
    await pool.query(
      `insert into users
         (id, email, name, role, password_hash, must_change_password, allowed_pages, active, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8, now())`,
      [
        randomUUID(),
        email,
        "Juan Pablo Palacios",
        "admin",
        hashPassword("Smartbeemo2026"),
        true,
        ["dashboard", "admin"],
        true,
      ]
    );
    console.log(`✓ Admin inicial creado: ${email} (clave temporal: Smartbeemo2026)`);
  } else {
    console.log(`• Ya existen ${rows[0].n} usuario(s); no se siembra el admin.`);
  }
} catch (err) {
  console.error("Error en db:setup:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}

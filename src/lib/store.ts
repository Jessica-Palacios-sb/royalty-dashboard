import { randomUUID } from "crypto";
import { MonthConfig, User } from "./types";
import { hashPassword } from "./password";

/**
 * Store de persistencia sobre Postgres (Vercel Postgres / Neon).
 *
 * Reemplaza al antiguo store basado en data/db.json (que no persiste en Vercel
 * por tener un sistema de archivos efímero). Mantiene la misma interfaz pública
 * que consumen session.ts, dashboard.ts y las rutas API.
 *
 * La conexión usa POSTGRES_URL, la variable que inyecta la integración de
 * Vercel Postgres. El esquema vive en schema.sql y se aplica con `npm run db:setup`.
 */

let _pool: import("pg").Pool | null = null;

async function getPool(): Promise<import("pg").Pool> {
  if (_pool) return _pool;
  const { Pool } = await import("pg");
  const connectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta POSTGRES_URL (o DATABASE_URL). Configura la base de datos para persistir usuarios y configuración."
    );
  }
  _pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
  });
  return _pool;
}

// Pesos por defecto solicitados: clases 40 / videos 40 / bootcamp 20.
export const DEFAULT_PESOS = { clases: 40, videos: 40, bootcamp: 20 };

// Clave de settings donde guardamos los mentores que aplican (globales).
const MENTORES_KEY = "mentores_aplican";

/** Mapea una fila de la tabla users (snake_case) al tipo User (camelCase). */
function rowToUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    passwordHash: r.password_hash,
    mustChangePassword: r.must_change_password,
    allowedPages: r.allowed_pages || [],
    active: r.active,
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

// ---- Usuarios ----

export async function getUsers(): Promise<User[]> {
  const pool = await getPool();
  const res = await pool.query("select * from users order by created_at asc");
  return res.rows.map(rowToUser);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const pool = await getPool();
  const res = await pool.query(
    "select * from users where lower(email) = lower($1) limit 1",
    [email]
  );
  return res.rows[0] ? rowToUser(res.rows[0]) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const pool = await getPool();
  const res = await pool.query("select * from users where id = $1 limit 1", [id]);
  return res.rows[0] ? rowToUser(res.rows[0]) : undefined;
}

export async function createUser(input: {
  email: string;
  name: string;
  role: "admin" | "viewer";
  allowedPages: User["allowedPages"];
  tempPassword: string;
}): Promise<User> {
  const pool = await getPool();
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("Ya existe un usuario con ese correo");
  }
  const user: User = {
    id: randomUUID(),
    email: input.email,
    name: input.name,
    role: input.role,
    passwordHash: hashPassword(input.tempPassword),
    mustChangePassword: true,
    allowedPages: input.allowedPages,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await pool.query(
    `insert into users
       (id, email, name, role, password_hash, must_change_password, allowed_pages, active, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      user.id,
      user.email,
      user.name,
      user.role,
      user.passwordHash,
      user.mustChangePassword,
      user.allowedPages,
      user.active,
      user.createdAt,
    ]
  );
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<
    Pick<
      User,
      "name" | "role" | "allowedPages" | "active" | "passwordHash" | "mustChangePassword"
    >
  >
): Promise<User> {
  const pool = await getPool();
  const columns: Record<string, string> = {
    name: "name",
    role: "role",
    allowedPages: "allowed_pages",
    active: "active",
    passwordHash: "password_hash",
    mustChangePassword: "must_change_password",
  };
  const sets: string[] = [];
  const values: any[] = [];
  for (const [key, col] of Object.entries(columns)) {
    if (key in patch) {
      values.push((patch as any)[key]);
      sets.push(`${col} = $${values.length}`);
    }
  }
  if (sets.length === 0) {
    const current = await findUserById(id);
    if (!current) throw new Error("Usuario no encontrado");
    return current;
  }
  values.push(id);
  const res = await pool.query(
    `update users set ${sets.join(", ")} where id = $${values.length} returning *`,
    values
  );
  if (!res.rows[0]) throw new Error("Usuario no encontrado");
  return rowToUser(res.rows[0]);
}

export async function deleteUser(id: string): Promise<void> {
  const pool = await getPool();
  await pool.query("delete from users where id = $1", [id]);
}

// ---- Mentores que aplican (configuración global) ----

/** Lista de IDs de mentores que aplican al reparto (global, no cambia por mes). */
export async function getGlobalMentores(): Promise<string[]> {
  const pool = await getPool();
  const res = await pool.query("select value from settings where key = $1", [
    MENTORES_KEY,
  ]);
  const value = res.rows[0]?.value;
  return Array.isArray(value) ? value : [];
}

async function setGlobalMentores(ids: string[]): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `insert into settings (key, value) values ($1, $2::jsonb)
       on conflict (key) do update set value = excluded.value`,
    [MENTORES_KEY, JSON.stringify(ids)]
  );
}

// ---- Configuración por mes ----

export async function getMonthConfig(mes: string): Promise<MonthConfig | undefined> {
  const pool = await getPool();
  const res = await pool.query(
    "select mes, pesos, comision_total from month_configs where mes = $1",
    [mes]
  );
  const row = res.rows[0];
  if (!row) return undefined;
  return {
    mes: row.mes,
    pesos: row.pesos,
    comisionTotal: Number(row.comision_total),
    // Los mentores son globales; se rellenan desde settings.
    mentoresAplican: await getGlobalMentores(),
  };
}

export async function upsertMonthConfig(config: MonthConfig): Promise<MonthConfig> {
  const pool = await getPool();
  await pool.query(
    `insert into month_configs (mes, pesos, comision_total)
       values ($1, $2::jsonb, $3)
       on conflict (mes) do update
         set pesos = excluded.pesos, comision_total = excluded.comision_total`,
    [config.mes, JSON.stringify(config.pesos), config.comisionTotal]
  );
  // La selección de mentores es global: se guarda una sola vez para todos los meses.
  await setGlobalMentores(config.mentoresAplican);
  return config;
}

/** Aplica el esquema (schema.sql) y siembra el admin inicial si no hay usuarios. */
export async function setupDatabase(): Promise<void> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const pool = await getPool();
  const schema = await fs.readFile(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf-8"
  );
  await pool.query(schema);

  const count = await pool.query("select count(*)::int as n from users");
  if (count.rows[0].n === 0) {
    await createUser({
      email: "jpalacios@smartbeemo.com",
      name: "Juan Pablo Palacios",
      role: "admin",
      allowedPages: ["dashboard", "admin"],
      // Contraseña temporal inicial: Smartbeemo2026 (se obliga a cambiarla).
      tempPassword: "Smartbeemo2026",
    });
    // El admin sembrado queda como rol admin (createUser fija role).
  }
}

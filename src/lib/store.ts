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
 * Vercel Postgres. El esquema se aplica automáticamente la primera vez que se
 * usa la base (ver ensureReady), de modo que no hace falta un paso manual de
 * migración en Vercel. La copia en schema.sql se mantiene para `npm run db:setup`
 * (uso local) y debe permanecer sincronizada con SCHEMA_SQL.
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

/**
 * Esquema en línea (espejo de schema.sql) para poder crearlo en tiempo de
 * ejecución sin depender de leer un archivo del disco, que en el bundle
 * serverless de Vercel no siempre está disponible.
 */
const SCHEMA_SQL = `
create table if not exists users (
  id                    uuid primary key,
  email                 text not null unique,
  name                  text not null,
  role                  text not null,
  password_hash         text not null,
  must_change_password  boolean not null default true,
  allowed_pages         text[] not null default '{}',
  active                boolean not null default true,
  created_at            timestamptz not null default now()
);
create unique index if not exists users_email_lower_idx on users (lower(email));
create table if not exists month_configs (
  mes             text primary key,
  pesos           jsonb not null,
  comision_total  numeric not null default 0
);
create table if not exists settings (
  key    text primary key,
  value  jsonb not null
);
create table if not exists redshift_cache (
  key         text primary key,
  fetched_at  timestamptz not null default now(),
  payload     jsonb not null
);
`;

// Admin principal: siempre activo y con rol admin (no se puede bloquear ni borrar).
export const PRIMARY_ADMIN_EMAIL = "jpalacios@smartbeemo.com";

// Garantiza esquema + admin inicial una sola vez por instancia (idempotente).
let _ready: Promise<void> | null = null;

async function ensureReady(pool: import("pg").Pool): Promise<void> {
  if (_ready) return _ready;
  _ready = (async () => {
    await pool.query(SCHEMA_SQL);
    const count = await pool.query("select count(*)::int as n from users");
    if (count.rows[0].n === 0) {
      // Admin inicial. ON CONFLICT evita duplicados ante arranques concurrentes.
      await pool.query(
        `insert into users
           (id, email, name, role, password_hash, must_change_password, allowed_pages, active, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8, now())
         on conflict (email) do nothing`,
        [
          randomUUID(),
          PRIMARY_ADMIN_EMAIL,
          "Jessica Palacios",
          "admin",
          hashPassword("Smartbeemo2026"),
          true,
          ["dashboard", "admin"],
          true,
        ]
      );
    }
    // Salvaguarda: el admin principal nunca queda inactivo ni sin rol admin.
    await pool.query(
      `update users set active = true, role = 'admin'
         where lower(email) = lower($1) and (active = false or role <> 'admin')`,
      [PRIMARY_ADMIN_EMAIL]
    );
  })().catch((err) => {
    // Si falla, permitir reintento en la próxima llamada.
    _ready = null;
    throw err;
  });
  return _ready;
}

/** Pool listo para usar: conexión + esquema/seed garantizados. */
async function db(): Promise<import("pg").Pool> {
  const pool = await getPool();
  await ensureReady(pool);
  return pool;
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
  const pool = await db();
  const res = await pool.query("select * from users order by created_at asc");
  return res.rows.map(rowToUser);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const pool = await db();
  const res = await pool.query(
    "select * from users where lower(email) = lower($1) limit 1",
    [email]
  );
  return res.rows[0] ? rowToUser(res.rows[0]) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const pool = await db();
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
  const pool = await db();
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
  const pool = await db();
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
  const pool = await db();
  await pool.query("delete from users where id = $1", [id]);
}

// ---- Mentores que aplican (configuración global) ----

/** Lista de IDs de mentores que aplican al reparto (global, no cambia por mes). */
export async function getGlobalMentores(): Promise<string[]> {
  const pool = await db();
  const res = await pool.query("select value from settings where key = $1", [
    MENTORES_KEY,
  ]);
  const value = res.rows[0]?.value;
  return Array.isArray(value) ? value : [];
}

async function setGlobalMentores(ids: string[]): Promise<void> {
  const pool = await db();
  await pool.query(
    `insert into settings (key, value) values ($1, $2::jsonb)
       on conflict (key) do update set value = excluded.value`,
    [MENTORES_KEY, JSON.stringify(ids)]
  );
}

// ---- Configuración por mes ----

export async function getMonthConfig(mes: string): Promise<MonthConfig | undefined> {
  const pool = await db();
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
  const pool = await db();
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

// ---- Caché compartida de Redshift (en Postgres, válida para todas las instancias) ----

/** Devuelve el payload cacheado si no supera maxAgeMs; si no, null. */
export async function getRedshiftCache(
  key: string,
  maxAgeMs: number
): Promise<unknown | null> {
  const pool = await db();
  const res = await pool.query(
    `select payload from redshift_cache
       where key = $1 and fetched_at > now() - ($2::double precision * interval '1 millisecond')`,
    [key, maxAgeMs]
  );
  return res.rows[0]?.payload ?? null;
}

/** Fecha/hora (ISO) en que se guardó por última vez la clave, o null. */
export async function getRedshiftCacheFetchedAt(key: string): Promise<string | null> {
  const pool = await db();
  const res = await pool.query(
    "select fetched_at from redshift_cache where key = $1",
    [key]
  );
  const v = res.rows[0]?.fetched_at;
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

/** Guarda (o actualiza) el payload cacheado con la marca de tiempo actual. */
export async function setRedshiftCache(key: string, payload: unknown): Promise<void> {
  const pool = await db();
  await pool.query(
    `insert into redshift_cache (key, fetched_at, payload)
       values ($1, now(), $2::jsonb)
       on conflict (key) do update
         set fetched_at = now(), payload = excluded.payload`,
    [key, JSON.stringify(payload)]
  );
}

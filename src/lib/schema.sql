-- Esquema de persistencia para Vercel Postgres (Neon).
-- Idempotente: se puede ejecutar varias veces sin error.
-- Reemplaza al store basado en data/db.json.

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

-- Búsqueda case-insensitive por correo (login).
create unique index if not exists users_email_lower_idx on users (lower(email));

create table if not exists month_configs (
  mes             text primary key,            -- YYYY-MM
  pesos           jsonb not null,              -- { clases, videos, bootcamp }
  comision_total  numeric not null default 0
);

-- Ajustes globales (clave/valor). Aquí viven los mentores que aplican,
-- que son globales y no cambian por mes.
create table if not exists settings (
  key    text primary key,
  value  jsonb not null
);

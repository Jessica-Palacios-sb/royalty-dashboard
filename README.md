# Panel de Royalties — Mentores

Dashboard de comisiones por mentor (royalty) construido en Next.js, pensado para
desplegarse en Vercel. Lee métricas de Redshift (con caché) y permite configurar,
por mes, los pesos de cada segmento, el monto total de comisión y los mentores que
aplican. Incluye autenticación con roles y gestión de usuarios.

## Características

- **Dashboard** tipo tabla (igual a la imagen de referencia): por mentor muestra
  chargebacks, asistencia a clases en vivo, asistencia a videos e inscripción a
  bootcamp, con el **% de participación** de cada mentor en cada segmento, totales
  y filtro por mes.
- **Comisión** por mentor = `Total × (pClases×%clases + pVideos×%videos + pBootcamp×%bootcamp)`.
- **Administración** (solo rol admin):
  - Configuración **por mes**: pesos (suman 100%), monto total y mentores que aplican.
  - **Usuarios y permisos**: crear usuarios, asignar rol, controlar acceso a páginas,
    restablecer contraseñas y quitar accesos. Primer ingreso obliga a cambiar la clave.
- **Fuente de datos** conmutable con `DATA_SOURCE` (`mock` para demo, `redshift` en producción).

## Puesta en marcha (local)

```bash
npm install
npm run dev
```

Abre http://localhost:3000

**Usuario inicial (admin):**
- Correo: `jpalacios@smartbeemo.com`
- Contraseña temporal: `Smartbeemo2026` (se obliga a cambiarla en el primer ingreso)

## Variables de entorno

Copia `.env.example` a `.env.local` y ajusta:

- `SESSION_SECRET`: secreto para firmar las cookies de sesión.
- `POSTGRES_URL`: cadena de conexión Postgres para persistir usuarios y configuración.
  En Vercel la inyecta la integración Vercel Postgres.
- `DATA_SOURCE`: `mock` (demo) o `redshift` (producción).
- `REDSHIFT_*`: credenciales de Redshift (solo si `DATA_SOURCE=redshift`).
- `DASHBOARD_CACHE_MINUTES`: minutos de caché de la query (por defecto 180).

## Conexión a Redshift

La query del negocio vive en [`src/lib/redshift.ts`](src/lib/redshift.ts), envuelta
para agregar por mes y filtrar por el mes solicitado. Al poner `DATA_SOURCE=redshift`
y las credenciales, el dashboard consulta Redshift en vivo con caché en memoria.

## Persistencia (Postgres)

Usuarios y configuración se guardan en Postgres a través de
[`src/lib/store.ts`](src/lib/store.ts) (conexión vía `POSTGRES_URL`). El esquema vive en
[`src/lib/schema.sql`](src/lib/schema.sql):

- `users`: usuarios de login (correo, rol, hash de clave, páginas permitidas).
- `month_configs`: pesos y monto total **por mes**.
- `settings`: ajustes globales; aquí se guardan los **mentores que aplican**
  (la selección es global, no cambia por mes).

Las tablas y el admin inicial se crean **automáticamente** la primera vez que la app usa
la base (ver `ensureReady` en [`src/lib/store.ts`](src/lib/store.ts)), por lo que en Vercel
no hace falta ningún paso manual de migración. Todo es idempotente.

Para inicializar manualmente en local (opcional) hay un script equivalente:

```bash
node --env-file=.env.local scripts/db-setup.mjs   # o: npm run db:setup (con POSTGRES_URL en el entorno)
```

## Despliegue en Vercel

1. Subir el repo a GitHub.
2. Importar el proyecto en Vercel (equipo correspondiente).
3. Añadir la integración **Vercel Postgres** (inyecta `POSTGRES_URL` automáticamente).
4. Configurar las variables de entorno: `SESSION_SECRET`, `DATA_SOURCE=redshift`,
   `REDSHIFT_*`, `DASHBOARD_CACHE_MINUTES`.
5. Desplegar. La base se inicializa sola en el primer arranque (esquema + admin).
6. Asegurar que el cluster Redshift acepta conexiones desde el egress de Vercel.

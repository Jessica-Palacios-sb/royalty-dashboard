import { MentorMetric } from "./types";

/**
 * Conexión a Redshift (protocolo Postgres) usando `pg`, con caché en memoria.
 *
 * Solo se usa cuando DATA_SOURCE=redshift. La query es la entregada por el
 * negocio, envuelta para agregar por mes y filtrar por el mes solicitado.
 */

let _pool: import("pg").Pool | null = null;

async function getPool(): Promise<import("pg").Pool> {
  if (_pool) return _pool;
  const { Pool } = await import("pg");
  _pool = new Pool({
    host: process.env.REDSHIFT_HOST,
    port: Number(process.env.REDSHIFT_PORT || 5439),
    database: process.env.REDSHIFT_DATABASE,
    user: process.env.REDSHIFT_USER,
    password: process.env.REDSHIFT_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
  });
  return _pool;
}

/** Query del negocio (CTEs) tal cual, envuelta como subconsulta `base`. */
const BASE_QUERY = `
with mentor as (
  select id as id_mentor, sbeemo_fm_full_name__c as nombre_mentor,
         row_number() over(partition by id order by lastmodifieddate desc) as orden
  from "salesforce-database".mentor
),
attribution as (
  select a.id as attribution, m.id_mentor, m.nombre_mentor,
         a.sbeemo_rb_account__c as student_id,
         cast(date_trunc('month', a.sbeemo_fe_attribution_date__c) as date) as mes_atribucion,
         cast(a.sbeemo_fe_attribution_date__c as date) fecha_atribucion,
         row_number() over(partition by a.sbeemo_rb_account__c order by a.sbeemo_fe_attribution_date__c desc) as orden
  from "salesforce-database".attribution as a
  left join mentor as m on a.sbeemo_rb_mentor__c = m.id_mentor and m.orden = 1
  where a.sbeemo_rb_mentor__c is not null and m.id_mentor != 'a4kUH000009r8DZYAY'
),
ventas as (
  select m.id_mentor, m.nombre_mentor, v.student_id, v.producto, v.sub_tipo_venta,
         v.total_amount_usd, v.payment_amount_usd, v.fecha as fecha_pago,
         v.id_oportunidad, v.invoice_fact_number, v.id as id_factura
  from salesforce.tabla_intermedia_primeros_pagos as v
  left join mentor as m on v.creador_mentor = m.id_mentor and m.orden = 1
  where v.numero_invoice_factura = 1 and v.tipo_venta = 'Adquisicion'
    and v.creador_mentor is not null and v.open_balance = false
    and m.id_mentor != 'a4kUH000009r8DZYAY'
),
chargebacks as (
  select v.*, v.total_amount_usd - v.payment_amount_usd as valor_devuelto, c.Credit_Memo_Date
  from salesforce.tabla_core_credit_memo as c
  inner join ventas as v on c.id_factura = v.id_factura
  where c.reason_code != 'Discount' and v.id_mentor != 'a4kUH000009r8DZYAY'
),
clases as (
  select m.id_mentor, m.nombre_mentor, cast(c.fecha_start_class as date) fecha_lanzamiento,
         c.name_class, c.student_id,
         ROW_NUMBER() OVER(PARTITION BY c.student_id, cast(date_trunc('month', c.fecha_start_class) as date), m.id_mentor ORDER BY c.fecha_start_class asc) as unicos
  from salesforce.portal_tabla_intermedia_cv_usuario as c
  left join "portal2-mongo".bi_users_jc as u on c.salesforceid_mentor = u.salesforceid
  left join mentor as m on u.attributionid = m.id_mentor and m.orden = 1
  where c.asistio_clase = 'SI' and m.id_mentor is not null
    and cast(c.fecha_start_class as date) >= '2025-12-01' and m.id_mentor != 'a4kUH000009r8DZYAY'
),
videos as (
  select m.id_mentor, m.nombre_mentor, u.fecha as fecha_video, u.nombre_cohort,
         u.lecciones_vistas, u.student_id,
         ROW_NUMBER() OVER(PARTITION BY u.student_id, cast(date_trunc('month', u.fecha) as date), m.id_mentor ORDER BY u.fecha asc) as unicos
  from salesforce.portal_tabla_intermedia_usabilidad_dia_usuario as u
  left join "portal2-mongo".bi_academico_jc as a on u.id_diplomado = a.id_diplomado
  left join "portal2-mongo".bi_users_jc as us on a.mentor_principal_salesforceid = us.salesforceid
  left join mentor as m on us.attributionid = m.id_mentor and m.orden = 1
  where m.id_mentor is not null and u.fecha >= '2025-12-01' and m.id_mentor != 'a4kUH000009r8DZYAY'
),
bootcamp as (
  select m.id_mentor, m.nombre_mentor, cast(b.bootcamp_startdate as date) fecha_bootcamp,
         b.salesforceid as student_id,
         cast(date_trunc('month', cast(b.createdat_enrollamiento_user as date)) as date) as mes_enrolamiento,
         cast(date_trunc('month', cast(b.bootcamp_startdate as date)) as date) as mes_bootcamp,
         ROW_NUMBER() OVER(PARTITION BY b.salesforceid, cast(date_trunc('month', cast(b.createdat_enrollamiento_user as date)) as date), cast(date_trunc('month', cast(b.bootcamp_startdate as date)) as date), m.id_mentor ORDER BY b.createdat_enrollamiento_user asc) as unicos
  from "portal2-mongo".bi_bootcamp_report_jc as b
  left join "portal2-mongo".bi_users_jc as u on b.mentor_principal_salesforceid = u.salesforceid
  left join mentor as m on u.attributionid = m.id_mentor and m.orden = 1
  where m.id_mentor is not null and cast(b.createdat_enrollamiento_user as date) >= '2025-12-01'
    and m.id_mentor != 'a4kUH000009r8DZYAY'
),
agrupacion as (
  select id_mentor, nombre_mentor, cast(date_trunc('month', Credit_Memo_Date) as date) as mes,
         cast(Credit_Memo_Date as date) as fecha, count(id_factura) as chargebacks,
         sum(0) as clases_en_vivo, sum(0) as videos, sum(0) as bootcamp
  from chargebacks group by 1,2,3,4
  union all
  select id_mentor, nombre_mentor, cast(date_trunc('month', fecha_lanzamiento) as date) as mes,
         fecha_lanzamiento as fecha, sum(0) as chargebacks,
         count(case when unicos = 1 then student_id else null end) as clases_en_vivo,
         sum(0) as videos, sum(0) as bootcamp
  from clases group by 1,2,3,4
  union all
  select id_mentor, nombre_mentor, cast(date_trunc('month', fecha_video) as date) as mes,
         fecha_video as fecha, sum(0) as chargebacks, sum(0) as clases_en_vivo,
         count(case when unicos = 1 then student_id else null end) as videos, sum(0) as bootcamp
  from videos group by 1,2,3,4
  union all
  select id_mentor, nombre_mentor, cast(date_trunc('month', fecha_bootcamp) as date) as mes,
         fecha_bootcamp as fecha, sum(0) as chargebacks, sum(0) as clases_en_vivo,
         sum(0) as videos,
         count(case when unicos = 1 then student_id else null end) as bootcamp
  from bootcamp where mes_enrolamiento = mes_bootcamp group by 1,2,3,4
)
select id_mentor, nombre_mentor, mes, fecha,
       sum(chargebacks) as chargebacks,
       sum(clases_en_vivo) as asistentes_clases_en_vivo,
       sum(videos) as asistentes_videos,
       sum(bootcamp) as bootcamp
from agrupacion group by 1,2,3,4
`;

// El refresco real lo hace el cron diario (7 a.m. Colombia). Esta es solo una red
// de seguridad: si el cron fallara, una lectura más vieja que esto vuelve a Redshift.
function cacheMs(): number {
  return Number(process.env.DASHBOARD_CACHE_MINUTES || 2880) * 60 * 1000; // 48 h
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthKey(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Refresca el snapshot desde Redshift (lo invoca el cron diario): vuelve a
 * consultar la lista de meses y el mes actual + el anterior, y los guarda.
 */
export async function refreshRedshiftCache(): Promise<{ refreshed: string[] }> {
  const { setRedshiftCache } = await import("./store");
  const refreshed: string[] = [];

  const pool = await getPool();
  // Meses disponibles
  const monthsSql = `select distinct to_char(mes, 'YYYY-MM') as mes from ( ${BASE_QUERY} ) base order by 1 desc`;
  const monthsRes = await pool.query(monthsSql);
  const months: string[] = monthsRes.rows.map((r: any) => r.mes);
  await setRedshiftCache("months", months);
  refreshed.push("months");

  // Mes actual y anterior (los que cambian)
  for (const mes of [currentMonthKey(), prevMonthKey()]) {
    const rows = await fetchMetricsLive(mes);
    await setRedshiftCache(`metrics:${mes}`, rows);
    refreshed.push(mes);
  }
  return { refreshed };
}

/** Consulta en vivo (sin caché) las métricas de un mes. */
async function fetchMetricsLive(mes: string): Promise<MentorMetric[]> {
  const pool = await getPool();
  const monthStart = `${mes}-01`;
  const sql = `
    select id_mentor,
           max(nombre_mentor) as nombre_mentor,
           sum(chargebacks) as chargebacks,
           sum(asistentes_clases_en_vivo) as clases_en_vivo,
           sum(asistentes_videos) as videos,
           sum(bootcamp) as bootcamp
    from ( ${BASE_QUERY} ) base
    where mes = cast($1 as date)
    group by id_mentor`;
  const res = await pool.query(sql, [monthStart]);
  return res.rows.map((r: any) => ({
    idMentor: r.id_mentor,
    nombreMentor: r.nombre_mentor,
    mes,
    chargebacks: Number(r.chargebacks) || 0,
    clasesEnVivo: Number(r.clases_en_vivo) || 0,
    videos: Number(r.videos) || 0,
    bootcamp: Number(r.bootcamp) || 0,
  }));
}

/** Métricas por mentor de un mes (YYYY-MM). Lee el snapshot; si no existe o es
 *  muy viejo (red de seguridad), consulta en vivo y lo guarda. */
export async function queryRedshiftMetrics(mes: string): Promise<MentorMetric[]> {
  const { getRedshiftCache, setRedshiftCache } = await import("./store");
  const cacheKey = `metrics:${mes}`;
  const cached = (await getRedshiftCache(cacheKey, cacheMs())) as MentorMetric[] | null;
  if (cached) return cached;

  const rows = await fetchMetricsLive(mes);
  await setRedshiftCache(cacheKey, rows);
  return rows;
}

/** Meses con datos disponibles (YYYY-MM), ordenados desc, con caché diaria. */
export async function queryRedshiftMonths(): Promise<string[]> {
  const { getRedshiftCache, setRedshiftCache } = await import("./store");
  const cached = (await getRedshiftCache("months", cacheMs())) as string[] | null;
  if (cached) return cached;

  const pool = await getPool();
  const sql = `select distinct to_char(mes, 'YYYY-MM') as mes from ( ${BASE_QUERY} ) base order by 1 desc`;
  const res = await pool.query(sql);
  const months: string[] = res.rows.map((r: any) => r.mes);
  await setRedshiftCache("months", months);
  return months;
}

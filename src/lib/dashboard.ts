import {
  DashboardResponse,
  DashboardRow,
  DashboardTotals,
  MentorMetric,
  MonthConfig,
} from "./types";
import { getMockMetrics, getMockMonths } from "./mockData";
import { DEFAULT_PESOS, getMonthConfig, getGlobalMentores } from "./store";

/** Mes en curso en formato YYYY-MM. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Obtiene las métricas crudas de un mes según la fuente de datos.
 * mock -> datos de ejemplo. redshift -> query en vivo (pendiente de conectar).
 */
async function getMetrics(mes: string): Promise<MentorMetric[]> {
  if ((process.env.DATA_SOURCE || "mock") === "redshift") {
    const { queryRedshiftMetrics } = await import("./redshift");
    return queryRedshiftMetrics(mes);
  }
  return getMockMetrics(mes);
}

async function getAvailableMonths(): Promise<string[]> {
  if ((process.env.DATA_SOURCE || "mock") === "redshift") {
    const { queryRedshiftMonths } = await import("./redshift");
    return queryRedshiftMonths();
  }
  return getMockMonths();
}

/** Config efectiva del mes: la guardada por el admin o una por defecto. */
export async function effectiveConfig(
  mes: string,
  metrics: MentorMetric[]
): Promise<MonthConfig> {
  // Los mentores que aplican son globales (no cambian por mes). Si todavía no se
  // ha configurado ninguno, por defecto aplican todos los mentores con actividad.
  const mentoresGlobal = await getGlobalMentores();
  const mentoresAplican =
    mentoresGlobal.length > 0 ? mentoresGlobal : metrics.map((m) => m.idMentor);

  const saved = await getMonthConfig(mes);
  if (saved) return { ...saved, mentoresAplican };
  return {
    mes,
    pesos: { ...DEFAULT_PESOS },
    comisionTotal: 0,
    mentoresAplican,
  };
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

/**
 * Calcula filas y totales del dashboard.
 * Comisión por mentor = comisionTotal × (pClases×%clases + pVideos×%videos + pBootcamp×%bootcamp)
 * donde los % son la participación del mentor dentro del segmento (solo entre
 * los mentores que aplican ese mes), y los pesos están normalizados a 1.
 */
export function buildDashboard(
  metrics: MentorMetric[],
  config: MonthConfig
): { rows: DashboardRow[]; totals: DashboardTotals } {
  const aplican = new Set(config.mentoresAplican);
  const aplicables = metrics.filter((m) => aplican.has(m.idMentor));

  const totClases = aplicables.reduce((s, m) => s + m.clasesEnVivo, 0);
  const totVideos = aplicables.reduce((s, m) => s + m.videos, 0);
  const totBootcamp = aplicables.reduce((s, m) => s + m.bootcamp, 0);

  const sumPesos =
    config.pesos.clases + config.pesos.videos + config.pesos.bootcamp || 1;
  const wClases = config.pesos.clases / sumPesos;
  const wVideos = config.pesos.videos / sumPesos;
  const wBootcamp = config.pesos.bootcamp / sumPesos;

  const rows: DashboardRow[] = aplicables.map((m) => {
    const pctClases = pct(m.clasesEnVivo, totClases);
    const pctVideos = pct(m.videos, totVideos);
    const pctBootcamp = pct(m.bootcamp, totBootcamp);
    const factor =
      wClases * (pctClases / 100) +
      wVideos * (pctVideos / 100) +
      wBootcamp * (pctBootcamp / 100);
    return {
      idMentor: m.idMentor,
      nombreMentor: m.nombreMentor,
      chargebacks: m.chargebacks,
      clasesEnVivo: m.clasesEnVivo,
      videos: m.videos,
      bootcamp: m.bootcamp,
      pctClases,
      pctVideos,
      pctBootcamp,
      comision: config.comisionTotal * factor,
    };
  });

  const totals: DashboardTotals = {
    chargebacks: aplicables.reduce((s, m) => s + m.chargebacks, 0),
    clasesEnVivo: totClases,
    videos: totVideos,
    bootcamp: totBootcamp,
    comision: rows.reduce((s, r) => s + r.comision, 0),
  };

  return { rows, totals };
}

export async function getDashboard(mes: string): Promise<DashboardResponse> {
  const metrics = await getMetrics(mes);
  const config = await effectiveConfig(mes, metrics);
  const { rows, totals } = buildDashboard(metrics, config);
  const mesesDisponibles = await getAvailableMonths();
  return { mes, mesesDisponibles, config, rows, totals };
}

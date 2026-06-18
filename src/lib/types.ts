// ---- Dominio del dashboard ----

export type Role = "admin" | "viewer";

/** Páginas/secciones del panel. Pensado para crecer con más pestañas. */
export type PageKey = "dashboard" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Hash de la contraseña en formato scrypt: salt:hash (hex). */
  passwordHash: string;
  /** Si true, al ingresar se obliga a cambiar la contraseña. */
  mustChangePassword: boolean;
  /** Secciones a las que tiene acceso (para roles viewer / futuras pestañas). */
  allowedPages: PageKey[];
  active: boolean;
  createdAt: string;
}

/** Métrica cruda por mentor en un mes (lo que devuelve la query de Redshift). */
export interface MentorMetric {
  idMentor: string;
  nombreMentor: string;
  /** Mes en formato YYYY-MM. */
  mes: string;
  chargebacks: number;
  clasesEnVivo: number;
  videos: number;
  bootcamp: number;
}

/** Configuración editable por el admin para un mes específico. */
export interface MonthConfig {
  /** YYYY-MM */
  mes: string;
  /** Pesos por segmento (deben sumar 100). */
  pesos: {
    clases: number;
    videos: number;
    bootcamp: number;
  };
  /** Monto total de comisión a repartir (USD). */
  comisionTotal: number;
  /** IDs de mentores a los que aplica el reparto este mes. */
  mentoresAplican: string[];
}

/** Fila ya calculada que consume la tabla del dashboard. */
export interface DashboardRow {
  idMentor: string;
  nombreMentor: string;
  chargebacks: number;
  clasesEnVivo: number;
  videos: number;
  bootcamp: number;
  pctClases: number; // participación dentro del segmento (0-100)
  pctVideos: number;
  pctBootcamp: number;
  pctTotal: number; // suma de las tres participaciones
  comision: number; // USD asignados a este mentor
}

export interface DashboardTotals {
  chargebacks: number;
  clasesEnVivo: number;
  videos: number;
  bootcamp: number;
  pctTotal: number; // suma de las participaciones totales de los mentores
  comision: number;
}

export interface DashboardResponse {
  mes: string;
  mesesDisponibles: string[];
  config: MonthConfig;
  rows: DashboardRow[];
  totals: DashboardTotals;
  /** Fecha/hora (ISO) de la última actualización de datos desde Redshift. */
  actualizadoEn?: string | null;
}

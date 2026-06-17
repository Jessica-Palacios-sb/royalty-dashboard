import { MentorMetric } from "./types";

/**
 * Catálogo de mentores (royalty) que aparecen en el reporte.
 * El idMentor imita el formato de Salesforce; en producción vienen de la query.
 */
export const MENTORES: { id: string; nombre: string }[] = [
  { id: "a4k0000000000001", nombre: "Juanma Gaviria" },
  { id: "a4k0000000000002", nombre: "Camilo Chamorro" },
  { id: "a4k0000000000003", nombre: "Santiago Murillo" },
  { id: "a4k0000000000004", nombre: "Tian Rodríguez" },
  { id: "a4k0000000000005", nombre: "Jenny González" },
  { id: "a4k0000000000006", nombre: "Cristian González Vargas" },
  { id: "a4k0000000000007", nombre: "Fabián Perdomo" },
  { id: "a4k0000000000008", nombre: "Natalia Escobar Chaquea" },
  { id: "a4k0000000000009", nombre: "Viviana Rodríguez" },
  { id: "a4k0000000000010", nombre: "Daniel Molina" },
  { id: "a4k0000000000011", nombre: "Alan Piña" },
  { id: "a4k0000000000012", nombre: "Felipe Hernández" },
  { id: "a4k0000000000013", nombre: "Jefferson Fuentes" },
  { id: "a4k0000000000014", nombre: "Pedro Luis Fonseca" },
  { id: "a4k0000000000015", nombre: "Lauren Arboleda" },
  { id: "a4k0000000000016", nombre: "Camilo Vargas" },
  { id: "a4k0000000000017", nombre: "Mabel Quintero" },
  { id: "a4k0000000000018", nombre: "Martha Botero" },
  { id: "a4k0000000000019", nombre: "Luis Micheo" },
];

const byName = (nombre: string) => {
  const m = MENTORES.find((x) => x.nombre === nombre);
  if (!m) throw new Error(`Mentor no encontrado en mock: ${nombre}`);
  return m;
};

/** Helper para construir una métrica de un mes. */
function metric(
  mes: string,
  nombre: string,
  chargebacks: number,
  clasesEnVivo: number,
  videos: number,
  bootcamp: number
): MentorMetric {
  const m = byName(nombre);
  return {
    idMentor: m.id,
    nombreMentor: m.nombre,
    mes,
    chargebacks,
    clasesEnVivo,
    videos,
    bootcamp,
  };
}

// ---- Mayo 2026: datos tomados de la imagen de referencia ----
const MAYO_2026: MentorMetric[] = [
  metric("2026-05", "Juanma Gaviria", 3, 0, 173, 155),
  metric("2026-05", "Camilo Chamorro", 1, 0, 77, 197),
  metric("2026-05", "Santiago Murillo", 7, 2, 42, 132),
  metric("2026-05", "Tian Rodríguez", 0, 0, 277, 0),
  metric("2026-05", "Jenny González", 0, 0, 84, 78),
  metric("2026-05", "Cristian González Vargas", 2, 0, 14, 96),
  metric("2026-05", "Fabián Perdomo", 5, 0, 162, 0),
  metric("2026-05", "Natalia Escobar Chaquea", 0, 0, 128, 0),
  metric("2026-05", "Viviana Rodríguez", 0, 0, 93, 0),
  metric("2026-05", "Daniel Molina", 0, 0, 0, 44),
  metric("2026-05", "Alan Piña", 0, 0, 80, 0),
  metric("2026-05", "Felipe Hernández", 0, 0, 78, 0),
  metric("2026-05", "Jefferson Fuentes", 2, 0, 76, 0),
  metric("2026-05", "Pedro Luis Fonseca", 0, 0, 29, 0),
  metric("2026-05", "Lauren Arboleda", 0, 0, 25, 0),
  metric("2026-05", "Camilo Vargas", 0, 0, 20, 0),
  metric("2026-05", "Mabel Quintero", 0, 0, 14, 0),
  metric("2026-05", "Martha Botero", 0, 0, 12, 0),
  metric("2026-05", "Luis Micheo", 0, 0, 7, 0),
];

// ---- Junio 2026 (mes en curso): datos de ejemplo parciales ----
const JUNIO_2026: MentorMetric[] = [
  metric("2026-06", "Juanma Gaviria", 1, 1, 95, 64),
  metric("2026-06", "Camilo Chamorro", 0, 0, 41, 88),
  metric("2026-06", "Santiago Murillo", 2, 3, 21, 70),
  metric("2026-06", "Tian Rodríguez", 0, 0, 140, 0),
  metric("2026-06", "Jenny González", 0, 1, 47, 33),
  metric("2026-06", "Cristian González Vargas", 1, 0, 9, 51),
  metric("2026-06", "Fabián Perdomo", 2, 0, 80, 0),
  metric("2026-06", "Natalia Escobar Chaquea", 0, 0, 66, 0),
  metric("2026-06", "Viviana Rodríguez", 0, 0, 49, 0),
  metric("2026-06", "Daniel Molina", 0, 0, 0, 22),
  metric("2026-06", "Alan Piña", 0, 0, 38, 0),
  metric("2026-06", "Felipe Hernández", 0, 0, 40, 0),
  metric("2026-06", "Jefferson Fuentes", 1, 0, 35, 0),
  metric("2026-06", "Pedro Luis Fonseca", 0, 0, 14, 0),
  metric("2026-06", "Lauren Arboleda", 0, 0, 12, 0),
  metric("2026-06", "Camilo Vargas", 0, 0, 9, 0),
  metric("2026-06", "Mabel Quintero", 0, 0, 6, 0),
  metric("2026-06", "Martha Botero", 0, 0, 5, 0),
  metric("2026-06", "Luis Micheo", 0, 0, 3, 0),
];

export const MOCK_METRICS: MentorMetric[] = [...JUNIO_2026, ...MAYO_2026];

/** Devuelve las métricas mock de un mes (YYYY-MM). */
export function getMockMetrics(mes: string): MentorMetric[] {
  return MOCK_METRICS.filter((m) => m.mes === mes);
}

/** Meses con datos disponibles, ordenados desc. */
export function getMockMonths(): string[] {
  return Array.from(new Set(MOCK_METRICS.map((m) => m.mes))).sort().reverse();
}

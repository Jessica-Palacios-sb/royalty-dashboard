export function fmtPct(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} %`;
}

export function fmtInt(v: number): string {
  return new Intl.NumberFormat("es-CO").format(Math.round(v));
}

export function fmtUSD(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-05" -> "mayo 2026" */
export function mesLabel(mes: string): string {
  const [y, m] = mes.split("-");
  const idx = Number(m) - 1;
  return `${MESES[idx] ?? m} ${y}`;
}

import type { TableRecord } from "./types";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatUsd(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "USD" });
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return value.toLocaleString("pt-BR");
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatDay(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function toCsv(records: TableRecord[]): string {
  const lines = ["Cliente;Data;Gasto USD;Tokens;Pedidos;Participação %"];
  for (const row of records) {
    lines.push(
      [
        row.client,
        row.date,
        row.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        String(row.tokens),
        String(row.requests),
        row.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      ].join(";"),
    );
  }
  return `\uFEFF${lines.join("\n")}`;
}

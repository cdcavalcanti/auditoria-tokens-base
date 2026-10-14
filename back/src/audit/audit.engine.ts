// Números de exemplo para ver a cara do Meter. A posição fica em 14 out 2026
// para a tela não mudar entre um carregamento e outro. Não há cliente real.

export const AS_OF = "2026-10-14";
export const LOOKBACK_DAYS = 90;

export type Period = "today" | "7d" | "30d" | "month" | "quarter" | "custom";

export type ClientAccount = {
  id: string;
  name: string;
  weight: number;
};

export const CLIENTS: ClientAccount[] = [
  { id: "food", name: "Food service", weight: 1 },
  { id: "lojas", name: "Rede de lojas", weight: 0.62 },
  { id: "educacao", name: "Educação", weight: 0.38 },
  { id: "clinica", name: "Clínica", weight: 0.3 },
  { id: "casa", name: "Casa Vortex", weight: 0.24 },
  { id: "servicos", name: "Serviços locais", weight: 0.16 },
];

export const CLIENTS_BY_NAME = [...CLIENTS].sort((a, b) =>
  a.name.localeCompare(b.name, "pt-BR"),
);

type Usage = {
  clientId: string;
  date: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requests: number;
};

export type AuditFilter = {
  period: Period;
  clientId: string;
  startDate?: string;
  endDate?: string;
};

export type DateRange = {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
};

export type Kpis = {
  totalSpent: number;
  totalChangePct: number;
  dailyAvg: number;
  dailyChangePct: number;
  totalTokens: number;
  inputSharePct: number;
  totalRequests: number;
  topClient: { name: string; pct: number };
};

export type DailyPoint = {
  clientId: string;
  name: string;
  values: number[];
};

export type ShareSlice = {
  clientId: string;
  name: string;
  cost: number;
  pct: number;
};

export type CostBar = {
  clientId: string;
  name: string;
  cost: number;
  pctOfMax: number;
};

export type TokenBucket = {
  label: string;
  tokens: number;
};

export type TokenStory = {
  buckets: TokenBucket[];
  peakPerHour: number;
  trend: "subindo" | "caindo" | "estável";
};

export type TableRecord = {
  client: string;
  date: string;
  cost: number;
  tokens: number;
  requests: number;
  pct: number;
};

export type AuditView = {
  range: DateRange;
  kpis: Kpis;
  daily: { labels: string[]; series: DailyPoint[] };
  distribution: ShareSlice[];
  costs: CostBar[];
  tokens: TokenStory;
  records: TableRecord[];
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISO(date);
}

function diffDays(start: string, end: string): number {
  return Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / 86_400_000);
}

export const DATA_START = addDays(AS_OF, -(LOOKBACK_DAYS - 1));

function rand(seed: number): number {
  let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function sum(rows: Usage[], pick: (row: Usage) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

function buildUsage(): Usage[] {
  const rows: Usage[] = [];
  for (let day = 0; day < LOOKBACK_DAYS; day += 1) {
    const date = addDays(DATA_START, day);
    const weekday = parseISO(date).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.4 : 1;
    const trend = 1 + (day / LOOKBACK_DAYS) * 0.3;
    CLIENTS.forEach((client, index) => {
      const noise = 0.7 + rand(day * 97 + index * 13 + 7) * 0.7;
      const costUsd = round2(22 * client.weight * weekend * trend * noise);
      const perDollar = 50_000 + rand(day * 31 + index * 17 + 3) * 20_000;
      const totalTokens = Math.round(costUsd * perDollar);
      const inputShare = 0.65 + rand(day * 11 + index * 19 + 5) * 0.15;
      const inputTokens = Math.round(totalTokens * inputShare);
      const outputTokens = totalTokens - inputTokens;
      const perRequest = 2_000 + rand(day * 23 + index * 29 + 9) * 1_500;
      const requests = Math.max(1, Math.round(totalTokens / perRequest));
      rows.push({
        clientId: client.id,
        date,
        costUsd,
        inputTokens,
        outputTokens,
        totalTokens,
        requests,
      });
    });
  }
  return rows;
}

const USAGE = buildUsage();

const NAMES = new Map(CLIENTS.map((client) => [client.id, client.name]));

export function clientName(id: string): string {
  return NAMES.get(id) ?? id;
}

export function dateRange(filter: AuditFilter): DateRange | null {
  if (filter.period === "custom") {
    const start = filter.startDate ?? "";
    const end = filter.endDate ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
      return null;
    }
    const days = diffDays(start, end) + 1;
    const prevEnd = addDays(start, -1);
    const prevStart = addDays(prevEnd, -(days - 1));
    return { start, end, prevStart, prevEnd };
  }

  if (filter.period === "month") {
    const start = `${AS_OF.slice(0, 8)}01`;
    const prevEnd = addDays(start, -1);
    const prevStart = `${prevEnd.slice(0, 8)}01`;
    return { start, end: AS_OF, prevStart, prevEnd };
  }

  const days = filter.period === "today" ? 1 : filter.period === "7d" ? 7 : filter.period === "quarter" ? 90 : 30;
  const start = addDays(AS_OF, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { start, end: AS_OF, prevStart, prevEnd };
}

function inRange(start: string, end: string, clientId: string): Usage[] {
  return USAGE.filter(
    (row) => row.date >= start && row.date <= end && (!clientId || row.clientId === clientId),
  );
}

function ranked(rows: Usage[]): { clientId: string; cost: number }[] {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.clientId, (totals.get(row.clientId) ?? 0) + row.costUsd);
  return [...totals.entries()]
    .map(([clientId, cost]) => ({ clientId, cost }))
    .sort((a, b) => b.cost - a.cost);
}

function percentShares(values: number[]): number[] {
  const total = values.reduce((summed, value) => summed + value, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((value) => (value / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  let leftover = 100 - floors.reduce((summed, value) => summed + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const item of order) {
    if (leftover <= 0) break;
    floors[item.index] += 1;
    leftover -= 1;
  }
  return floors;
}

function tokenStory(rows: Usage[]): TokenStory {
  if (!rows.length) return { buckets: [], peakPerHour: 0, trend: "estável" };

  const byDate = new Map<string, number>();
  for (const row of rows) byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.totalTokens);
  const days = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const bucketSize = Math.max(1, Math.floor(days.length / 10));
  const buckets: TokenBucket[] = [];
  for (let index = 0; index < days.length; index += bucketSize) {
    const chunk = days.slice(index, index + bucketSize);
    buckets.push({
      label: chunk[0][0],
      tokens: chunk.reduce((total, day) => total + day[1], 0),
    });
  }

  const maxDaily = Math.max(...days.map((day) => day[1]));
  const mid = Math.floor(days.length / 2);
  const first = days.slice(0, mid).reduce((total, day) => total + day[1], 0);
  const second = days.slice(mid).reduce((total, day) => total + day[1], 0);
  let trend: TokenStory["trend"] = "estável";
  if (second > first * 1.1) trend = "subindo";
  else if (second < first * 0.9) trend = "caindo";

  return { buckets, peakPerHour: Math.round(maxDaily / 24), trend };
}

export function auditView(filter: AuditFilter, search = ""): AuditView | null {
  const range = dateRange(filter);
  if (!range) return null;

  const current = inRange(range.start, range.end, filter.clientId);
  const previous = inRange(range.prevStart, range.prevEnd, filter.clientId);
  const totalSpent = sum(current, (row) => row.costUsd);
  const prevSpent = sum(previous, (row) => row.costUsd);
  const days = new Set(current.map((row) => row.date)).size || 1;
  const prevDays = new Set(previous.map((row) => row.date)).size || 1;
  const dailyAvg = totalSpent / days;
  const prevDaily = prevSpent / prevDays;
  const totalTokens = sum(current, (row) => row.totalTokens);
  const inputTokens = sum(current, (row) => row.inputTokens);
  const ranking = ranked(current);
  const top = ranking[0];

  const labels: string[] = [];
  for (let date = range.start; date <= range.end; date = addDays(date, 1)) labels.push(date);

  const ids = filter.clientId ? [filter.clientId] : CLIENTS.map((client) => client.id);
  const series = ids
    .map((clientId) => {
      const byDate = new Map<string, number>();
      for (const row of current) {
        if (row.clientId !== clientId) continue;
        byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.costUsd);
      }
      return {
        clientId,
        name: clientName(clientId),
        values: labels.map((date) => round2(byDate.get(date) ?? 0)),
      };
    })
    .filter((item) => item.values.some((value) => value > 0))
    .sort((a, b) => {
      const totalA = a.values.reduce((total, value) => total + value, 0);
      const totalB = b.values.reduce((total, value) => total + value, 0);
      return totalB - totalA;
    });

  const shareValues = percentShares(ranking.map((item) => item.cost));
  const distribution = ranking.map((item, index) => ({
    clientId: item.clientId,
    name: clientName(item.clientId),
    cost: round2(item.cost),
    pct: shareValues[index] ?? 0,
  }));

  const maxCost = ranking[0]?.cost ?? 0;
  const costs = ranking.map((item) => ({
    clientId: item.clientId,
    name: clientName(item.clientId),
    cost: round2(item.cost),
    pctOfMax: maxCost ? Math.round((item.cost / maxCost) * 1000) / 10 : 0,
  }));

  const query = fold(search.trim());
  const records = [...current]
    .filter((row) => !query || fold(clientName(row.clientId)).includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.costUsd - a.costUsd)
    .map((row) => ({
      client: clientName(row.clientId),
      date: row.date,
      cost: row.costUsd,
      tokens: row.totalTokens,
      requests: row.requests,
      pct: totalSpent ? round1((row.costUsd / totalSpent) * 100) : 0,
    }));

  return {
    range,
    kpis: {
      totalSpent: round2(totalSpent),
      totalChangePct: prevSpent ? round1(((totalSpent - prevSpent) / prevSpent) * 100) : 0,
      dailyAvg: round2(dailyAvg),
      dailyChangePct: prevDaily ? round1(((dailyAvg - prevDaily) / prevDaily) * 100) : 0,
      totalTokens,
      inputSharePct: totalTokens ? Math.round((inputTokens / totalTokens) * 100) : 0,
      totalRequests: sum(current, (row) => row.requests),
      topClient: {
        name: top ? clientName(top.clientId) : "—",
        pct: top && totalSpent ? round1((top.cost / totalSpent) * 100) : 0,
      },
    },
    daily: { labels, series },
    distribution,
    costs,
    tokens: tokenStory(current),
    records,
  };
}

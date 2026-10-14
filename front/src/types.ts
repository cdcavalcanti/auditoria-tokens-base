export type Period = "today" | "7d" | "30d" | "month" | "quarter" | "custom";

export type AuditMeta = {
  asOf: string;
  dataStart: string;
  clients: { id: string; name: string }[];
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

export type TokenStory = {
  buckets: { label: string; tokens: number }[];
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
  range: { start: string; end: string; prevStart: string; prevEnd: string };
  kpis: {
    totalSpent: number;
    totalChangePct: number;
    dailyAvg: number;
    dailyChangePct: number;
    totalTokens: number;
    inputSharePct: number;
    totalRequests: number;
    topClient: { name: string; pct: number };
  };
  daily: { labels: string[]; series: DailyPoint[] };
  distribution: ShareSlice[];
  costs: CostBar[];
  tokens: TokenStory;
  records: TableRecord[];
};

export type AuditRequest = {
  period: Period;
  clientId: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

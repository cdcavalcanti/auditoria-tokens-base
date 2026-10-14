import { ChevronDown, Download, Minus, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { loadAudit, loadMeta } from "./api";
import { cn } from "./cn";
import { CostBars, Distribution, SpendChart, TokenBars } from "./components/charts";
import { MeterLogo } from "./components/logo";
import { formatCompact, formatDate, formatPct, formatUsd, toCsv } from "./format";
import type { AuditMeta, AuditView, Period } from "./types";

const PER_PAGE = 8;

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "quarter", label: "90 dias" },
  { value: "custom", label: "Personalizado" },
];

type Draft = {
  period: Period;
  clientId: string;
  start: string;
  end: string;
};

const INITIAL: Draft = { period: "30d", clientId: "", start: "", end: "" };

function toRequest(draft: Draft, search = "") {
  return {
    period: draft.period,
    clientId: draft.clientId,
    startDate: draft.start,
    endDate: draft.end,
    search,
  };
}

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function Change({ value }: { value: number }) {
  let Icon = Minus;
  if (value > 0) Icon = TrendingUp;
  else if (value < 0) Icon = TrendingDown;
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs text-[#8C8C99]">
      <Icon className="size-3.5" aria-hidden="true" />
      <span>
        {formatPct(value)} <span className="text-[#8C8C99]/80">vs período anterior</span>
      </span>
    </p>
  );
}

export function MeterApp() {
  const [meta, setMeta] = useState<AuditMeta | null>(null);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [applied, setApplied] = useState<Draft>(INITIAL);
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableDraft, setTableDraft] = useState<Draft>(INITIAL);
  const [tableOn, setTableOn] = useState(false);
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState<AuditView | null>(null);
  const [tableView, setTableView] = useState<AuditView | null>(null);

  useEffect(() => {
    if (!menu) return;
    function close(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-download]")) return;
      setMenu(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  useEffect(() => {
    const controller = new AbortController();
    loadMeta(controller.signal)
      .then(setMeta)
      .catch((error: unknown) => {
        if (!isAbort(error)) setLoadError(error instanceof Error ? error.message : "Falha ao ler a auditoria.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAudit(toRequest(applied), controller.signal)
      .then((data) => {
        setView(data);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!isAbort(error)) setLoadError(error instanceof Error ? error.message : "Falha ao ler a auditoria.");
      });
    return () => controller.abort();
  }, [applied]);

  useEffect(() => {
    if (!tableOn && !search) {
      setTableView(null);
      return;
    }
    const controller = new AbortController();
    const request = tableOn ? toRequest(tableDraft, search) : toRequest(applied, search);
    loadAudit(request, controller.signal)
      .then(setTableView)
      .catch((error: unknown) => {
        if (!isAbort(error)) setLoadError(error instanceof Error ? error.message : "Falha ao ler a auditoria.");
      });
    return () => controller.abort();
  }, [applied, search, tableDraft, tableOn]);

  const report = tableOn || search ? (tableView ?? view) : view;
  const records = report?.records ?? [];
  const pages = Math.max(1, Math.ceil(records.length / PER_PAGE));
  const pageIndex = Math.min(page, pages);
  const visible = records.slice((pageIndex - 1) * PER_PAGE, pageIndex * PER_PAGE);
  const clients = meta?.clients ?? [];

  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.period === "custom" && (!draft.start || !draft.end || draft.start > draft.end)) {
      setFormError("Informe o início e o fim do período.");
      return;
    }
    setFormError("");
    setApplied(draft);
    setTableOn(false);
    setPage(1);
  }

  function clear() {
    setDraft(INITIAL);
    setApplied(INITIAL);
    setTableDraft(INITIAL);
    setTableOn(false);
    setTableOpen(false);
    setSearch("");
    setFormError("");
    setPage(1);
  }

  function applyTable(event: FormEvent) {
    event.preventDefault();
    if (!tableDraft.start || !tableDraft.end || tableDraft.start > tableDraft.end) {
      setFormError("No relatório, informe o início e o fim.");
      return;
    }
    setFormError("");
    setTableOn(true);
    setPage(1);
  }

  if (!view) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <MeterLogo />
          <p className="mt-6 text-sm text-[#8C8C99]">{loadError || "Carregando a auditoria."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-[#D5D5DD]/10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:px-5 lg:py-7">
        <MeterLogo />
        <nav className="mt-10" aria-label="Meter">
          <p className="border-l-2 border-[#6D4CFF] px-3 py-2 text-sm text-[#D5D5DD]" aria-current="page">
            Auditoria
          </p>
        </nav>
        <div className="mt-auto border-t border-[#D5D5DD]/10 pt-5 text-xs text-[#8C8C99]">
          <p>Uso interno. Números de exemplo.</p>
          <a href="http://127.0.0.1:4179/" className="mt-3 inline-block text-[#D5D5DD] underline-offset-4 hover:underline">
            Mapa
          </a>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#D5D5DD]/10 bg-[#07070A]/90 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <MeterLogo compact />
            </div>
            <SearchField
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              className="hidden sm:block"
            />
            <p className="shrink-0 border border-[#D5D5DD]/15 px-3 py-1 text-[10px] tracking-[0.18em] text-[#8C8C99] uppercase">
              Exemplo
            </p>
          </div>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="mt-3 sm:hidden"
          />
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <p className="text-[11px] tracking-[0.2em] text-[#8C8C99] uppercase">Custo de modelo</p>
          <h1 className="font-display mt-3 text-[1.65rem] leading-none tracking-[0.14em] uppercase sm:text-4xl">
            Auditoria
          </h1>
          <p className="mt-4 max-w-[40rem] text-base leading-relaxed font-light text-[#8C8C99]">
            Consumo de modelo por cliente. Números de exemplo
            {meta ? `, posição de ${formatDate(meta.asOf)}.` : "."}
          </p>

          <form
            onSubmit={apply}
            className="mt-8 flex flex-wrap items-end gap-3 border border-[#D5D5DD]/10 bg-[#15151B] p-4"
          >
            <Field label="Período">
              <Select
                value={draft.period}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, period: value as Period }));
                  setFormError("");
                }}
              >
                {PERIODS.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </Select>
            </Field>
            {draft.period === "custom" ? (
              <>
                <Field label="Início">
                  <DateInput
                    value={draft.start}
                    min={meta?.dataStart}
                    max={meta?.asOf}
                    onChange={(start) => setDraft((current) => ({ ...current, start }))}
                  />
                </Field>
                <Field label="Fim">
                  <DateInput
                    value={draft.end}
                    min={meta?.dataStart}
                    max={meta?.asOf}
                    onChange={(end) => setDraft((current) => ({ ...current, end }))}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Cliente">
              <Select value={draft.clientId} onChange={(clientId) => setDraft((current) => ({ ...current, clientId }))}>
                <option value="">Todas as contas</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-2">
              <button type="submit" className="bg-[#6D4CFF] px-5 py-2.5 text-sm text-[#F4F1EA]">
                Aplicar
              </button>
              <button
                type="button"
                onClick={clear}
                className="border border-[#D5D5DD]/15 px-5 py-2.5 text-sm text-[#D5D5DD]"
              >
                Limpar
              </button>
            </div>
            {formError ? <p className="w-full text-sm text-[#D5D5DD]">{formError}</p> : null}
            {loadError ? <p className="w-full text-sm text-[#D5D5DD]">{loadError}</p> : null}
          </form>

          <p className="mt-4 text-sm text-[#8C8C99]">
            {formatDate(view.range.start)} — {formatDate(view.range.end)}
          </p>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores">
            <Kpi label="Total gasto" value={formatUsd(view.kpis.totalSpent)}>
              <Change value={view.kpis.totalChangePct} />
            </Kpi>
            <Kpi label="Gasto diário" value={formatUsd(view.kpis.dailyAvg)}>
              <Change value={view.kpis.dailyChangePct} />
            </Kpi>
            <Kpi label="Tokens" value={formatCompact(view.kpis.totalTokens)}>
              <div className="mt-3">
                <div className="h-1 bg-[#07070A]">
                  <div className="h-full bg-[#D5D5DD]" style={{ width: `${view.kpis.inputSharePct}%` }} />
                </div>
                <p className="mt-2 text-xs text-[#8C8C99]">{view.kpis.inputSharePct}% entrada</p>
              </div>
            </Kpi>
            <Kpi label="Pedidos" value={formatCompact(view.kpis.totalRequests)}>
              <p className="mt-3 text-xs text-[#8C8C99]">
                {view.kpis.totalRequests > 100_000 ? "Volume alto" : "Volume comum"}
              </p>
            </Kpi>
            <Kpi label="Maior conta" value={view.kpis.topClient.name}>
              <p className="mt-3 text-xs text-[#8C8C99]">
                {view.kpis.topClient.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do gasto
              </p>
            </Kpi>
          </section>

          <div className="mt-4 grid gap-3 lg:grid-cols-12">
            <section className="border border-[#D5D5DD]/10 bg-[#15151B] p-5 lg:col-span-8 lg:p-6">
              <h2 className="text-base">Gastos diários</h2>
              <p className="mt-1 text-sm text-[#8C8C99]">Custo no período, por conta.</p>
              <div className="mt-5">
                <SpendChart labels={view.daily.labels} series={view.daily.series} />
              </div>
            </section>
            <section className="border border-[#D5D5DD]/10 bg-[#15151B] p-5 lg:col-span-4 lg:p-6">
              <h2 className="text-base">Distribuição</h2>
              <p className="mt-1 text-sm text-[#8C8C99]">Parte de cada conta no gasto.</p>
              <div className="mt-5">
                <Distribution slices={view.distribution} />
              </div>
            </section>
            <section className="border border-[#D5D5DD]/10 bg-[#15151B] p-5 lg:col-span-7 lg:p-6">
              <h2 className="text-base">Custos por cliente</h2>
              <div className="mt-6">
                <CostBars rows={view.costs} />
              </div>
            </section>
            <section className="border border-[#D5D5DD]/10 bg-[#15151B] p-5 lg:col-span-5 lg:p-6">
              <h2 className="text-base">Evolução</h2>
              <p className="mt-1 text-sm text-[#8C8C99]">Tokens ao longo do período.</p>
              <div className="mt-6">
                <TokenBars story={view.tokens} />
              </div>
            </section>
          </div>

          <section className="mt-4 border border-[#D5D5DD]/10 bg-[#15151B]">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-5 lg:px-6">
              <div>
                <h2 className="text-base">Relatório</h2>
                <p className="mt-1 text-sm text-[#8C8C99]">
                  {records.length.toLocaleString("pt-BR")} {records.length === 1 ? "registro" : "registros"}
                  {tableOn ? " · recorte do relatório" : ""}
                  {report ? ` · ${formatDate(report.range.start)} — ${formatDate(report.range.end)}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <div className="relative" data-download="">
                  <button
                    type="button"
                    className="grid size-9 place-items-center text-[#8C8C99] hover:text-[#D5D5DD] disabled:opacity-40"
                    aria-expanded={menu}
                    aria-label="Baixar CSV"
                    disabled={!records.length}
                    onClick={() => setMenu((open) => !open)}
                  >
                    <Download className="size-4" />
                  </button>
                  {menu && records.length ? (
                    <button
                      type="button"
                      className="absolute right-0 z-10 mt-1 border border-[#D5D5DD]/15 bg-[#07070A] px-4 py-2 text-left text-sm whitespace-nowrap"
                      onClick={() => {
                        downloadCsv("vortex-meter-exemplo.csv", toCsv(records));
                        setMenu(false);
                      }}
                    >
                      CSV do recorte
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="grid size-9 place-items-center text-[#8C8C99] hover:text-[#D5D5DD]"
                  aria-expanded={tableOpen}
                  aria-label="Filtrar relatório"
                  onClick={() => setTableOpen((open) => !open)}
                >
                  <ChevronDown className={cn("size-4 transition-transform", tableOpen && "rotate-180")} />
                </button>
              </div>
            </div>

            {tableOpen ? (
              <form
                onSubmit={applyTable}
                className="flex flex-wrap items-end gap-3 border-y border-[#D5D5DD]/10 px-5 py-4 lg:px-6"
              >
                <Field label="De">
                  <DateInput
                    value={tableDraft.start}
                    min={meta?.dataStart}
                    max={meta?.asOf}
                    onChange={(start) => setTableDraft((current) => ({ ...current, start, period: "custom" }))}
                  />
                </Field>
                <Field label="Até">
                  <DateInput
                    value={tableDraft.end}
                    min={meta?.dataStart}
                    max={meta?.asOf}
                    onChange={(end) => setTableDraft((current) => ({ ...current, end, period: "custom" }))}
                  />
                </Field>
                <Field label="Cliente">
                  <Select
                    value={tableDraft.clientId}
                    onChange={(clientId) => setTableDraft((current) => ({ ...current, clientId }))}
                  >
                    <option value="">Todas as contas</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <button type="submit" className="bg-[#6D4CFF] px-5 py-2.5 text-sm text-[#F4F1EA]">
                  Aplicar
                </button>
                <button
                  type="button"
                  className="border border-[#D5D5DD]/15 px-5 py-2.5 text-sm"
                  onClick={() => {
                    setTableOn(false);
                    setTableDraft(INITIAL);
                    setPage(1);
                    setFormError("");
                  }}
                >
                  Limpar
                </button>
              </form>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <caption className="sr-only">Relatório de consumo por cliente e dia</caption>
                <thead>
                  <tr className="border-y border-[#D5D5DD]/10 text-[10px] tracking-[0.16em] text-[#8C8C99] uppercase">
                    <th scope="col" className="px-5 py-3 font-medium lg:px-6">
                      Cliente
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Data
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Gasto
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Tokens
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Pedidos
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-medium lg:px-6">
                      Parte
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length ? (
                    visible.map((row) => (
                      <tr key={`${row.client}-${row.date}`} className="border-b border-[#D5D5DD]/10">
                        <td className="px-5 py-3 lg:px-6">{row.client}</td>
                        <td className="px-3 py-3 text-[#8C8C99]">{formatDate(row.date)}</td>
                        <td className="px-3 py-3 tabular-nums">{formatUsd(row.cost)}</td>
                        <td className="px-3 py-3 tabular-nums">{formatCompact(row.tokens)}</td>
                        <td className="px-3 py-3 tabular-nums">{row.requests.toLocaleString("pt-BR")}</td>
                        <td className="px-5 py-3 text-right text-[#8C8C99] tabular-nums lg:px-6">
                          {row.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-[#8C8C99]">
                        Nenhum registro neste recorte.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-4 text-xs text-[#8C8C99] lg:px-6">
              <p>
                Página {pageIndex} de {pages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pageIndex <= 1}
                  onClick={() => setPage(pageIndex - 1)}
                  className="border border-[#D5D5DD]/15 px-3 py-1.5 text-[#D5D5DD] disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pageIndex >= pages}
                  onClick={() => setPage(pageIndex + 1)}
                  className="border border-[#D5D5DD]/15 px-3 py-1.5 text-[#D5D5DD] disabled:opacity-40"
                >
                  Próximo
                </button>
              </div>
            </div>
          </section>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 pb-6 text-xs text-[#8C8C99]">
            <p>Vortex Meter · exemplo · {formatDate(meta?.asOf ?? view.range.end)}</p>
            <a
              href="http://127.0.0.1:4179/"
              className="text-[#D5D5DD] underline-offset-4 hover:underline lg:hidden"
            >
              Mapa
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("relative min-w-0 flex-1 lg:max-w-xs", className)}>
      <span className="sr-only">Buscar cliente no relatório</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8C8C99]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar cliente no relatório"
        className="w-full border border-[#D5D5DD]/15 bg-[#15151B] py-2 pr-3 pl-9 text-sm outline-none placeholder:text-[#8C8C99] focus:border-[#6D4CFF]"
      />
    </label>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <article className="border border-[#D5D5DD]/10 bg-[#15151B] px-4 py-4">
      <p className="text-[10px] tracking-[0.16em] text-[#8C8C99] uppercase">{label}</p>
      <p className="mt-2 truncate text-2xl tabular-nums" title={value}>
        {value}
      </p>
      {children}
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[10px] tracking-[0.16em] text-[#8C8C99] uppercase">
      {label}
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none border border-[#D5D5DD]/15 bg-[#07070A] py-2.5 pr-9 pl-3 text-sm tracking-normal text-[#D5D5DD] normal-case outline-none focus:border-[#6D4CFF]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-[#8C8C99]" />
    </span>
  );
}

function DateInput({
  value,
  min,
  max,
  onChange,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      className="border border-[#D5D5DD]/15 bg-[#07070A] px-3 py-2.5 text-sm tracking-normal text-[#D5D5DD] normal-case outline-none focus:border-[#6D4CFF]"
    />
  );
}

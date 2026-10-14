import { useState, type PointerEvent } from "react";

import { formatCompact, formatDate, formatDay, formatUsd } from "../format";
import type { CostBar, DailyPoint, ShareSlice, TokenStory } from "../types";

export const SERIES = ["#6D4CFF", "#F4F1EA", "#9A9AA6", "#5C5C68", "#C8C4B8", "#7A7A88"];

const VB_W = 720;
const VB_H = 248;
const PAD = { l: 46, r: 8, t: 12, b: 28 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  let nice = 10;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  return nice * power;
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index === 0 ? index : index - 1];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const control1x = current.x + (next.x - previous.x) / 6;
    const control1y = current.y + (next.y - previous.y) / 6;
    const control2x = next.x - (after.x - current.x) / 6;
    const control2y = next.y - (after.y - current.y) / 6;
    path += ` C ${control1x} ${control1y}, ${control2x} ${control2y}, ${next.x} ${next.y}`;
  }
  return path;
}

function axisMoney(value: number): string {
  if (value >= 1000) return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function SpendChart({ labels, series }: { labels: string[]; series: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!series.length || !labels.length) {
    return <p className="py-16 text-sm text-[#8C8C99]">Sem dados neste recorte.</p>;
  }

  const plotW = VB_W - PAD.l - PAD.r;
  const plotH = VB_H - PAD.t - PAD.b;
  const max = Math.max(...series.flatMap((item) => item.values));
  const yMax = niceMax(max * 1.05);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((step) => yMax * step);
  const xOf = (index: number) =>
    PAD.l + (labels.length === 1 ? plotW / 2 : (index / (labels.length - 1)) * plotW);
  const yOf = (value: number) => PAD.t + plotH - (value / yMax) * plotH;
  const tickEvery = Math.max(1, Math.ceil(labels.length / 6));

  function move(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * VB_W;
    const ratio = (x - PAD.l) / plotW;
    const index = Math.round(ratio * Math.max(labels.length - 1, 0));
    setHover(index >= 0 && index < labels.length ? index : null);
  }

  const hoverX = hover == null ? 0 : (xOf(hover) / VB_W) * 100;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-64 w-full touch-pan-y"
        role="img"
        aria-label="Gastos diários por cliente"
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.l}
              x2={VB_W - PAD.r}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="#D5D5DD"
              strokeOpacity={tick === 0 ? 0.2 : 0.08}
            />
            <text x={PAD.l - 8} y={yOf(tick) + 4} textAnchor="end" fill="#8C8C99" fontSize="11">
              {axisMoney(tick)}
            </text>
          </g>
        ))}
        {series.map((item, seriesIndex) => {
          const points = item.values.map((value, index) => ({ x: xOf(index), y: yOf(value) }));
          const color = SERIES[seriesIndex % SERIES.length];
          const line = smoothPath(points);
          const baseline = yOf(0);
          const area =
            points.length > 1
              ? `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
              : "";
          return (
            <g key={item.clientId}>
              {series.length === 1 && area ? <path d={area} fill={color} opacity="0.16" /> : null}
              <path d={line} fill="none" stroke={color} strokeWidth={seriesIndex === 0 ? 2.4 : 1.5} />
              {points.length === 1 ? <circle cx={points[0].x} cy={points[0].y} r="4" fill={color} /> : null}
            </g>
          );
        })}
        {labels.map((label, index) =>
          index % tickEvery === 0 ? (
            <text key={label} x={xOf(index)} y={VB_H - 8} textAnchor="middle" fill="#8C8C99" fontSize="11">
              {formatDay(label)}
            </text>
          ) : null,
        )}
        {hover != null ? (
          <line
            x1={xOf(hover)}
            x2={xOf(hover)}
            y1={PAD.t}
            y2={PAD.t + plotH}
            stroke="#D5D5DD"
            strokeOpacity="0.35"
          />
        ) : null}
      </svg>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {series.map((item, index) => (
          <li key={item.clientId} className="flex items-center gap-2 text-xs text-[#D5D5DD]">
            <span className="size-2" style={{ background: SERIES[index % SERIES.length] }} />
            {item.name}
          </li>
        ))}
      </ul>
      {hover != null ? (
        <div
          className="pointer-events-none absolute top-0 z-10 w-44 border border-[#D5D5DD]/15 bg-[#07070A] px-3 py-2 text-xs"
          style={{
            left: `${hoverX}%`,
            transform: hoverX > 68 ? "translateX(-100%)" : "translateX(-10%)",
          }}
        >
          <p className="text-[#8C8C99]">{formatDate(labels[hover])}</p>
          <ul className="mt-1 space-y-0.5">
            {series.map((item, index) => (
              <li key={item.clientId} className="flex justify-between gap-3">
                <span style={{ color: SERIES[index % SERIES.length] }}>{item.name}</span>
                <span className="tabular-nums text-[#D5D5DD]">{formatUsd(item.values[hover] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function Distribution({ slices }: { slices: ShareSlice[] }) {
  if (!slices.length) return <p className="py-16 text-sm text-[#8C8C99]">Sem dados neste recorte.</p>;
  const radius = 15.5;
  const circumference = 2 * Math.PI * radius;
  const arcs = slices.map((slice, index) => {
    const start = slices.slice(0, index).reduce((total, item) => total + (item.pct / 100) * circumference, 0);
    const length = Math.max(0, (slice.pct / 100) * circumference - 1.1);
    return { slice, index, start, length };
  });
  return (
    <div>
      <div className="mx-auto grid size-44 place-items-center">
        <svg viewBox="0 0 42 42" className="size-44" role="img" aria-label="Distribuição do gasto por cliente">
          <g transform="rotate(-90 21 21)">
            {arcs.map(({ slice, index, start, length }) => {
              const dash = `${length} ${circumference - length}`;
              const offset = -start;
              return (
                <circle
                  key={slice.clientId}
                  cx="21"
                  cy="21"
                  r={radius}
                  fill="none"
                  stroke={SERIES[index % SERIES.length]}
                  strokeWidth="5"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                />
              );
            })}
          </g>
          <text x="21" y="20" textAnchor="middle" fill="#D5D5DD" fontSize="5.2">
            {slices[0].pct}%
          </text>
          <text x="21" y="25.2" textAnchor="middle" fill="#8C8C99" fontSize="2.4">
            maior conta
          </text>
        </svg>
      </div>
      <ul className="mt-6 space-y-2">
        {slices.map((slice, index) => (
          <li key={slice.clientId} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0" style={{ background: SERIES[index % SERIES.length] }} />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="tabular-nums text-[#8C8C99]">{slice.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CostBars({ rows }: { rows: CostBar[] }) {
  if (!rows.length) return <p className="text-sm text-[#8C8C99]">Sem dados neste recorte.</p>;
  return (
    <ul className="space-y-5">
      {rows.map((row, index) => (
        <li key={row.clientId}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.name}</span>
            <span className="shrink-0 tabular-nums">{formatUsd(row.cost)}</span>
          </div>
          <div className="h-1.5 bg-[#07070A]">
            <div
              className={index === 0 ? "h-full bg-[#6D4CFF]" : "h-full bg-[#8C8C99]"}
              style={{ width: `${row.pctOfMax}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TokenBars({ story }: { story: TokenStory }) {
  if (!story.buckets.length) return <p className="text-sm text-[#8C8C99]">Sem dados neste recorte.</p>;
  const max = Math.max(...story.buckets.map((bucket) => bucket.tokens));
  const peak = story.buckets.reduce((best, bucket, index) =>
    bucket.tokens > story.buckets[best].tokens ? index : best,
  0);
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {story.buckets.map((bucket, index) => (
          <div
            key={bucket.label}
            title={`${formatDate(bucket.label)} · ${formatCompact(bucket.tokens)} tokens`}
            className={index === peak ? "min-w-0 flex-1 bg-[#6D4CFF]" : "min-w-0 flex-1 bg-[#D5D5DD]/75"}
            style={{ height: `${Math.max(8, (bucket.tokens / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.16em] text-[#8C8C99] uppercase">Pico</p>
          <p className="mt-1 text-lg tabular-nums">{formatCompact(story.peakPerHour)} / hora</p>
        </div>
        <p className="border border-[#D5D5DD]/15 px-3 py-1 text-[10px] tracking-[0.16em] uppercase">
          {story.trend}
        </p>
      </div>
    </div>
  );
}

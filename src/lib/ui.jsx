import { memo } from "react";
import {
  ROAS_TARGET,
  TABLE_PREVIEW_LIMIT,
  roasTone,
  shiftIsoDate,
} from "./metrics.js";

// Badge — rendered 60+ times per table, memo prevents pointless re-renders.

export const Badge = memo(function Badge({ label, color = "#e66a2c" }) {
  return (
    <span
      className="badge"
      style={{
        "--badge-color": color,
        "--badge-bg": `${color}14`,
        "--badge-border": `${color}26`,
      }}
    >
      {label}
    </span>
  );
});

// HealthBar — rendered per table row, props rarely change within a filter.

export const HealthBar = memo(function HealthBar({ roas, max = 10 }) {
  const progress = Math.min((roas / max) * 100, 100);
  const tone = roasTone(roas);

  return (
    <div className="health-meter">
      <div
        className="health-meter__fill"
        style={{ width: `${progress}%`, background: tone.color }}
      />
    </div>
  );
});

// MetricCard — 8 always visible KPI cards.

export const MetricCard = memo(function MetricCard({
  label,
  value,
  sub,
  accent = "#e66a2c",
  toneLabel,
  featured = false,
}) {
  return (
    <article
      className={`metric-card${featured ? " metric-card--featured" : ""}`}
      style={{
        "--metric-accent": accent,
        "--metric-tint": `${accent}12`,
        "--metric-border": `${accent}22`,
      }}
    >
      <p className="metric-card__label">{label}</p>
      <div className="metric-card__value-row">
        <h3 className="metric-card__value">{value}</h3>
        {toneLabel ? <Badge label={toneLabel} color={accent} /> : null}
      </div>
      {sub ? <p className="metric-card__sub">{sub}</p> : null}
    </article>
  );
});

// TooltipCard — chart tooltip used in every Recharts instance.

export const TooltipCard = memo(function TooltipCard({ active, payload, label, valFmt }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      {label && <p className="chart-tooltip__label">{label}</p>}
      {payload.map((entry, index) => (
        <div key={`${entry.name}-${index}`} className="chart-tooltip__row">
          <span className="chart-tooltip__name">{entry.name}</span>
          <span className="chart-tooltip__value" style={{ color: entry.color || "#231d17" }}>
            {valFmt ? valFmt(entry.name, entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
});

// SectionHeader

export const SectionHeader = memo(function SectionHeader({ title, sub, action }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-header__title">{title}</h2>
        {sub ? <p className="section-header__sub">{sub}</p> : null}
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
});

// Table primitives

export const Th = memo(function Th({ children, right = false }) {
  return <th className={`data-table__th${right ? " is-right" : ""}`}>{children}</th>;
});

export const Td = memo(function Td({ children, right = false, accent = false, color }) {
  return (
    <td
      className={`data-table__td${right ? " is-right" : ""}${accent ? " is-accent" : ""}`}
      style={color ? { color } : undefined}
    >
      {children}
    </td>
  );
});

// Panel wrapper

export const Panel = memo(function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
});

// TableFooter — show/hide toggle for long tables.

export const TableFooter = memo(function TableFooter({ total, shown, expanded, label, onToggle }) {
  if (total <= TABLE_PREVIEW_LIMIT) return null;

  return (
    <div className="table-footer">
      <span>
        Showing {shown} of {total} {label}
      </span>
      <button type="button" className="ghost-button table-footer__button" onClick={onToggle}>
        {expanded ? "Show fewer" : "Show all"}
      </button>
    </div>
  );
});

// DateFilterBar

export const DateFilterBar = memo(function DateFilterBar({ dates, start, end, onRange, onPreset }) {
  const sorted = [...dates].sort();
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const presets = [
    { label: "All", onClick: () => onPreset(min, max) },
    { label: "Last 7D", onClick: () => onPreset(shiftIsoDate(max, -6), max) },
    { label: "Last 14D", onClick: () => onPreset(shiftIsoDate(max, -13), max) },
    {
      label: "This Month",
      onClick: () => {
        const [year, month] = max.split("-").map(Number);
        onPreset(`${year}-${String(month).padStart(2, "0")}-01`, max);
      },
    },
  ];

  return (
    <div className="date-filter">
      <div className="date-filter__presets">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="ghost-button"
            onClick={preset.onClick}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="date-filter__inputs">
        <input
          className="date-input"
          type="date"
          value={start}
          min={min}
          max={max}
          onChange={(event) => onRange(event.target.value, end)}
        />
        <span className="date-filter__arrow">to</span>
        <input
          className="date-input"
          type="date"
          value={end}
          min={min}
          max={max}
          onChange={(event) => onRange(start, event.target.value)}
        />
      </div>
    </div>
  );
});

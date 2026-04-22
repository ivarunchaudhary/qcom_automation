import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_GRID,
  TABLE_PREVIEW_LIMIT,
  axisTick,
  fmt,
  orderByMetric,
  roasTone,
} from "../lib/metrics.js";
import {
  HealthBar,
  Panel,
  SectionHeader,
  TableFooter,
  Td,
  Th,
  TooltipCard,
} from "../lib/ui.jsx";

const GEO_EFFICIENCY_METRICS = [
  { key: "roas", label: "ROAS", format: (value) => `${Number(value).toFixed(2)}x` },
  { key: "ctr", label: "CTR", format: fmt.pct },
  { key: "atcr", label: "ATCR", format: fmt.pct },
  { key: "cvr", label: "CVR", format: fmt.pct },
];

const CITY_SUMMARY_COLUMNS = [
  { key: "key", label: "City", type: "string", right: false, format: (row) => row.key },
  { key: "spend", label: "Spend", type: "number", right: true, format: (row) => fmt.inr(row.spend) },
  { key: "gmv", label: "GMV", type: "number", right: true, format: (row) => fmt.inr(row.gmv) },
  { key: "roas", label: "ROAS", type: "number", right: true, format: (row) => fmt.x(row.roas) },
  { key: "imp", label: "Impr.", type: "number", right: true, format: (row) => fmt.num(row.imp) },
  { key: "clks", label: "Clicks", type: "number", right: true, format: (row) => fmt.num(row.clks) },
  { key: "a2c", label: "ATC", type: "number", right: true, format: (row) => fmt.num(row.a2c) },
  { key: "conv", label: "Conv.", type: "number", right: true, format: (row) => fmt.num(row.conv) },
  { key: "cpo", label: "CPO", type: "number", right: true, format: (row) => fmt.inr(row.cpo) },
  { key: "aov", label: "AOV", type: "number", right: true, format: (row) => fmt.inr(row.aov) },
];

const CITY_SUMMARY_EXPORT_NAME = "geo-summary";
const COPY_FEEDBACK_MS = 1200;

function copyTextWithFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function GeoTab({ cities: rawCities }) {
  const [efficiencyMetricKey, setEfficiencyMetricKey] = useState("roas");
  const [summarySortKey, setSummarySortKey] = useState("spend");
  const [summarySortDirection, setSummarySortDirection] = useState("desc");
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);
  const selectedEfficiencyMetric =
    GEO_EFFICIENCY_METRICS.find((metric) => metric.key === efficiencyMetricKey) || GEO_EFFICIENCY_METRICS[0];

  const cities = useMemo(() => orderByMetric(rawCities, "spend"), [rawCities]);
  const citySpendLeaders = useMemo(() => cities.slice(0, 12), [cities]);
  const cityEfficiencyLeaders = useMemo(
    () =>
      [...rawCities]
        .sort((left, right) => (right[selectedEfficiencyMetric.key] || 0) - (left[selectedEfficiencyMetric.key] || 0))
        .slice(0, 12),
    [rawCities, selectedEfficiencyMetric.key],
  );
  const sortedSummaryRows = useMemo(() => {
    const rows = [...rawCities];
    const sortColumn = CITY_SUMMARY_COLUMNS.find((column) => column.key === summarySortKey) || CITY_SUMMARY_COLUMNS[0];
    const directionFactor = summarySortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (sortColumn.type === "string") {
        return directionFactor * left[sortColumn.key].localeCompare(right[sortColumn.key]);
      }
      return directionFactor * ((left[sortColumn.key] || 0) - (right[sortColumn.key] || 0));
    });

    return rows;
  }, [rawCities, summarySortDirection, summarySortKey]);
  const visibleRows = expanded ? sortedSummaryRows : sortedSummaryRows.slice(0, TABLE_PREVIEW_LIMIT);

  const handleSummarySort = (column) => {
    startTransition(() => {
      if (summarySortKey === column.key) {
        setSummarySortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return;
      }

      setSummarySortKey(column.key);
      setSummarySortDirection(column.type === "number" ? "desc" : "asc");
    });
  };

  const handleCopySummary = async () => {
    const headers = CITY_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...sortedSummaryRows.map((row) =>
        CITY_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
      ),
    ].join("\n");
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        copied = true;
      }
    } catch {
      // fall back to legacy copy path below
    }

    if (!copied) {
      copied = copyTextWithFallback(payload);
    }

    if (copied) {
      setIsCopyConfirmed(true);
      window.clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = window.setTimeout(() => {
        setIsCopyConfirmed(false);
      }, COPY_FEEDBACK_MS);
    }
  };

  const handleExportSummary = async () => {
    const headers = CITY_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = sortedSummaryRows.map((row) =>
      CITY_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Geo Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${CITY_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
  };

  return (
    <div className="tab-content">
      <SectionHeader title="Geo performance" sub={`${cities.length} cities active in the selected period.`} />
      <div className="panel-grid panel-grid--two">
        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Market coverage</p>
              <h3 className="panel-title">Top cities by spend</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={citySpendLeaders} layout="vertical">
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={axisTick} stroke={CHART_GRID} tickFormatter={fmt.inr} />
              <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={92} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.inrFull(value)} />} />
              <Bar dataKey="spend" name="Spend" fill="#b47a33" radius={[0, 12, 12, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Efficiency</p>
              <h3 className="panel-title">Top cities by {selectedEfficiencyMetric.label}</h3>
            </div>
            <div className="toolbar-pills">
              {GEO_EFFICIENCY_METRICS.map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  className={`pill-button compact${efficiencyMetricKey === metric.key ? " is-active" : ""}`}
                  onClick={() => {
                    startTransition(() => {
                      setEfficiencyMetricKey(metric.key);
                    });
                  }}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={cityEfficiencyLeaders} layout="vertical">
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={axisTick} stroke={CHART_GRID} tickFormatter={selectedEfficiencyMetric.format} />
              <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={92} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => selectedEfficiencyMetric.format(value)} />} />
              <Bar dataKey={selectedEfficiencyMetric.key} name={selectedEfficiencyMetric.label} radius={[0, 12, 12, 0]} isAnimationActive={false}>
                {cityEfficiencyLeaders.map((city) => (
                  <Cell key={city.key} fill={roasTone(city.roas).color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <SectionHeader
        title="City table"
        sub="Complete city-level efficiency register."
        action={
          <div className="table-actions">
            <button
              type="button"
              className={`ghost-button table-action-copy${isCopyConfirmed ? " is-copied" : ""}`}
              onClick={handleCopySummary}
              disabled={!sortedSummaryRows.length}
            >
              Copy table
              <span className="table-action-copy__tick" aria-hidden="true">✓</span>
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportSummary}
              disabled={!sortedSummaryRows.length}
            >
              Export XLSX
            </button>
          </div>
        }
      />
      <Panel className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              {CITY_SUMMARY_COLUMNS.map((column) => (
                <Th key={column.key} right={column.right}>
                  <button
                    type="button"
                    className={`table-sort-button${summarySortKey === column.key ? " is-active" : ""}`}
                    onClick={() => handleSummarySort(column)}
                  >
                    {column.label}
                    {summarySortKey === column.key
                      ? summarySortDirection === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                </Th>
              ))}
              <Th>Health</Th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((city) => (
              <tr key={city.key}>
                <Td>{city.key}</Td>
                <Td right>{fmt.inr(city.spend)}</Td>
                <Td right>{fmt.inr(city.gmv)}</Td>
                <Td right accent color={roasTone(city.roas).color}>
                  {fmt.x(city.roas)}
                </Td>
                <Td right>{fmt.num(city.imp)}</Td>
                <Td right>{fmt.num(city.clks)}</Td>
                <Td right>{fmt.num(city.a2c)}</Td>
                <Td right>{fmt.num(city.conv)}</Td>
                <Td right>{fmt.inr(city.cpo)}</Td>
                <Td right>{fmt.inr(city.aov)}</Td>
                <Td>
                  <HealthBar roas={city.roas} max={10} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter
          total={sortedSummaryRows.length}
          shown={visibleRows.length}
          expanded={expanded}
          label="cities"
          onToggle={() => {
            startTransition(() => {
              setExpanded((current) => !current);
            });
          }}
        />
      </Panel>
    </div>
  );
}

export default memo(GeoTab);

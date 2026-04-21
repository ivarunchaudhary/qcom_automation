import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_GRID,
  DAILY_METRICS,
  axisTick,
  chartLegendStyle,
  fmt,
  formatDateDDMMYYYY,
  pct,
  roasTone,
} from "../lib/metrics.js";
import {
  Badge,
  Panel,
  SectionHeader,
  Td,
  Th,
  TooltipCard,
} from "../lib/ui.jsx";

const stripRupeeSymbol = (value) => value.replace("₹", "");
const formatAbsoluteCurrency = (value) => stripRupeeSymbol(fmt.inrFull(value));
const formatAbsoluteCurrency2 = (value) => stripRupeeSymbol(fmt.inr2(value));

const DAILY_SUMMARY_COLUMNS = [
  { key: "rawDate", label: "Date", type: "date", format: (row) => row.date },
  { key: "spend", label: "Spend", type: "number", format: (row) => formatAbsoluteCurrency(row.spend) },
  { key: "gmv", label: "GMV", type: "number", format: (row) => formatAbsoluteCurrency(row.gmv) },
  { key: "roas", label: "ROAS", type: "number", format: (row) => fmt.dec2(row.roas) },
  { key: "imp", label: "Impressions", type: "number", format: (row) => fmt.num(row.imp) },
  { key: "clks", label: "Clicks", type: "number", format: (row) => fmt.num(row.clks) },
  { key: "ctr", label: "CTR", type: "number", format: (row) => fmt.pct(row.ctr) },
  { key: "a2c", label: "ATC", type: "number", format: (row) => fmt.num(row.a2c) },
  { key: "atcr", label: "ATCR", type: "number", format: (row) => fmt.pct(row.atcr) },
  { key: "conv", label: "Conv.", type: "number", format: (row) => fmt.num(row.conv) },
  { key: "cvr", label: "CVR", type: "number", format: (row) => fmt.pct(row.cvr) },
  { key: "cpo", label: "CPO", type: "number", format: (row) => formatAbsoluteCurrency(row.cpo) },
  { key: "aov", label: "AOV", type: "number", format: (row) => formatAbsoluteCurrency(row.aov) },
  { key: "cpc", label: "CPC", type: "number", format: (row) => formatAbsoluteCurrency2(row.cpc) },
];

const DAILY_SUMMARY_EXPORT_NAME = "daily-summary";
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

function OverviewTab({ daily }) {
  const [dailyMetric, setDailyMetric] = useState("roas");
  const [dailySummarySortKey, setDailySummarySortKey] = useState("rawDate");
  const [dailySummarySortDirection, setDailySummarySortDirection] = useState("asc");
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);

  const selectedMetric =
    DAILY_METRICS.find((metric) => metric.key === dailyMetric) || DAILY_METRICS[0];
  const dayTrend =
    daily.length >= 2
      ? pct(
          daily[daily.length - 1][dailyMetric] - daily[daily.length - 2][dailyMetric],
          Math.abs(daily[daily.length - 2][dailyMetric]),
        )
      : 0;
  const dailySummaryRows = useMemo(
    () =>
      daily.map((item) => ({
        rawDate: item.rawDate,
        date: formatDateDDMMYYYY(item.rawDate),
        spend: item.spend,
        gmv: item.gmv,
        roas: item.roas,
        imp: item.imp,
        clks: item.clks,
        ctr: item.ctr,
        a2c: item.a2c,
        atcr: item.atcr,
        conv: item.conv,
        cvr: item.cvr,
        cpo: item.cpo,
        aov: item.aov,
        cpc: item.cpc,
      })),
    [daily],
  );

  const sortedDailySummaryRows = useMemo(() => {
    const rows = [...dailySummaryRows];
    const sortColumn = DAILY_SUMMARY_COLUMNS.find((column) => column.key === dailySummarySortKey) || DAILY_SUMMARY_COLUMNS[0];
    const directionFactor = dailySummarySortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (sortColumn.type === "date" || sortColumn.type === "string") {
        return directionFactor * left[sortColumn.key].localeCompare(right[sortColumn.key]);
      }
      return directionFactor * ((left[sortColumn.key] || 0) - (right[sortColumn.key] || 0));
    });

    return rows;
  }, [dailySummaryRows, dailySummarySortDirection, dailySummarySortKey]);

  const handleDailySummarySort = (column) => {
    if (dailySummarySortKey === column.key) {
      setDailySummarySortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setDailySummarySortKey(column.key);
    setDailySummarySortDirection(column.type === "number" ? "desc" : "asc");
  };

  const handleCopyDailySummary = async () => {
    const headers = DAILY_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...sortedDailySummaryRows.map((row) =>
        DAILY_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
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

  const handleExportDailySummary = async () => {
    const headers = DAILY_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = sortedDailySummaryRows.map((row) =>
      DAILY_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Daily Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${DAILY_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
  };

  return (
    <div className="tab-content">
      <SectionHeader
        title="Daily performance"
        sub="Trend view across the selected date range."
        action={
          <div className="toolbar-pills">
            {DAILY_METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                className={`pill-button compact${dailyMetric === metric.key ? " is-active" : ""}`}
                onClick={() => {
                  startTransition(() => {
                    setDailyMetric(metric.key);
                  });
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="panel-grid panel-grid--two">
        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">{selectedMetric.label} trend</p>
              <h3 className="panel-title">Day-on-day movement</h3>
            </div>
            <Badge
              label={`${dayTrend >= 0 ? "+" : ""}${dayTrend.toFixed(1)}% latest day`}
              color={dayTrend >= 0 ? "#14976e" : "#c63d2f"}
            />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={axisTick} stroke={CHART_GRID} />
              <YAxis
                tick={axisTick}
                stroke={CHART_GRID}
                tickFormatter={(value) => selectedMetric.format(value)}
              />
              <Tooltip content={<TooltipCard valFmt={(_, value) => selectedMetric.format(value)} />} />
              <Line
                type="monotone"
                dataKey={dailyMetric}
                stroke="#e66a2c"
                strokeWidth={3}
                dot={{ fill: "#e66a2c", r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Spend and GMV</p>
              <h3 className="panel-title">Daily commercial output</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={daily}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={axisTick} stroke={CHART_GRID} />
              <YAxis tick={axisTick} stroke={CHART_GRID} tickFormatter={fmt.inr} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.inrFull(value)} />} />
              <Legend wrapperStyle={chartLegendStyle} />
              <Bar dataKey="spend" name="Spend" fill="#e66a2c" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="gmv" name="GMV" fill="#14976e" radius={[12, 12, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <SectionHeader
        title="Daily summary table"
        sub="All core metrics per reporting day."
        action={
          <div className="table-actions">
            <button
              type="button"
              className={`ghost-button table-action-copy${isCopyConfirmed ? " is-copied" : ""}`}
              onClick={handleCopyDailySummary}
              disabled={!sortedDailySummaryRows.length}
            >
              Copy table
              <span className="table-action-copy__tick" aria-hidden="true">✓</span>
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportDailySummary}
              disabled={!sortedDailySummaryRows.length}
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
              {DAILY_SUMMARY_COLUMNS.map((column) => (
                <Th key={column.key} right={column.key !== "rawDate"}>
                  <button
                    type="button"
                    className={`table-sort-button${dailySummarySortKey === column.key ? " is-active" : ""}`}
                    onClick={() => handleDailySummarySort(column)}
                  >
                    {column.label}
                    {dailySummarySortKey === column.key
                      ? dailySummarySortDirection === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDailySummaryRows.map((row) => (
              <tr key={row.rawDate}>
                <Td>{row.date}</Td>
                <Td right>{formatAbsoluteCurrency(row.spend)}</Td>
                <Td right>{formatAbsoluteCurrency(row.gmv)}</Td>
                <Td right accent color={roasTone(row.roas).color}>{fmt.dec2(row.roas)}</Td>
                <Td right>{fmt.num(row.imp)}</Td>
                <Td right>{fmt.num(row.clks)}</Td>
                <Td right>{fmt.pct(row.ctr)}</Td>
                <Td right>{fmt.num(row.a2c)}</Td>
                <Td right>{fmt.pct(row.atcr)}</Td>
                <Td right>{fmt.num(row.conv)}</Td>
                <Td right>{fmt.pct(row.cvr)}</Td>
                <Td right>{formatAbsoluteCurrency(row.cpo)}</Td>
                <Td right>{formatAbsoluteCurrency(row.aov)}</Td>
                <Td right>{formatAbsoluteCurrency2(row.cpc)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

    </div>
  );
}

export default memo(OverviewTab);

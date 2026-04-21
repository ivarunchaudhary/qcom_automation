import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ADTYPE_COLORS,
  CHART_GRID,
  CHART_TEXT,
  axisTick,
  chartLegendStyle,
  cleanAdTypeLabel,
  fmt,
  roasTone,
} from "../lib/metrics.js";
import {
  Badge,
  HealthBar,
  Panel,
  SectionHeader,
  Td,
  Th,
  TooltipCard,
} from "../lib/ui.jsx";

const ADTYPE_SUMMARY_COLUMNS = [
  { key: "name", label: "Ad type", type: "string", format: (row) => row.name },
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

const ADTYPE_SUMMARY_EXPORT_NAME = "adtype-summary";
const COPY_FEEDBACK_MS = 1200;
const stripRupeeSymbol = (value) => value.replace("₹", "");
const formatAbsoluteCurrency = (value) => stripRupeeSymbol(fmt.inrFull(value));
const formatAbsoluteCurrency2 = (value) => stripRupeeSymbol(fmt.inr2(value));

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

function AdTypesTab({ adtypes }) {
  const [summarySortKey, setSummarySortKey] = useState("spend");
  const [summarySortDirection, setSummarySortDirection] = useState("desc");
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);

  const adtypeChartData = useMemo(
    () => adtypes.map((item) => ({ ...item, name: cleanAdTypeLabel(item.key) })),
    [adtypes],
  );
  const sortedSummaryRows = useMemo(() => {
    const rows = [...adtypeChartData];
    const sortColumn = ADTYPE_SUMMARY_COLUMNS.find((column) => column.key === summarySortKey) || ADTYPE_SUMMARY_COLUMNS[0];
    const directionFactor = summarySortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (sortColumn.type === "string") {
        return directionFactor * left[sortColumn.key].localeCompare(right[sortColumn.key]);
      }
      return directionFactor * ((left[sortColumn.key] || 0) - (right[sortColumn.key] || 0));
    });

    return rows;
  }, [adtypeChartData, summarySortDirection, summarySortKey]);

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
    const headers = ADTYPE_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...sortedSummaryRows.map((row) =>
        ADTYPE_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
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
    const headers = ADTYPE_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = sortedSummaryRows.map((row) =>
      ADTYPE_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Ad Type Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${ADTYPE_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
  };

  return (
    <div className="tab-content">
      <SectionHeader title="Ad type performance" sub="Format-by-format efficiency and funnel quality." />
      <div className="brand-grid">
        {adtypes.map((adtype) => {
          const tone = roasTone(adtype.roas);
          return (
            <Panel key={adtype.key} className="brand-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Ad type</p>
                  <h3 className="panel-title">{cleanAdTypeLabel(adtype.key)}</h3>
                </div>
                <Badge label={fmt.x(adtype.roas)} color={tone.color} />
              </div>

              <div className="metric-list">
                {[
                  ["Spend", fmt.inr(adtype.spend)],
                  ["GMV", fmt.inr(adtype.gmv)],
                  ["ROAS", fmt.x(adtype.roas)],
                  ["Impressions", fmt.num(adtype.imp)],
                  ["Clicks", fmt.num(adtype.clks)],
                  ["CTR", fmt.pct(adtype.ctr)],
                  ["ATC", fmt.num(adtype.a2c)],
                  ["ATCR", fmt.pct(adtype.atcr)],
                  ["Conversions", fmt.num(adtype.conv)],
                  ["CVR", fmt.pct(adtype.cvr)],
                  ["CPO", fmt.inr(adtype.cpo)],
                  ["AOV", fmt.inr(adtype.aov)],
                  ["CPC", fmt.inr2(adtype.cpc)],
                ].map(([label, value]) => (
                  <div key={label} className="metric-list__row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <HealthBar roas={adtype.roas} max={8} />
            </Panel>
          );
        })}
      </div>

      <div className="panel-grid panel-grid--two">
        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Commercial output</p>
              <h3 className="panel-title">Spend vs GMV by format</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={adtypeChartData}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={axisTick} stroke={CHART_GRID} />
              <YAxis tick={axisTick} stroke={CHART_GRID} tickFormatter={fmt.inr} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.inrFull(value)} />} />
              <Legend wrapperStyle={chartLegendStyle} />
              <Bar dataKey="spend" name="Spend" fill="#e66a2c" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="gmv" name="GMV" fill="#14976e" radius={[12, 12, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Efficiency</p>
              <h3 className="panel-title">ROAS by format</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={adtypeChartData}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={axisTick} stroke={CHART_GRID} />
              <YAxis tick={axisTick} stroke={CHART_GRID} tickFormatter={(value) => `${value}x`} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => `${Number(value).toFixed(2)}x`} />} />
              <Bar dataKey="roas" name="ROAS" radius={[12, 12, 0, 0]} isAnimationActive={false}>
                {adtypeChartData.map((item) => (
                  <Cell key={item.key} fill={ADTYPE_COLORS[item.key] || "#9a8e83"} />
                ))}
                <LabelList dataKey="roas" position="top" formatter={(value) => `${value.toFixed(1)}x`} fill={CHART_TEXT} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <SectionHeader
        title="Ad type summary table"
        sub="All core metrics per ad type."
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
              {ADTYPE_SUMMARY_COLUMNS.map((column) => (
                <Th key={column.key} right={column.key !== "name"}>
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
            </tr>
          </thead>
          <tbody>
            {sortedSummaryRows.map((row) => (
              <tr key={row.key}>
                <Td>{row.name}</Td>
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

export default memo(AdTypesTab);

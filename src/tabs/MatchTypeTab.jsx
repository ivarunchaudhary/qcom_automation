import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_GRID,
  MATCH_TYPE_NOTES,
  MT_COLORS,
  MT_LABELS,
  axisTick,
  chartLegendStyle,
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

const MATCHTYPE_SUMMARY_COLUMNS = [
  { key: "name", label: "Match type", type: "string", format: (row) => row.name },
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

const MATCHTYPE_SUMMARY_EXPORT_NAME = "matchtype-summary";
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

function MatchTypeTab({ matchTypes }) {
  const [summarySortKey, setSummarySortKey] = useState("spend");
  const [summarySortDirection, setSummarySortDirection] = useState("desc");
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);

  const matchTypeChartData = useMemo(
    () => matchTypes.map((item) => ({ ...item, name: MT_LABELS[item.key] || item.key })),
    [matchTypes],
  );
  const sortedSummaryRows = useMemo(() => {
    const rows = [...matchTypeChartData];
    const sortColumn = MATCHTYPE_SUMMARY_COLUMNS.find((column) => column.key === summarySortKey) || MATCHTYPE_SUMMARY_COLUMNS[0];
    const directionFactor = summarySortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (sortColumn.type === "string") {
        return directionFactor * left[sortColumn.key].localeCompare(right[sortColumn.key]);
      }
      return directionFactor * ((left[sortColumn.key] || 0) - (right[sortColumn.key] || 0));
    });

    return rows;
  }, [matchTypeChartData, summarySortDirection, summarySortKey]);

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
    const headers = MATCHTYPE_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...sortedSummaryRows.map((row) =>
        MATCHTYPE_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
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
    const headers = MATCHTYPE_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = sortedSummaryRows.map((row) =>
      MATCHTYPE_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Match Type Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${MATCHTYPE_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
  };

  return (
    <div className="tab-content">
      <SectionHeader title="Match type performance" sub="Exact, broad, and invalid comparisons with execution notes." />
      <div className="brand-grid">
        {matchTypes.map((matchType) => {
          const tone = roasTone(matchType.roas);
          const color = MT_COLORS[matchType.key] || "#9a8e83";
          return (
            <Panel key={matchType.key} className="brand-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Match type</p>
                  <h3 className="panel-title" style={{ color }}>
                    {MT_LABELS[matchType.key] || matchType.key}
                  </h3>
                </div>
                <Badge label={fmt.x(matchType.roas)} color={tone.color} />
              </div>
              <div className="metric-list">
                {[
                  ["Spend", fmt.inr(matchType.spend)],
                  ["GMV", fmt.inr(matchType.gmv)],
                  ["ROAS", fmt.x(matchType.roas)],
                  ["Impressions", fmt.num(matchType.imp)],
                  ["Clicks", fmt.num(matchType.clks)],
                  ["CTR", fmt.pct(matchType.ctr)],
                  ["CPC", fmt.inr2(matchType.cpc)],
                  ["ATC", fmt.num(matchType.a2c)],
                  ["ATCR", fmt.pct(matchType.atcr)],
                  ["Conversions", fmt.num(matchType.conv)],
                  ["CVR", fmt.pct(matchType.cvr)],
                  ["CPO", fmt.inr(matchType.cpo)],
                  ["AOV", fmt.inr(matchType.aov)],
                ].map(([label, value]) => (
                  <div key={label} className="metric-list__row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <HealthBar roas={matchType.roas} max={10} />
            </Panel>
          );
        })}
      </div>

      <div className="panel-grid panel-grid--two">
        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Commercial output</p>
              <h3 className="panel-title">Spend vs GMV by match type</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={matchTypeChartData}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={axisTick} stroke={CHART_GRID} />
              <YAxis tick={axisTick} stroke={CHART_GRID} tickFormatter={fmt.inr} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.inrFull(value)} />} />
              <Legend wrapperStyle={chartLegendStyle} />
              <Bar dataKey="spend" name="Spend" fill="#b47a33" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="gmv" name="GMV" fill="#66758a" radius={[12, 12, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Funnel quality</p>
              <h3 className="panel-title">CTR, ATCR, and CVR</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={matchTypeChartData}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={axisTick} stroke={CHART_GRID} />
              <YAxis tick={axisTick} stroke={CHART_GRID} tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.pct(value)} />} />
              <Legend wrapperStyle={chartLegendStyle} />
              <Bar dataKey="ctr" name="CTR" fill="#b47a33" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="atcr" name="ATCR" fill="#2f3744" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="cvr" name="CVR" fill="#66758a" radius={[12, 12, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <SectionHeader
        title="Match type summary table"
        sub="All core metrics per match type."
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
              {MATCHTYPE_SUMMARY_COLUMNS.map((column) => (
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

      <SectionHeader title="Execution notes" sub="Quick guidance for how to use each match type." />
      <div className="panel-grid panel-grid--three">
        {MATCH_TYPE_NOTES.map((item) => {
          const current = matchTypes.find((matchType) => matchType.key === item.key);
          const color = MT_COLORS[item.key] || "#9a8e83";
          return (
            <Panel key={item.key}>
              <div className="panel-header">
                <div>
                  <p className="panel-label">Playbook</p>
                  <h3 className="panel-title" style={{ color }}>
                    {item.title}
                  </h3>
                </div>
              </div>
              <div className="note-list">
                {item.notes.map((note) => (
                  <div key={note} className="note-list__item">
                    <span className="note-list__bullet" style={{ background: color }} />
                    <p>{note}</p>
                  </div>
                ))}
              </div>
              {current ? (
                <div className="inline-metric inline-metric--summary">
                  <span>Your ROAS {fmt.x(current.roas)}</span>
                  <span>Spend {fmt.inr(current.spend)}</span>
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export default memo(MatchTypeTab);

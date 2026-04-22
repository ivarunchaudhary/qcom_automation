import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND_COLORS,
  CHART_GRID,
  CHART_TEXT,
  KEYWORD_SORT_OPTIONS,
  TABLE_PREVIEW_LIMIT,
  axisTick,
  fmt,
  orderByMetric,
  roasTone,
} from "../lib/metrics.js";
import {
  Badge,
  Panel,
  SectionHeader,
  TableFooter,
  Td,
  Th,
  TooltipCard,
} from "../lib/ui.jsx";

const TOP_KEYWORD_METRICS = [
  { key: "spend", label: "Spend", format: fmt.inrFull, tickFormat: fmt.inr },
  { key: "roas", label: "ROAS", format: (value) => `${Number(value).toFixed(2)}x`, tickFormat: (value) => `${Number(value).toFixed(1)}x` },
  { key: "conv", label: "Conversions", format: fmt.num, tickFormat: fmt.num },
  { key: "ctr", label: "CTR", format: fmt.pct, tickFormat: fmt.pct },
  { key: "atcr", label: "ATCR", format: fmt.pct, tickFormat: fmt.pct },
];

function sortKeywordRows(rows, metric, direction = "desc") {
  const directionFactor = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => directionFactor * ((left[metric] || 0) - (right[metric] || 0)));
}

const KEYWORD_SUMMARY_COLUMNS = [
  { key: "key", label: "Keyword", type: "string", right: false, format: (row) => row.key },
  { key: "spend", label: "Spend", type: "number", right: true, format: (row) => fmt.inr(row.spend) },
  { key: "gmv", label: "GMV", type: "number", right: true, format: (row) => fmt.inr(row.gmv) },
  { key: "roas", label: "ROAS", type: "number", right: true, format: (row) => fmt.x(row.roas) },
  { key: "imp", label: "Impr.", type: "number", right: true, format: (row) => fmt.num(row.imp) },
  { key: "clks", label: "Clicks", type: "number", right: true, format: (row) => fmt.num(row.clks) },
  { key: "ctr", label: "CTR", type: "number", right: true, format: (row) => fmt.pct(row.ctr) },
  { key: "a2c", label: "ATC", type: "number", right: true, format: (row) => fmt.num(row.a2c) },
  { key: "atcr", label: "ATCR", type: "number", right: true, format: (row) => fmt.pct(row.atcr) },
  { key: "conv", label: "Conv.", type: "number", right: true, format: (row) => fmt.num(row.conv) },
  { key: "cvr", label: "CVR", type: "number", right: true, format: (row) => fmt.pct(row.cvr) },
  { key: "cpo", label: "CPO", type: "number", right: true, format: (row) => fmt.inr(row.cpo) },
  { key: "aov", label: "AOV", type: "number", right: true, format: (row) => fmt.inr(row.aov) },
];

const KEYWORD_SUMMARY_EXPORT_NAME = "keyword-summary";
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

function KeywordsTab({ keywords: rawKeywords, bleedingKeywords, starKeywords }) {
  const [keywordSort, setKeywordSort] = useState("spend");
  const [topKeywordMetricKey, setTopKeywordMetricKey] = useState("spend");
  const [summarySortKey, setSummarySortKey] = useState("spend");
  const [summarySortDirection, setSummarySortDirection] = useState("desc");
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);
  const selectedTopKeywordMetric =
    TOP_KEYWORD_METRICS.find((metric) => metric.key === topKeywordMetricKey) || TOP_KEYWORD_METRICS[0];

  const sortedBleedingKeywords = useMemo(
    () => sortKeywordRows(bleedingKeywords, keywordSort, keywordSort === "roas" ? "asc" : "desc"),
    [bleedingKeywords, keywordSort],
  );
  const sortedStarKeywords = useMemo(
    () => sortKeywordRows(starKeywords, keywordSort),
    [keywordSort, starKeywords],
  );
  const topKeywordRows = useMemo(
    () =>
      orderByMetric(rawKeywords, topKeywordMetricKey)
        .slice(0, 15)
        .map((keyword) => ({
          ...keyword,
          metricValue: keyword[topKeywordMetricKey] || 0,
          metricLabel: selectedTopKeywordMetric.format(keyword[topKeywordMetricKey] || 0),
        })),
    [rawKeywords, selectedTopKeywordMetric, topKeywordMetricKey],
  );
  const sortedSummaryRows = useMemo(() => {
    const rows = [...rawKeywords];
    const sortColumn = KEYWORD_SUMMARY_COLUMNS.find((column) => column.key === summarySortKey) || KEYWORD_SUMMARY_COLUMNS[0];
    const directionFactor = summarySortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (sortColumn.type === "string") {
        return directionFactor * left[sortColumn.key].localeCompare(right[sortColumn.key]);
      }
      return directionFactor * ((left[sortColumn.key] || 0) - (right[sortColumn.key] || 0));
    });

    return rows;
  }, [rawKeywords, summarySortDirection, summarySortKey]);

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
    const headers = KEYWORD_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...sortedSummaryRows.map((row) =>
        KEYWORD_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
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
    const headers = KEYWORD_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = sortedSummaryRows.map((row) =>
      KEYWORD_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Keyword Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${KEYWORD_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
  };

  return (
    <div className="tab-content">
      <SectionHeader
        title="Keyword intelligence"
        sub={`${rawKeywords.length} keywords with ${bleedingKeywords.length} underperformers and ${starKeywords.length} standout terms.`}
        action={
          <div className="toolbar-pills">
            {KEYWORD_SORT_OPTIONS.map((metric) => (
              <button
                key={metric}
                type="button"
                className={`pill-button compact${keywordSort === metric ? " is-active" : ""}`}
                onClick={() => {
                  startTransition(() => {
                    setKeywordSort(metric);
                  });
                }}
              >
                {metric.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      <div className="panel-grid panel-grid--two">
        <Panel className="insight-panel danger">
          <div className="panel-header">
            <div>
              <p className="panel-label">Pause candidates</p>
              <h3 className="panel-title">Keyword bleeders by {keywordSort.toUpperCase()}</h3>
            </div>
            <Badge label={String(bleedingKeywords.length)} color="#c63d2f" />
          </div>
          <div className="table-panel table-panel--flush">
            <table className="data-table">
              <thead>
                <tr>
                  <Th>Keyword</Th>
                  <Th right>Spend</Th>
                  <Th right>GMV</Th>
                  <Th right>ROAS</Th>
                  <Th right>CPO</Th>
                </tr>
              </thead>
              <tbody>
                {sortedBleedingKeywords.map((keyword) => (
                  <tr key={keyword.key}>
                    <Td>
                      <div className="table-title">{keyword.key}</div>
                      <Badge label={keyword.brand} color={BRAND_COLORS[keyword.brand]} />
                    </Td>
                    <Td right>{fmt.inr(keyword.spend)}</Td>
                    <Td right>{fmt.inr(keyword.gmv)}</Td>
                    <Td right accent color={roasTone(keyword.roas).color}>
                      {fmt.x(keyword.roas)}
                    </Td>
                    <Td right>{fmt.inr(keyword.cpo)}</Td>
                  </tr>
                ))}
                {!bleedingKeywords.length ? (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      No keyword bleeders in the selected view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="insight-panel success">
          <div className="panel-header">
            <div>
              <p className="panel-label">Scale candidates</p>
              <h3 className="panel-title">Power keywords by {keywordSort.toUpperCase()}</h3>
            </div>
            <Badge label={String(starKeywords.length)} color="#2f3744" />
          </div>
          <div className="table-panel table-panel--flush">
            <table className="data-table">
              <thead>
                <tr>
                  <Th>Keyword</Th>
                  <Th right>Spend</Th>
                  <Th right>ROAS</Th>
                  <Th right>Conv.</Th>
                  <Th right>CPO</Th>
                </tr>
              </thead>
              <tbody>
                {sortedStarKeywords.slice(0, 10).map((keyword) => (
                  <tr key={keyword.key}>
                    <Td>
                      <div className="table-title">{keyword.key}</div>
                      <Badge label={keyword.brand} color={BRAND_COLORS[keyword.brand]} />
                    </Td>
                    <Td right>{fmt.inr(keyword.spend)}</Td>
                    <Td right accent color="#2f3744">
                      {fmt.x(keyword.roas)}
                    </Td>
                    <Td right>{fmt.num(keyword.conv)}</Td>
                    <Td right>{fmt.inr(keyword.cpo)}</Td>
                  </tr>
                ))}
                {!starKeywords.length ? (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      No power keywords reached the scale threshold.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <SectionHeader
        title={`Top keywords by ${selectedTopKeywordMetric.label.toLowerCase()}`}
        sub="Use a metric switch to inspect scale and efficiency leaders."
        action={
          <div className="toolbar-pills">
            {TOP_KEYWORD_METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                className={`pill-button compact${topKeywordMetricKey === metric.key ? " is-active" : ""}`}
                onClick={() => {
                  startTransition(() => {
                    setTopKeywordMetricKey(metric.key);
                  });
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
        }
      />
      <Panel>
        <ResponsiveContainer width="100%" height={Math.max(240, topKeywordRows.length * 34 + 32)}>
          <BarChart data={topKeywordRows} layout="vertical">
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
            <XAxis type="number" tick={axisTick} stroke={CHART_GRID} tickFormatter={selectedTopKeywordMetric.tickFormat} />
            <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={144} />
            <Tooltip content={<TooltipCard valFmt={(_, value) => selectedTopKeywordMetric.format(value)} />} />
            <Bar dataKey="metricValue" name={selectedTopKeywordMetric.label} radius={[0, 12, 12, 0]} isAnimationActive={false}>
              {topKeywordRows.map((keyword) => (
                <Cell key={keyword.key} fill={roasTone(keyword.roas).color} />
              ))}
              <LabelList dataKey="metricLabel" position="right" fill={CHART_TEXT} fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <SectionHeader
        title="All keywords"
        sub="Complete keyword register across the selected window."
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
              {KEYWORD_SUMMARY_COLUMNS.map((column) => (
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
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((keyword) => (
              <tr key={keyword.key}>
                <Td>
                  <div className="table-title">{keyword.key}</div>
                  <Badge label={keyword.brand} color={BRAND_COLORS[keyword.brand]} />
                </Td>
                <Td right>{fmt.inr(keyword.spend)}</Td>
                <Td right>{fmt.inr(keyword.gmv)}</Td>
                <Td right accent color={roasTone(keyword.roas).color}>
                  {fmt.x(keyword.roas)}
                </Td>
                <Td right>{fmt.num(keyword.imp)}</Td>
                <Td right>{fmt.num(keyword.clks)}</Td>
                <Td right>{fmt.pct(keyword.ctr)}</Td>
                <Td right>{fmt.num(keyword.a2c)}</Td>
                <Td right>{fmt.pct(keyword.atcr)}</Td>
                <Td right>{fmt.num(keyword.conv)}</Td>
                <Td right>{fmt.pct(keyword.cvr)}</Td>
                <Td right>{fmt.inr(keyword.cpo)}</Td>
                <Td right>{fmt.inr(keyword.aov)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter
          total={sortedSummaryRows.length}
          shown={visibleRows.length}
          expanded={expanded}
          label="keywords"
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

export default memo(KeywordsTab);

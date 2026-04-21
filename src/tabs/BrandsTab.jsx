import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND_COLORS,
  CHART_GRID,
  CHART_TEXT,
  axisTick,
  fmt,
  pct,
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

const BRAND_CHART_METRICS = [
  { key: "roas", label: "ROAS", format: (value) => `${Number(value).toFixed(2)}x` },
  { key: "spend", label: "Spend", format: fmt.inr },
  { key: "gmv", label: "GMV", format: fmt.inr },
  { key: "imp", label: "Impressions", format: fmt.num },
  { key: "clks", label: "Clicks", format: fmt.num },
  { key: "ctr", label: "CTR", format: fmt.pct },
  { key: "a2c", label: "ATC", format: fmt.num },
  { key: "conv", label: "Conversions", format: fmt.num },
  { key: "atcr", label: "ATCR", format: fmt.pct },
  { key: "cvr", label: "CVR", format: fmt.pct },
  { key: "cpc", label: "CPC", format: fmt.inr2 },
  { key: "cpo", label: "CPO", format: fmt.inr },
  { key: "aov", label: "AOV", format: fmt.inr },
];

const BRAND_SUMMARY_COLUMNS = [
  { key: "key", label: "Brand", type: "string", format: (row) => row.key },
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

const BRAND_SUMMARY_EXPORT_NAME = "brand-summary";
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

function BrandsTab({ brands, kpis }) {
  const [brandChartMetricKey, setBrandChartMetricKey] = useState("roas");
  const [brandSummarySortKey, setBrandSummarySortKey] = useState("spend");
  const [brandSummarySortDirection, setBrandSummarySortDirection] = useState("desc");
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);

  const selectedBrandChartMetric =
    BRAND_CHART_METRICS.find((metric) => metric.key === brandChartMetricKey) || BRAND_CHART_METRICS[0];

  const brandChartData = useMemo(
    () =>
      [...brands]
        .map((brand) => ({
          ...brand,
          metricValue: Number(brand[selectedBrandChartMetric.key]) || 0,
        }))
        .sort((a, b) => b.metricValue - a.metricValue),
    [brands, selectedBrandChartMetric.key],
  );

  const brandSummaryRows = useMemo(
    () =>
      brands.map((brand) => ({
        key: brand.key,
        spend: brand.spend,
        gmv: brand.gmv,
        roas: brand.roas,
        imp: brand.imp,
        clks: brand.clks,
        ctr: brand.ctr,
        a2c: brand.a2c,
        atcr: brand.atcr,
        conv: brand.conv,
        cvr: brand.cvr,
        cpo: brand.cpo,
        aov: brand.aov,
        cpc: brand.cpc,
      })),
    [brands],
  );

  const sortedBrandSummaryRows = useMemo(() => {
    const rows = [...brandSummaryRows];
    const sortColumn = BRAND_SUMMARY_COLUMNS.find((column) => column.key === brandSummarySortKey) || BRAND_SUMMARY_COLUMNS[0];
    const directionFactor = brandSummarySortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (sortColumn.type === "string") {
        return directionFactor * left[sortColumn.key].localeCompare(right[sortColumn.key]);
      }
      return directionFactor * ((left[sortColumn.key] || 0) - (right[sortColumn.key] || 0));
    });

    return rows;
  }, [brandSummaryRows, brandSummarySortDirection, brandSummarySortKey]);

  const handleBrandSummarySort = (column) => {
    if (brandSummarySortKey === column.key) {
      setBrandSummarySortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setBrandSummarySortKey(column.key);
    setBrandSummarySortDirection(column.type === "string" ? "asc" : "desc");
  };

  const handleCopyBrandSummary = async () => {
    const headers = BRAND_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...sortedBrandSummaryRows.map((row) =>
        BRAND_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
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

  const handleExportBrandSummary = async () => {
    const headers = BRAND_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = sortedBrandSummaryRows.map((row) =>
      BRAND_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Brand Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${BRAND_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
  };

  return (
    <div className="tab-content">
      <SectionHeader title="Brand performance" sub="Cross-brand comparison across spend, quality, and conversion." />
      <div className="brand-grid">
        {brands.map((brand) => {
          const tone = roasTone(brand.roas);
          return (
            <Panel key={brand.key} className="brand-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Brand</p>
                  <h3 className="panel-title" style={{ color: BRAND_COLORS[brand.key] || "#231d17" }}>
                    {brand.key}
                  </h3>
                </div>
                <Badge label={fmt.x(brand.roas)} color={tone.color} />
              </div>

              <div className="metric-list">
                {[
                  ["Spend", fmt.inr(brand.spend)],
                  ["GMV", fmt.inr(brand.gmv)],
                  ["Impressions", fmt.num(brand.imp)],
                  ["Clicks", fmt.num(brand.clks)],
                  ["CTR", fmt.pct(brand.ctr)],
                  ["CPM", fmt.inr2(brand.cpm)],
                  ["CPC", fmt.inr2(brand.cpc)],
                  ["ATC", fmt.num(brand.a2c)],
                  ["ATCR", fmt.pct(brand.atcr)],
                  ["Conversions", fmt.num(brand.conv)],
                  ["CVR", fmt.pct(brand.cvr)],
                  ["CPO", fmt.inr(brand.cpo)],
                  ["AOV", fmt.inr(brand.aov)],
                ].map(([label, value]) => (
                  <div key={label} className="metric-list__row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="inline-metric">
                <span>Spend share {fmt.pct(pct(brand.spend, kpis.spend))}</span>
                <HealthBar roas={brand.roas} max={8} />
              </div>
            </Panel>
          );
        })}
      </div>

      <SectionHeader
        title="Brand charts"
        sub="Pick one metric to compare brand bars and distribution together."
        action={
          <div className="toolbar-pills">
            {BRAND_CHART_METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                className={`pill-button compact${brandChartMetricKey === metric.key ? " is-active" : ""}`}
                onClick={() => {
                  startTransition(() => {
                    setBrandChartMetricKey(metric.key);
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
              <p className="panel-label">Brand comparison</p>
              <h3 className="panel-title">{selectedBrandChartMetric.label} by brand</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={brandChartData} layout="vertical">
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
              <XAxis
                type="number"
                tick={axisTick}
                stroke={CHART_GRID}
                tickFormatter={(value) => selectedBrandChartMetric.format(value)}
              />
              <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={80} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => selectedBrandChartMetric.format(value)} />} />
              <Bar dataKey="metricValue" name={selectedBrandChartMetric.label} radius={[0, 12, 12, 0]} isAnimationActive={false}>
                {brandChartData.map((brand) => (
                  <Cell key={brand.key} fill={BRAND_COLORS[brand.key] || "#9a8e83"} />
                ))}
                <LabelList
                  dataKey="metricValue"
                  position="right"
                  formatter={(value) => selectedBrandChartMetric.format(value)}
                  fill={CHART_TEXT}
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Brand mix</p>
              <h3 className="panel-title">{selectedBrandChartMetric.label} distribution</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={brandChartData}
                dataKey="metricValue"
                nameKey="key"
                cx="50%"
                cy="50%"
                outerRadius={92}
                innerRadius={54}
                paddingAngle={4}
                label={({ key, percent }) => `${key} ${Number.isFinite(percent) ? (percent * 100).toFixed(0) : "0"}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {brandChartData.map((brand) => (
                  <Cell key={brand.key} fill={BRAND_COLORS[brand.key] || "#9a8e83"} />
                ))}
              </Pie>
              <Tooltip content={<TooltipCard valFmt={(_, value) => selectedBrandChartMetric.format(value)} />} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <SectionHeader
        title="Brand summary table"
        sub="All core metrics per brand."
        action={
          <div className="table-actions">
            <button
              type="button"
              className={`ghost-button table-action-copy${isCopyConfirmed ? " is-copied" : ""}`}
              onClick={handleCopyBrandSummary}
              disabled={!sortedBrandSummaryRows.length}
            >
              Copy table
              <span className="table-action-copy__tick" aria-hidden="true">✓</span>
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportBrandSummary}
              disabled={!sortedBrandSummaryRows.length}
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
              {BRAND_SUMMARY_COLUMNS.map((column) => (
                <Th key={column.key} right={column.key !== "key"}>
                  <button
                    type="button"
                    className={`table-sort-button${brandSummarySortKey === column.key ? " is-active" : ""}`}
                    onClick={() => handleBrandSummarySort(column)}
                  >
                    {column.label}
                    {brandSummarySortKey === column.key
                      ? brandSummarySortDirection === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedBrandSummaryRows.map((row) => (
              <tr key={row.key}>
                <Td>{row.key}</Td>
                <Td right>{formatAbsoluteCurrency(row.spend)}</Td>
                <Td right>{formatAbsoluteCurrency(row.gmv)}</Td>
                <Td right accent color={roasTone(row.roas).color}>{fmt.dec2(row.roas)}</Td>
                <Td right>{row.imp}</Td>
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

export default memo(BrandsTab);

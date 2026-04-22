import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND_COLORS,
  CHART_GRID,
  PRODUCT_SORT_OPTIONS,
  TABLE_PREVIEW_LIMIT,
  axisTick,
  cleanProductName,
  fmt,
  orderByMetric,
  roasTone,
} from "../lib/metrics.js";
import {
  Badge,
  HealthBar,
  Panel,
  SectionHeader,
  TableFooter,
  Td,
  Th,
  TooltipCard,
} from "../lib/ui.jsx";

const PRODUCT_SUMMARY_COLUMNS = [
  { key: "key", label: "Product", type: "string", right: false, format: (row) => row.key },
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
  { key: "aov", label: "AOV", type: "number", right: true, format: (row) => fmt.inr(row.aov) },
  { key: "cpo", label: "CPO", type: "number", right: true, format: (row) => fmt.inr(row.cpo) },
];

const PRODUCT_SUMMARY_EXPORT_NAME = "product-summary";
const COPY_FEEDBACK_MS = 1200;
const PRODUCT_CHART_LIMIT = 10;

function truncateProductLabel(value, maxLength = 28) {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatProductMetric(metric, value) {
  if (metric === "roas") return `${Number(value).toFixed(2)}x`;
  if (metric === "aov" || metric === "spend" || metric === "gmv" || metric === "cpo") {
    return fmt.inrFull(value);
  }
  return fmt.num(value);
}

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

function ProductsTab({ products: rawProducts }) {
  const [productSort, setProductSort] = useState("spend");
  const [summarySortKey, setSummarySortKey] = useState("spend");
  const [summarySortDirection, setSummarySortDirection] = useState("desc");
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);

  const products = useMemo(
    () => orderByMetric(rawProducts, productSort),
    [rawProducts, productSort],
  );
  const topProductChartData = useMemo(
    () =>
      products.slice(0, PRODUCT_CHART_LIMIT).map((product, index) => ({
        ...product,
        rank: index + 1,
        metricValue: product[productSort] || 0,
        metricLabel: formatProductMetric(productSort, product[productSort] || 0),
        displayName: truncateProductLabel(cleanProductName(product.key) || product.key),
      })),
    [productSort, products],
  );
  const sortedSummaryRows = useMemo(() => {
    const rows = [...rawProducts];
    const sortColumn = PRODUCT_SUMMARY_COLUMNS.find((column) => column.key === summarySortKey) || PRODUCT_SUMMARY_COLUMNS[0];
    const directionFactor = summarySortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      if (sortColumn.type === "string") {
        return directionFactor * left[sortColumn.key].localeCompare(right[sortColumn.key]);
      }
      return directionFactor * ((left[sortColumn.key] || 0) - (right[sortColumn.key] || 0));
    });

    return rows;
  }, [rawProducts, summarySortDirection, summarySortKey]);

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
    const headers = PRODUCT_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...sortedSummaryRows.map((row) =>
        PRODUCT_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
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
    const headers = PRODUCT_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = sortedSummaryRows.map((row) =>
      PRODUCT_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Product Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${PRODUCT_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
  };

  return (
    <div className="tab-content">
      <SectionHeader
        title="Product performance"
        sub={`${products.length} products ordered by the selected metric.`}
        action={
          <div className="toolbar-pills">
            {PRODUCT_SORT_OPTIONS.map((metric) => (
              <button
                key={metric}
                type="button"
                className={`pill-button compact${productSort === metric ? " is-active" : ""}`}
                onClick={() => {
                  startTransition(() => {
                    setProductSort(metric);
                  });
                }}
              >
                {metric.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      <Panel>
        <div className="panel-header">
          <div>
            <p className="panel-label">Top products</p>
            <h3 className="panel-title">Ranked by {productSort.toUpperCase()}</h3>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(320, topProductChartData.length * 42)}>
          <BarChart
            data={topProductChartData}
            layout="vertical"
            margin={{ top: 6, right: 36, bottom: 6, left: 12 }}
          >
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              tick={axisTick}
              stroke={CHART_GRID}
              tickFormatter={(value) => {
                if (productSort === "roas") return `${Number(value).toFixed(1)}x`;
                if (productSort === "aov" || productSort === "spend" || productSort === "gmv" || productSort === "cpo") {
                  return fmt.inr(value);
                }
                return fmt.num(value);
              }}
            />
            <YAxis type="category" dataKey="displayName" tick={axisTick} stroke={CHART_GRID} width={190} />
            <Tooltip
              content={
                <TooltipCard
                  valFmt={(_, value) => formatProductMetric(productSort, value)}
                />
              }
            />
            <Bar dataKey="metricValue" name={productSort.toUpperCase()} fill="#2f3744" radius={[0, 12, 12, 0]} barSize={18} isAnimationActive={false}>
              <LabelList dataKey="metricLabel" position="right" fill="#4e5766" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <SectionHeader
        title="All products"
        sub="Full product register for long-tail review."
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
              {PRODUCT_SUMMARY_COLUMNS.map((column) => (
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
            {visibleRows.map((product) => (
              <tr key={product.key}>
                <Td>
                  <div className="table-title">{product.key}</div>
                  <Badge label={product.brand} color={BRAND_COLORS[product.brand]} />
                </Td>
                <Td right>{fmt.inr(product.spend)}</Td>
                <Td right>{fmt.inr(product.gmv)}</Td>
                <Td right accent color={roasTone(product.roas).color}>
                  {fmt.x(product.roas)}
                </Td>
                <Td right>{fmt.num(product.imp)}</Td>
                <Td right>{fmt.num(product.clks)}</Td>
                <Td right>{fmt.pct(product.ctr)}</Td>
                <Td right>{fmt.num(product.a2c)}</Td>
                <Td right>{fmt.pct(product.atcr)}</Td>
                <Td right>{fmt.num(product.conv)}</Td>
                <Td right>{fmt.pct(product.cvr)}</Td>
                <Td right>{fmt.inr(product.aov)}</Td>
                <Td right>{fmt.inr(product.cpo)}</Td>
                <Td>
                  <HealthBar roas={product.roas} max={10} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter
          total={sortedSummaryRows.length}
          shown={visibleRows.length}
          expanded={expanded}
          label="products"
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

export default memo(ProductsTab);

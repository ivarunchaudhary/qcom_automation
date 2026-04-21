import { memo, useMemo, useState, useTransition } from "react";
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

function ProductsTab({ products: rawProducts }) {
  const [productSort, setProductSort] = useState("spend");
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const products = useMemo(
    () => orderByMetric(rawProducts, productSort),
    [rawProducts, productSort],
  );

  const visibleRows = expanded ? products : products.slice(0, TABLE_PREVIEW_LIMIT);

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
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={products.slice(0, 12).map((product) => ({
              ...product,
              shortName: cleanProductName(product.key),
            }))}
            layout="vertical"
          >
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              tick={axisTick}
              stroke={CHART_GRID}
              tickFormatter={(value) => {
                if (productSort === "roas") return `${Number(value).toFixed(1)}x`;
                if (productSort === "aov" || productSort === "spend" || productSort === "gmv") {
                  return fmt.inr(value);
                }
                return fmt.num(value);
              }}
            />
            <YAxis type="category" dataKey="shortName" tick={axisTick} stroke={CHART_GRID} width={170} />
            <Tooltip
              content={
                <TooltipCard
                  valFmt={(_, value) => {
                    if (productSort === "roas") return `${Number(value).toFixed(2)}x`;
                    if (productSort === "aov" || productSort === "spend" || productSort === "gmv") {
                      return fmt.inrFull(value);
                    }
                    return fmt.num(value);
                  }}
                />
              }
            />
            <Bar dataKey={productSort} name={productSort.toUpperCase()} radius={[0, 12, 12, 0]} isAnimationActive={false}>
              {products.slice(0, 12).map((product) => (
                <Cell key={product.key} fill={BRAND_COLORS[product.brand] || "#9a8e83"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <SectionHeader title="All products" sub="Full product register for long-tail review." />
      <Panel className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Product</Th>
              <Th right>Spend</Th>
              <Th right>GMV</Th>
              <Th right>ROAS</Th>
              <Th right>Impr.</Th>
              <Th right>Clicks</Th>
              <Th right>CTR</Th>
              <Th right>ATC</Th>
              <Th right>ATCR</Th>
              <Th right>Conv.</Th>
              <Th right>CVR</Th>
              <Th right>AOV</Th>
              <Th right>CPO</Th>
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
          total={products.length}
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

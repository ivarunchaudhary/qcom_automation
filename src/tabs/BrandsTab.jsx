import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND_COLORS,
  CHART_AXIS,
  CHART_GRID,
  CHART_TEXT,
  axisTick,
  chartLegendStyle,
  fmt,
  pct,
  roasTone,
} from "../lib/metrics.js";
import {
  Badge,
  HealthBar,
  Panel,
  SectionHeader,
  TooltipCard,
} from "../lib/ui.jsx";

function BrandsTab({ brands, kpis }) {
  const brandRadarData = useMemo(
    () => [
      {
        metric: "ROAS",
        ...Object.fromEntries(brands.map((brand) => [brand.key, Math.min((brand.roas / 8) * 100, 100)])),
      },
      {
        metric: "CTR",
        ...Object.fromEntries(brands.map((brand) => [brand.key, Math.min((brand.ctr / 10) * 100, 100)])),
      },
      {
        metric: "ATCR",
        ...Object.fromEntries(brands.map((brand) => [brand.key, Math.min((brand.atcr / 5) * 100, 100)])),
      },
      {
        metric: "CVR",
        ...Object.fromEntries(brands.map((brand) => [brand.key, Math.min((brand.cvr / 60) * 100, 100)])),
      },
      {
        metric: "GMV share",
        ...Object.fromEntries(brands.map((brand) => [brand.key, pct(brand.gmv, kpis.gmv)])),
      },
    ],
    [brands, kpis.gmv],
  );

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

      <div className="panel-grid panel-grid--two">
        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Brand efficiency</p>
              <h3 className="panel-title">ROAS by brand</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={brands} layout="vertical">
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={axisTick} stroke={CHART_GRID} tickFormatter={(value) => `${value}x`} />
              <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={80} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => `${Number(value).toFixed(2)}x`} />} />
              <Bar dataKey="roas" name="ROAS" radius={[0, 12, 12, 0]} isAnimationActive={false}>
                {brands.map((brand) => (
                  <Cell key={brand.key} fill={BRAND_COLORS[brand.key] || "#9a8e83"} />
                ))}
                <LabelList dataKey="roas" position="right" formatter={(value) => `${value.toFixed(1)}x`} fill={CHART_TEXT} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Budget mix</p>
              <h3 className="panel-title">Spend distribution</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={brands}
                dataKey="spend"
                nameKey="key"
                cx="50%"
                cy="50%"
                outerRadius={92}
                innerRadius={54}
                paddingAngle={4}
                label={({ key, percent }) => `${key} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {brands.map((brand) => (
                  <Cell key={brand.key} fill={BRAND_COLORS[brand.key] || "#9a8e83"} />
                ))}
              </Pie>
              <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.inrFull(value)} />} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <SectionHeader title="Brand efficiency radar" sub="Normalized scores where higher is better." />
      <Panel>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={brandRadarData}>
            <PolarGrid stroke={CHART_GRID} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: CHART_AXIS, fontSize: 10 }} />
            {brands.map((brand) => (
              <Radar
                key={brand.key}
                name={brand.key}
                dataKey={brand.key}
                stroke={BRAND_COLORS[brand.key] || "#9a8e83"}
                fill={BRAND_COLORS[brand.key] || "#9a8e83"}
                fillOpacity={0.12}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
            <Legend wrapperStyle={chartLegendStyle} />
            <Tooltip content={<TooltipCard valFmt={(_, value) => Number(value).toFixed(1)} />} />
          </RadarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

export default memo(BrandsTab);

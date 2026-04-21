import { memo, useMemo } from "react";
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
  TooltipCard,
} from "../lib/ui.jsx";

function AdTypesTab({ adtypes }) {
  const adtypeChartData = useMemo(
    () => adtypes.map((item) => ({ ...item, name: cleanAdTypeLabel(item.key) })),
    [adtypes],
  );

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
    </div>
  );
}

export default memo(AdTypesTab);

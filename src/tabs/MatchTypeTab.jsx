import { memo, useMemo } from "react";
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
  TooltipCard,
} from "../lib/ui.jsx";

function MatchTypeTab({ matchTypes }) {
  const matchTypeChartData = useMemo(
    () => matchTypes.map((item) => ({ ...item, name: MT_LABELS[item.key] || item.key })),
    [matchTypes],
  );

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
              <Bar dataKey="spend" name="Spend" fill="#e66a2c" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="gmv" name="GMV" fill="#14976e" radius={[12, 12, 0, 0]} isAnimationActive={false} />
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
              <Bar dataKey="ctr" name="CTR" fill="#e66a2c" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="atcr" name="ATCR" fill="#4d61ff" radius={[12, 12, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="cvr" name="CVR" fill="#14976e" radius={[12, 12, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

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

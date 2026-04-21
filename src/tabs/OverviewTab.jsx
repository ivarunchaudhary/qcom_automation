import { memo, useState, useTransition } from "react";
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
  BRAND_COLORS,
  CHART_GRID,
  DAILY_METRICS,
  ROAS_TARGET,
  axisTick,
  chartLegendStyle,
  cleanCampaignName,
  fmt,
  formatRangeDate,
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

function OverviewTab({ daily, bleedingCampaigns, starKeywords }) {
  const [dailyMetric, setDailyMetric] = useState("roas");
  const [, startTransition] = useTransition();

  const selectedMetric =
    DAILY_METRICS.find((metric) => metric.key === dailyMetric) || DAILY_METRICS[0];
  const dayTrend =
    daily.length >= 2
      ? pct(
          daily[daily.length - 1][dailyMetric] - daily[daily.length - 2][dailyMetric],
          Math.abs(daily[daily.length - 2][dailyMetric]),
        )
      : 0;

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

      <SectionHeader title="Daily summary table" sub="All core metrics per reporting day." />
      <Panel className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              {[
                "Date",
                "Spend",
                "GMV",
                "ROAS",
                "Impressions",
                "Clicks",
                "CTR",
                "ATC",
                "ATCR",
                "Conv.",
                "CVR",
                "CPO",
                "AOV",
                "CPC",
              ].map((header) => (
                <Th key={header} right={header !== "Date"}>
                  {header}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daily.map((item) => (
              <tr key={item.rawDate}>
                <Td>{formatRangeDate(item.rawDate)}</Td>
                <Td right>{fmt.inr(item.spend)}</Td>
                <Td right>{fmt.inr(item.gmv)}</Td>
                <Td right accent color={roasTone(item.roas).color}>
                  {fmt.x(item.roas)}
                </Td>
                <Td right>{fmt.num(item.imp)}</Td>
                <Td right>{fmt.num(item.clks)}</Td>
                <Td right>{fmt.pct(item.ctr)}</Td>
                <Td right>{fmt.num(item.a2c)}</Td>
                <Td right>{fmt.pct(item.atcr)}</Td>
                <Td right>{fmt.num(item.conv)}</Td>
                <Td right>{fmt.pct(item.cvr)}</Td>
                <Td right>{fmt.inr(item.cpo)}</Td>
                <Td right>{fmt.inr(item.aov)}</Td>
                <Td right>{fmt.inr2(item.cpc)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <SectionHeader title="Action prompts" sub="Immediate optimization cues for the selected range." />
      <div className="panel-grid panel-grid--two">
        <Panel className="insight-panel danger">
          <div className="panel-header">
            <div>
              <p className="panel-label">Budget at risk</p>
              <h3 className="panel-title">Bleeding campaigns</h3>
            </div>
            <Badge label={String(bleedingCampaigns.length)} color="#c63d2f" />
          </div>

          <div className="stack-list">
            {bleedingCampaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.key} className="stack-list__item">
                <div>
                  <p className="stack-list__title">{cleanCampaignName(campaign.key)}</p>
                  <Badge label={campaign.brand} color={BRAND_COLORS[campaign.brand]} />
                </div>
                <div className="stack-list__meta">
                  <strong style={{ color: "#c63d2f" }}>{fmt.x(campaign.roas)}</strong>
                  <span>{fmt.inr(campaign.spend)} spend</span>
                </div>
              </div>
            ))}
            {!bleedingCampaigns.length ? <p className="empty-copy">No bleeding campaigns in the selected range.</p> : null}
          </div>
        </Panel>

        <Panel className="insight-panel success">
          <div className="panel-header">
            <div>
              <p className="panel-label">Scale candidates</p>
              <h3 className="panel-title">Winning keywords</h3>
            </div>
            <Badge label={String(starKeywords.length)} color="#14976e" />
          </div>

          <div className="stack-list">
            {starKeywords.slice(0, 5).map((keyword) => (
              <div key={keyword.key} className="stack-list__item">
                <div>
                  <p className="stack-list__title">{keyword.key}</p>
                  <Badge label={keyword.brand} color={BRAND_COLORS[keyword.brand]} />
                </div>
                <div className="stack-list__meta">
                  <strong style={{ color: "#14976e" }}>{fmt.x(keyword.roas)}</strong>
                  <span>{fmt.num(keyword.conv)} conversions</span>
                </div>
              </div>
            ))}
            {!starKeywords.length ? <p className="empty-copy">No star keywords crossed the scale threshold yet.</p> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default memo(OverviewTab);

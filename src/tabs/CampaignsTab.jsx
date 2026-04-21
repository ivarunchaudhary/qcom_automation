import { memo, useMemo, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND_COLORS,
  CAMPAIGN_SORT_OPTIONS,
  CHART_GRID,
  TABLE_PREVIEW_LIMIT,
  axisTick,
  chartLegendStyle,
  cleanAdTypeLabel,
  cleanCampaignName,
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

function CampaignsTab({ campaigns: rawCampaigns, bleedingCampaigns, starCampaigns }) {
  const [campaignSort, setCampaignSort] = useState("spend");
  const [campaignSortDir, setCampaignSortDir] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const campaigns = useMemo(
    () => orderByMetric(rawCampaigns, campaignSort, campaignSortDir),
    [rawCampaigns, campaignSort, campaignSortDir],
  );

  const campaignScatterSeries = useMemo(() => {
    const brandSeries = new Map();

    campaigns.forEach((campaign) => {
      const seriesKey = campaign.brand || "Other";
      const series = brandSeries.get(seriesKey);
      if (series) {
        series.push(campaign);
        return;
      }
      brandSeries.set(seriesKey, [campaign]);
    });

    return Array.from(brandSeries, ([brand, seriesData]) => ({ brand, data: seriesData }));
  }, [campaigns]);

  const visibleRows = expanded ? campaigns : campaigns.slice(0, TABLE_PREVIEW_LIMIT);

  const handleSort = (metric) => {
    startTransition(() => {
      if (campaignSort === metric) {
        setCampaignSortDir((current) => current * -1);
        return;
      }
      setCampaignSort(metric);
      setCampaignSortDir(-1);
    });
  };

  return (
    <div className="tab-content">
      <SectionHeader
        title="Campaign register"
        sub={`${campaigns.length} campaigns with ${bleedingCampaigns.length} below target.`}
        action={
          <div className="toolbar-pills">
            {CAMPAIGN_SORT_OPTIONS.map((metric) => (
              <button
                key={metric}
                type="button"
                className={`pill-button compact${campaignSort === metric ? " is-active" : ""}`}
                onClick={() => handleSort(metric)}
              >
                {metric.toUpperCase()}
                {campaignSort === metric ? (campaignSortDir === -1 ? " ↓" : " ↑") : ""}
              </button>
            ))}
          </div>
        }
      />

      <div className="panel-grid panel-grid--two">
        <Panel className="insight-panel danger">
          <div className="panel-header">
            <div>
              <p className="panel-label">Pause or optimize</p>
              <h3 className="panel-title">Bleeding campaigns</h3>
            </div>
            <Badge label={String(bleedingCampaigns.length)} color="#c63d2f" />
          </div>
          <div className="table-panel table-panel--flush">
            <table className="data-table">
              <thead>
                <tr>
                  <Th>Campaign</Th>
                  <Th right>Spend</Th>
                  <Th right>GMV</Th>
                  <Th right>ROAS</Th>
                  <Th right>CPO</Th>
                </tr>
              </thead>
              <tbody>
                {bleedingCampaigns.slice(0, 8).map((campaign) => (
                  <tr key={campaign.key}>
                    <Td>
                      <div className="table-title">{cleanCampaignName(campaign.key)}</div>
                      <Badge label={campaign.brand} color={BRAND_COLORS[campaign.brand]} />
                    </Td>
                    <Td right>{fmt.inr(campaign.spend)}</Td>
                    <Td right>{fmt.inr(campaign.gmv)}</Td>
                    <Td right accent color={roasTone(campaign.roas).color}>
                      {fmt.x(campaign.roas)}
                    </Td>
                    <Td right>{fmt.inr(campaign.cpo)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="insight-panel success">
          <div className="panel-header">
            <div>
              <p className="panel-label">Scale budget</p>
              <h3 className="panel-title">Star campaigns</h3>
            </div>
            <Badge label={String(starCampaigns.length)} color="#14976e" />
          </div>
          <div className="table-panel table-panel--flush">
            <table className="data-table">
              <thead>
                <tr>
                  <Th>Campaign</Th>
                  <Th right>Spend</Th>
                  <Th right>GMV</Th>
                  <Th right>ROAS</Th>
                  <Th right>Conv.</Th>
                </tr>
              </thead>
              <tbody>
                {starCampaigns.slice(0, 8).map((campaign) => (
                  <tr key={campaign.key}>
                    <Td>
                      <div className="table-title">{cleanCampaignName(campaign.key)}</div>
                      <Badge label={campaign.brand} color={BRAND_COLORS[campaign.brand]} />
                    </Td>
                    <Td right>{fmt.inr(campaign.spend)}</Td>
                    <Td right>{fmt.inr(campaign.gmv)}</Td>
                    <Td right accent color="#14976e">
                      {fmt.x(campaign.roas)}
                    </Td>
                    <Td right>{fmt.num(campaign.conv)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <SectionHeader title="Campaign positioning" sub="Bottom-right is efficient scale, top-left needs review." />
      <Panel>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="spend"
              name="Spend"
              tick={axisTick}
              stroke={CHART_GRID}
              tickFormatter={fmt.inr}
            />
            <YAxis
              type="number"
              dataKey="roas"
              name="ROAS"
              tick={axisTick}
              stroke={CHART_GRID}
              tickFormatter={(value) => `${value}x`}
            />
            <Tooltip
              cursor={{ stroke: "#d8ccbb", strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload;
                return (
                  <div className="chart-tooltip">
                    <p className="chart-tooltip__label">{point.brand}</p>
                    <div className="chart-tooltip__row">
                      <span className="chart-tooltip__name">{cleanCampaignName(point.key)}</span>
                    </div>
                    <div className="chart-tooltip__row">
                      <span className="chart-tooltip__name">Spend</span>
                      <span className="chart-tooltip__value">{fmt.inrFull(point.spend)}</span>
                    </div>
                    <div className="chart-tooltip__row">
                      <span className="chart-tooltip__name">ROAS</span>
                      <span className="chart-tooltip__value">{fmt.x(point.roas)}</span>
                    </div>
                    <div className="chart-tooltip__row">
                      <span className="chart-tooltip__name">Conversions</span>
                      <span className="chart-tooltip__value">{fmt.num(point.conv)}</span>
                    </div>
                  </div>
                );
              }}
            />
            {campaignScatterSeries.map(({ brand, data: brandCampaigns }) => (
              <Scatter
                key={brand}
                name={brand}
                data={brandCampaigns}
                fill={BRAND_COLORS[brand] || "#9a8e83"}
                opacity={0.78}
                isAnimationActive={false}
              />
            ))}
            <Legend wrapperStyle={chartLegendStyle} />
          </ScatterChart>
        </ResponsiveContainer>
      </Panel>

      <SectionHeader title="All campaigns" sub="Full campaign register for deeper checks." />
      <Panel className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Campaign</Th>
              <Th right>Spend</Th>
              <Th right>GMV</Th>
              <Th right>ROAS</Th>
              <Th right>Impr.</Th>
              <Th right>Clicks</Th>
              <Th right>ATC</Th>
              <Th right>Conv.</Th>
              <Th right>CPO</Th>
              <Th right>AOV</Th>
              <Th right>CPC</Th>
              <Th>Health</Th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((campaign) => (
              <tr key={campaign.key}>
                <Td>
                  <div className="table-title">{cleanCampaignName(campaign.key)}</div>
                  <div className="table-badges">
                    <Badge label={campaign.brand} color={BRAND_COLORS[campaign.brand]} />
                    <Badge label={cleanAdTypeLabel(campaign.adtype)} color="#8a7d71" />
                  </div>
                </Td>
                <Td right>{fmt.inr(campaign.spend)}</Td>
                <Td right>{fmt.inr(campaign.gmv)}</Td>
                <Td right accent color={roasTone(campaign.roas).color}>
                  {fmt.x(campaign.roas)}
                </Td>
                <Td right>{fmt.num(campaign.imp)}</Td>
                <Td right>{fmt.num(campaign.clks)}</Td>
                <Td right>{fmt.num(campaign.a2c)}</Td>
                <Td right>{fmt.num(campaign.conv)}</Td>
                <Td right>{fmt.inr(campaign.cpo)}</Td>
                <Td right>{fmt.inr(campaign.aov)}</Td>
                <Td right>{fmt.inr2(campaign.cpc)}</Td>
                <Td>
                  <HealthBar roas={campaign.roas} max={10} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter
          total={campaigns.length}
          shown={visibleRows.length}
          expanded={expanded}
          label="campaigns"
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

export default memo(CampaignsTab);

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
  CHART_GRID,
  TABLE_PREVIEW_LIMIT,
  axisTick,
  fmt,
  orderByMetric,
  roasTone,
} from "../lib/metrics.js";
import {
  HealthBar,
  Panel,
  SectionHeader,
  TableFooter,
  Td,
  Th,
  TooltipCard,
} from "../lib/ui.jsx";

function GeoTab({ cities: rawCities }) {
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const cities = useMemo(() => orderByMetric(rawCities, "spend"), [rawCities]);
  const citiesByRoas = useMemo(() => [...cities].sort((a, b) => b.roas - a.roas), [cities]);
  const citySpendLeaders = useMemo(() => cities.slice(0, 12), [cities]);
  const cityRoasLeaders = useMemo(() => citiesByRoas.slice(0, 12), [citiesByRoas]);
  const visibleRows = expanded ? cities : cities.slice(0, TABLE_PREVIEW_LIMIT);

  return (
    <div className="tab-content">
      <SectionHeader title="Geo performance" sub={`${cities.length} cities active in the selected period.`} />
      <div className="panel-grid panel-grid--two">
        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Market coverage</p>
              <h3 className="panel-title">Top cities by spend</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={citySpendLeaders} layout="vertical">
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={axisTick} stroke={CHART_GRID} tickFormatter={fmt.inr} />
              <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={92} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.inrFull(value)} />} />
              <Bar dataKey="spend" name="Spend" fill="#e66a2c" radius={[0, 12, 12, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div className="panel-header">
            <div>
              <p className="panel-label">Efficiency</p>
              <h3 className="panel-title">Top cities by ROAS</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={cityRoasLeaders} layout="vertical">
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={axisTick} stroke={CHART_GRID} tickFormatter={(value) => `${value.toFixed(1)}x`} />
              <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={92} />
              <Tooltip content={<TooltipCard valFmt={(_, value) => `${Number(value).toFixed(2)}x`} />} />
              <Bar dataKey="roas" name="ROAS" radius={[0, 12, 12, 0]} isAnimationActive={false}>
                {cityRoasLeaders.map((city) => (
                  <Cell key={city.key} fill={roasTone(city.roas).color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <SectionHeader title="City table" sub="Complete city-level efficiency register." />
      <Panel className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <Th>#</Th>
              <Th>City</Th>
              <Th right>Spend</Th>
              <Th right>GMV</Th>
              <Th right>ROAS</Th>
              <Th right>Impr.</Th>
              <Th right>Clicks</Th>
              <Th right>ATC</Th>
              <Th right>Conv.</Th>
              <Th right>CPO</Th>
              <Th right>AOV</Th>
              <Th>Health</Th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((city, index) => (
              <tr key={city.key}>
                <Td>{index + 1}</Td>
                <Td>{city.key}</Td>
                <Td right>{fmt.inr(city.spend)}</Td>
                <Td right>{fmt.inr(city.gmv)}</Td>
                <Td right accent color={roasTone(city.roas).color}>
                  {fmt.x(city.roas)}
                </Td>
                <Td right>{fmt.num(city.imp)}</Td>
                <Td right>{fmt.num(city.clks)}</Td>
                <Td right>{fmt.num(city.a2c)}</Td>
                <Td right>{fmt.num(city.conv)}</Td>
                <Td right>{fmt.inr(city.cpo)}</Td>
                <Td right>{fmt.inr(city.aov)}</Td>
                <Td>
                  <HealthBar roas={city.roas} max={10} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter
          total={cities.length}
          shown={visibleRows.length}
          expanded={expanded}
          label="cities"
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

export default memo(GeoTab);

import { memo, useMemo, useState, useTransition } from "react";
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

function KeywordsTab({ keywords: rawKeywords, bleedingKeywords, starKeywords }) {
  const [keywordSort, setKeywordSort] = useState("spend");
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const keywords = useMemo(
    () => orderByMetric(rawKeywords, keywordSort),
    [rawKeywords, keywordSort],
  );

  const visibleRows = expanded ? keywords : keywords.slice(0, TABLE_PREVIEW_LIMIT);

  return (
    <div className="tab-content">
      <SectionHeader
        title="Keyword intelligence"
        sub={`${keywords.length} keywords with ${bleedingKeywords.length} underperformers and ${starKeywords.length} standout terms.`}
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
              <h3 className="panel-title">Keyword bleeders</h3>
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
                {bleedingKeywords.map((keyword) => (
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
              <h3 className="panel-title">Power keywords</h3>
            </div>
            <Badge label={String(starKeywords.length)} color="#14976e" />
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
                {starKeywords.slice(0, 10).map((keyword) => (
                  <tr key={keyword.key}>
                    <Td>
                      <div className="table-title">{keyword.key}</div>
                      <Badge label={keyword.brand} color={BRAND_COLORS[keyword.brand]} />
                    </Td>
                    <Td right>{fmt.inr(keyword.spend)}</Td>
                    <Td right accent color="#14976e">
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

      <SectionHeader title="Top keywords by spend" sub="Bar color reflects ROAS health." />
      <Panel>
        <ResponsiveContainer width="100%" height={Math.max(240, Math.min(keywords.length, 15) * 34 + 32)}>
          <BarChart data={keywords.slice(0, 15).map((keyword) => ({ ...keyword, roasLabel: keyword.roas.toFixed(1) }))} layout="vertical">
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" horizontal={false} />
            <XAxis type="number" tick={axisTick} stroke={CHART_GRID} tickFormatter={fmt.inr} />
            <YAxis type="category" dataKey="key" tick={axisTick} stroke={CHART_GRID} width={144} />
            <Tooltip content={<TooltipCard valFmt={(_, value) => fmt.inrFull(value)} />} />
            <Bar dataKey="spend" name="Spend" radius={[0, 12, 12, 0]} isAnimationActive={false}>
              {keywords.slice(0, 15).map((keyword) => (
                <Cell key={keyword.key} fill={roasTone(keyword.roas).color} />
              ))}
              <LabelList dataKey="roasLabel" position="right" formatter={(value) => `${value}x`} fill={CHART_TEXT} fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <SectionHeader title="All keywords" sub="Complete keyword register across the selected window." />
      <Panel className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Keyword</Th>
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
              <Th right>CPO</Th>
              <Th right>AOV</Th>
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
          total={keywords.length}
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

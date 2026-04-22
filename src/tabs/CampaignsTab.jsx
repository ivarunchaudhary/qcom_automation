import { memo, useMemo, useRef, useState, useTransition } from "react";
import {
  BRAND_COLORS,
  CAMPAIGN_SORT_OPTIONS,
  TABLE_PREVIEW_LIMIT,
  cleanAdTypeLabel,
  cleanCampaignName,
  fmt,
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
} from "../lib/ui.jsx";

const CAMPAIGN_SUMMARY_COLUMNS = [
  { key: "key", label: "Campaign", type: "string", right: false, format: (row) => cleanCampaignName(row.key) },
  { key: "spend", label: "Spend", type: "number", right: true, format: (row) => fmt.inr(row.spend) },
  { key: "gmv", label: "GMV", type: "number", right: true, format: (row) => fmt.inr(row.gmv) },
  { key: "roas", label: "ROAS", type: "number", right: true, format: (row) => fmt.x(row.roas) },
  { key: "imp", label: "Impr.", type: "number", right: true, format: (row) => fmt.num(row.imp) },
  { key: "clks", label: "Clicks", type: "number", right: true, format: (row) => fmt.num(row.clks) },
  { key: "a2c", label: "ATC", type: "number", right: true, format: (row) => fmt.num(row.a2c) },
  { key: "conv", label: "Conv.", type: "number", right: true, format: (row) => fmt.num(row.conv) },
  { key: "cpo", label: "CPO", type: "number", right: true, format: (row) => fmt.inr(row.cpo) },
  { key: "aov", label: "AOV", type: "number", right: true, format: (row) => fmt.inr(row.aov) },
  { key: "cpc", label: "CPC", type: "number", right: true, format: (row) => fmt.inr2(row.cpc) },
];

const CAMPAIGN_SUMMARY_EXPORT_NAME = "campaign-summary";
const COPY_FEEDBACK_MS = 1200;

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

function sortCampaignRows(rows, sortKey, sortDirection) {
  const directionFactor = sortDirection === -1 ? -1 : 1;
  const sortedRows = [...rows];

  sortedRows.sort((left, right) => {
    if (sortKey === "key") {
      return directionFactor * cleanCampaignName(left.key).localeCompare(cleanCampaignName(right.key));
    }
    return directionFactor * ((left[sortKey] || 0) - (right[sortKey] || 0));
  });

  return sortedRows;
}

function CampaignsTab({ campaigns: rawCampaigns, bleedingCampaigns, starCampaigns }) {
  const [campaignSort, setCampaignSort] = useState("spend");
  const [campaignSortDir, setCampaignSortDir] = useState(-1);
  const [isCopyConfirmed, setIsCopyConfirmed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const copyResetTimerRef = useRef(0);

  const campaigns = useMemo(
    () => sortCampaignRows(rawCampaigns, campaignSort, campaignSortDir),
    [rawCampaigns, campaignSort, campaignSortDir],
  );

  const sortedBleedingCampaigns = useMemo(
    () => sortCampaignRows(bleedingCampaigns, campaignSort, campaignSortDir),
    [bleedingCampaigns, campaignSort, campaignSortDir],
  );
  const sortedStarCampaigns = useMemo(
    () => sortCampaignRows(starCampaigns, campaignSort, campaignSortDir),
    [starCampaigns, campaignSort, campaignSortDir],
  );

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

  const handleSummarySort = (column) => {
    startTransition(() => {
      if (campaignSort === column.key) {
        setCampaignSortDir((currentDirection) => currentDirection * -1);
        return;
      }

      setCampaignSort(column.key);
      setCampaignSortDir(column.type === "number" ? -1 : 1);
    });
  };

  const handleCopySummary = async () => {
    const headers = CAMPAIGN_SUMMARY_COLUMNS.map((column) => column.label);
    const payload = [
      headers.join("\t"),
      ...campaigns.map((row) =>
        CAMPAIGN_SUMMARY_COLUMNS.map((column) => column.format(row)).join("\t"),
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
    const headers = CAMPAIGN_SUMMARY_COLUMNS.map((column) => column.label);
    const rowsForExport = campaigns.map((row) =>
      CAMPAIGN_SUMMARY_COLUMNS.reduce((acc, column) => {
        acc[column.label] = column.format(row);
        return acc;
      }, {}),
    );

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(rowsForExport, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Campaign Summary");
    const dateStamp = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `${CAMPAIGN_SUMMARY_EXPORT_NAME}-${dateStamp}.xlsx`);
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
                {sortedBleedingCampaigns.slice(0, 8).map((campaign) => (
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
            <Badge label={String(starCampaigns.length)} color="#2f3744" />
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
                {sortedStarCampaigns.slice(0, 8).map((campaign) => (
                  <tr key={campaign.key}>
                    <Td>
                      <div className="table-title">{cleanCampaignName(campaign.key)}</div>
                      <Badge label={campaign.brand} color={BRAND_COLORS[campaign.brand]} />
                    </Td>
                    <Td right>{fmt.inr(campaign.spend)}</Td>
                    <Td right>{fmt.inr(campaign.gmv)}</Td>
                    <Td right accent color="#2f3744">
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

      <SectionHeader
        title="All campaigns"
        sub="Full campaign register for deeper checks."
        action={
          <div className="table-actions">
            <button
              type="button"
              className={`ghost-button table-action-copy${isCopyConfirmed ? " is-copied" : ""}`}
              onClick={handleCopySummary}
              disabled={!campaigns.length}
            >
              Copy table
              <span className="table-action-copy__tick" aria-hidden="true">✓</span>
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportSummary}
              disabled={!campaigns.length}
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
              {CAMPAIGN_SUMMARY_COLUMNS.map((column) => (
                <Th key={column.key} right={column.right}>
                  <button
                    type="button"
                    className={`table-sort-button${campaignSort === column.key ? " is-active" : ""}`}
                    onClick={() => handleSummarySort(column)}
                  >
                    {column.label}
                    {campaignSort === column.key ? (campaignSortDir === -1 ? " ↓" : " ↑") : ""}
                  </button>
                </Th>
              ))}
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

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  BRAND_COLORS,
  ROAS_TARGET,
  createMetricAccumulator,
  finalizeAccumulator,
  finalizeBuckets,
  fmt,
  formatRangeDate,
  formatShortDate,
  mergeRowIntoAccumulator,
  orderByMetric,
  roasTone,
  updateBucket,
} from "./lib/metrics.js";
import {
  Badge,
  DateFilterBar,
  MetricCard,
} from "./lib/ui.jsx";
import OverviewTab from "./tabs/OverviewTab.jsx";
import BrandsTab from "./tabs/BrandsTab.jsx";
import AdTypesTab from "./tabs/AdTypesTab.jsx";
import CampaignsTab from "./tabs/CampaignsTab.jsx";
import KeywordsTab from "./tabs/KeywordsTab.jsx";
import ProductsTab from "./tabs/ProductsTab.jsx";
import MatchTypeTab from "./tabs/MatchTypeTab.jsx";
import GeoTab from "./tabs/GeoTab.jsx";

export default function Dashboard({ data, onReset }) {
  const allDates = useMemo(() => [...new Set(data.map((row) => row.date))].sort(), [data]);
  const [startDate, setStartDate] = useState(allDates[0]);
  const [endDate, setEndDate] = useState(allDates[allDates.length - 1]);
  const [brandFilter, setBrandFilter] = useState("All");
  const [tab, setTab] = useState("overview");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let rows = data.filter((row) => row.date >= startDate && row.date <= endDate);
    if (brandFilter !== "All") {
      rows = rows.filter((row) => row.brand === brandFilter);
    }
    return rows;
  }, [brandFilter, data, endDate, startDate]);

  // Single-pass aggregation: build all bucket maps, but only finalize what the
  // active tab actually needs. The raw Maps are cheap (just accumulation);
  // finalizeBuckets() is where KPI derivation runs per-bucket.

  const groupedData = useMemo(() => {
    const totals = createMetricAccumulator("total");
    const dailyMap = new Map();
    const brandMap = new Map();
    const adtypeMap = new Map();
    const campaignMap = new Map();
    const keywordMap = new Map();
    const productMap = new Map();
    const matchTypeMap = new Map();
    const cityMap = new Map();
    let activeSpendRows = 0;

    filtered.forEach((row) => {
      mergeRowIntoAccumulator(totals, row);
      if (row.spend > 0) activeSpendRows += 1;

      updateBucket(dailyMap, row.date, row);
      updateBucket(brandMap, row.brand, row);
      updateBucket(adtypeMap, row.adtype, row);
      updateBucket(campaignMap, row.campaign, row, { brand: row.brand, adtype: row.adtype }, { skipBlank: true });
      updateBucket(keywordMap, row.keyword, row, { brand: row.brand }, { skipNan: true });
      updateBucket(productMap, row.product, row, { brand: row.brand }, { skipBlank: true });
      updateBucket(matchTypeMap, row.matchType, row, {}, { skipBlank: true });
      updateBucket(cityMap, row.city, row);
    });

    return {
      kpis: finalizeAccumulator(totals),
      activeSpendRows,
      daily: finalizeBuckets(dailyMap)
        .map((item) => ({
          ...item,
          rawDate: item.key,
          label: formatShortDate(item.key),
        }))
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate)),
      brands: finalizeBuckets(brandMap),
      adtypes: finalizeBuckets(adtypeMap),
      campaigns: finalizeBuckets(campaignMap),
      keywords: finalizeBuckets(keywordMap),
      products: finalizeBuckets(productMap),
      matchTypes: finalizeBuckets(matchTypeMap),
      cities: finalizeBuckets(cityMap),
    };
  }, [filtered]);

  const kpis = groupedData.kpis;
  const daily = groupedData.daily;
  const brands = useMemo(() => orderByMetric(groupedData.brands, "spend"), [groupedData.brands]);
  const adtypes = useMemo(() => orderByMetric(groupedData.adtypes, "spend"), [groupedData.adtypes]);

  const bleedingCampaigns = useMemo(
    () =>
      groupedData.campaigns
        .filter((campaign) => campaign.roas < ROAS_TARGET && campaign.spend > 500)
        .sort((a, b) => a.roas - b.roas),
    [groupedData.campaigns],
  );

  const starCampaigns = useMemo(
    () =>
      groupedData.campaigns
        .filter((campaign) => campaign.roas >= 5)
        .sort((a, b) => b.roas - a.roas),
    [groupedData.campaigns],
  );

  const bleedingKeywords = useMemo(
    () =>
      groupedData.keywords
        .filter((keyword) => keyword.roas < 1.5 && keyword.spend > 300)
        .sort((a, b) => b.spend - a.spend),
    [groupedData.keywords],
  );

  const starKeywords = useMemo(
    () =>
      groupedData.keywords
        .filter((keyword) => keyword.roas >= 10)
        .sort((a, b) => b.roas - a.roas),
    [groupedData.keywords],
  );

  const allBrands = useMemo(
    () => ["All", ...new Set(data.map((row) => row.brand))].filter(Boolean),
    [data],
  );

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "brands", label: "Brands" },
    { key: "adtype", label: "Ad types" },
    { key: "campaigns", label: "Campaigns", badge: bleedingCampaigns.length || null },
    { key: "keywords", label: "Keywords", badge: bleedingKeywords.length || null },
    { key: "products", label: "Products" },
    { key: "matchtype", label: "Match type" },
    { key: "cities", label: "Geo" },
  ];

  const roasStatus = roasTone(kpis.roas);

  const handleDateRange = useCallback((start, end) => {
    startTransition(() => {
      setStartDate(start);
      setEndDate(end);
    });
  }, []);

  const handleDatePreset = useCallback((start, end) => {
    startTransition(() => {
      setStartDate(start);
      setEndDate(end);
    });
  }, []);

  return (
    <div className={`dashboard-page${isPending ? " is-pending" : ""}`}>
      <div className="dashboard-topbar-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__main">
            <div className="dashboard-brand">
              <div className="dashboard-brand__mark">IS</div>
              <div>
                <p className="eyebrow">InstaSmarty analytics workspace</p>
                <h1 className="dashboard-title">InstaSmarty</h1>
              </div>
            </div>

            <div className="dashboard-meta">
              <div className="dashboard-meta__item">
                <span>Active range</span>
                <strong>
                  {formatRangeDate(startDate)} to {formatRangeDate(endDate)}
                </strong>
              </div>
              <div className="dashboard-meta__item">
                <span>Selected rows</span>
                <strong>{fmt.num(filtered.length)}</strong>
              </div>
              {isPending ? (
                <div className="dashboard-meta__item dashboard-meta__item--pending">
                  <span>Status</span>
                  <strong>Updating…</strong>
                </div>
              ) : null}
              <button type="button" className="primary-button secondary" onClick={onReset}>
                Upload another CSV
              </button>
            </div>
          </div>

          <div className="dashboard-toolbar">
            <div className="toolbar-block">
              <span className="toolbar-label">Brand filters</span>
              <div className="toolbar-pills">
                {allBrands.map((brand) => {
                  const color = BRAND_COLORS[brand] || "#b47a33";
                  return (
                    <button
                      key={brand}
                      type="button"
                      className={`pill-button${brandFilter === brand ? " is-active" : ""}`}
                      style={
                        brandFilter === brand
                          ? {
                              "--pill-bg": `${color}16`,
                              "--pill-border": `${color}2d`,
                              "--pill-text": color,
                            }
                          : undefined
                      }
                      onClick={() => {
                        startTransition(() => {
                          setBrandFilter(brand);
                        });
                      }}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="toolbar-block toolbar-block--wide">
              <span className="toolbar-label">Date range</span>
              <DateFilterBar
                dates={allDates}
                start={startDate}
                end={endDate}
                onRange={handleDateRange}
                onPreset={handleDatePreset}
              />
            </div>
          </div>

          <div className="tab-row">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`tab-button${tab === item.key ? " is-active" : ""}`}
                onClick={() => {
                  startTransition(() => {
                    setTab(item.key);
                  });
                }}
              >
                <span>{item.label}</span>
                {item.badge ? <Badge label={String(item.badge)} color="#b47a33" /> : null}
              </button>
            ))}
          </div>
        </header>
      </div>

      <section className="summary-grid">
        <MetricCard
          label="Blended ROAS"
          value={fmt.x(kpis.roas)}
          sub={kpis.roas < ROAS_TARGET ? `Below ${ROAS_TARGET}x target` : `Ahead of ${ROAS_TARGET}x target`}
          accent={roasStatus.color}
          toneLabel={roasStatus.label}
          featured
        />
        <MetricCard
          label="Total spend"
          value={fmt.inr(kpis.spend)}
          sub={`${fmt.num(groupedData.activeSpendRows)} active rows`}
          accent="#b47a33"
        />
        <MetricCard
          label="Total GMV"
          value={fmt.inr(kpis.gmv)}
          sub={`AOV ${fmt.inr(kpis.aov)}`}
          accent="#2f3744"
        />
        <MetricCard
          label="Impressions"
          value={fmt.num(kpis.imp)}
          sub={`CPM ${fmt.inr2(kpis.cpm)}`}
          accent="#66758a"
        />
        <MetricCard
          label="Clicks"
          value={fmt.num(kpis.clks)}
          sub={`CTR ${fmt.pct(kpis.ctr)} · CPC ${fmt.inr2(kpis.cpc)}`}
          accent="#8d8479"
        />
        <MetricCard
          label="Add to carts"
          value={fmt.num(kpis.a2c)}
          sub={`ATCR ${fmt.pct(kpis.atcr)}`}
          accent="#66758a"
        />
        <MetricCard
          label="Conversions"
          value={fmt.num(kpis.conv)}
          sub={`CVR ${fmt.pct(kpis.cvr)} · CPO ${fmt.inr(kpis.cpo)}`}
          accent="#b47a33"
        />
        <MetricCard
          label="Direct GMV 7D"
          value={fmt.inr(kpis.gmv7)}
          sub="Attribution snapshot"
          accent="#2f3744"
        />
      </section>

      {tab === "overview" && (
        <OverviewTab
          daily={daily}
          bleedingCampaigns={bleedingCampaigns}
          starKeywords={starKeywords}
        />
      )}

      {tab === "brands" && (
        <BrandsTab brands={brands} kpis={kpis} />
      )}

      {tab === "adtype" && (
        <AdTypesTab adtypes={adtypes} />
      )}

      {tab === "campaigns" && (
        <CampaignsTab
          campaigns={groupedData.campaigns}
          bleedingCampaigns={bleedingCampaigns}
          starCampaigns={starCampaigns}
        />
      )}

      {tab === "keywords" && (
        <KeywordsTab
          keywords={groupedData.keywords}
          bleedingKeywords={bleedingKeywords}
          starKeywords={starKeywords}
        />
      )}

      {tab === "products" && (
        <ProductsTab products={groupedData.products} />
      )}

      {tab === "matchtype" && (
        <MatchTypeTab matchTypes={groupedData.matchTypes} />
      )}

      {tab === "cities" && (
        <GeoTab cities={groupedData.cities} />
      )}

      <footer className="dashboard-credit" aria-label="Dashboard credits">
        <p className="dashboard-credit__message">Made with ❤️ by Varun &amp; Sarthak</p>
      </footer>
    </div>
  );
}

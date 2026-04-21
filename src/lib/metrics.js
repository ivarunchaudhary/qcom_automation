// Color maps

export const BRAND_COLORS = {
  NIC: "#e66a2c",
  Grameen: "#14976e",
  CP: "#4d61ff",
  Other: "#b4933f",
};

export const ADTYPE_COLORS = {
  "Keyword Based Ads": "#e66a2c",
  "Search Inline Banner": "#4d61ff",
  "Browse Boost Item Ads": "#14976e",
  YGTI: "#b4933f",
};

export const MT_COLORS = {
  KEYWORD_MATCH_TYPE_BROAD: "#e66a2c",
  KEYWORD_MATCH_TYPE_EXACT: "#14976e",
  KEYWORD_MATCH_TYPE_INVALID: "#9a8e83",
};

export const MT_LABELS = {
  KEYWORD_MATCH_TYPE_BROAD: "Broad",
  KEYWORD_MATCH_TYPE_EXACT: "Exact",
  KEYWORD_MATCH_TYPE_INVALID: "Invalid",
};

// Thresholds and limits

export const ROAS_TARGET = 3.5;
export const TABLE_PREVIEW_LIMIT = 60;

// Chart style constants

export const CHART_GRID = "#ebe3d8";
export const CHART_AXIS = "#7d736a";
export const CHART_TEXT = "#5c544d";
export const chartLegendStyle = { fontSize: 12, color: CHART_TEXT };
export const axisTick = { fill: CHART_AXIS, fontSize: 11 };

// Math helpers

export const safe = (n, d = 0) => (Number.isNaN(n) || !Number.isFinite(n) ? d : n);
export const pct = (a, b) => safe((b > 0 ? a / b : 0) * 100, 0);
export const div = (a, b) => safe((b > 0 ? a / b : 0), 0);

// Formatters

export const fmt = {
  inr: (v) =>
    v >= 1e5
      ? `₹${(v / 1e5).toFixed(1)}L`
      : v >= 1e3
        ? `₹${(v / 1e3).toFixed(1)}K`
        : `₹${Math.round(v)}`,
  inrFull: (v) =>
    `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
  inr2: (v) => `₹${Number(v).toFixed(2)}`,
  x: (v) => `${Number(v).toFixed(2)}x`,
  pct: (v) => `${Number(v).toFixed(2)}%`,
  num: (v) => Number(v).toLocaleString("en-IN"),
};

// Date helpers

export function parseIsoDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function shiftIsoDate(dateString, delta) {
  const date = parseIsoDate(dateString);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function formatRangeDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(dateString));
}

export function formatShortDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseIsoDate(dateString));
}

// Display cleaners

export function cleanCampaignName(name) {
  return (name || "")
    .replace(/^1DS X?x?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanAdTypeLabel(value) {
  return (value || "Unknown")
    .replace(" Based Ads", "")
    .replace(" Item Ads", "")
    .replace(" Inline Banner", " Banner")
    .replace(" Boost", "");
}

export function cleanProductName(name) {
  return (name || "")
    .replace(/^(nic|grameen|cream pot|cp)\s+ice cream\s+/i, "")
    .replace(/^frozen dessert\s+/i, "")
    .trim();
}

export function roasTone(roas) {
  if (roas < 1) return { color: "#c63d2f", label: "Critical" };
  if (roas < ROAS_TARGET) return { color: "#c78514", label: "Watch" };
  if (roas >= 6) return { color: "#14976e", label: "Strong" };
  return { color: "#a76f0a", label: "Stable" };
}

// Aggregation engine

export function createMetricAccumulator(key, meta = {}) {
  return {
    key,
    spend: 0,
    gmv: 0,
    imp: 0,
    clks: 0,
    a2c: 0,
    conv: 0,
    gmv7: 0,
    gmv14: 0,
    ...meta,
  };
}

export function mergeRowIntoAccumulator(acc, row) {
  acc.spend += row.spend;
  acc.gmv += row.gmv;
  acc.imp += row.impressions;
  acc.clks += row.clicks;
  acc.a2c += row.a2c;
  acc.conv += row.conversions;
  acc.gmv7 += row.gmv7;
  acc.gmv14 += row.gmv14;
}

export function finalizeAccumulator(acc) {
  return {
    ...acc,
    roas: safe(div(acc.gmv, acc.spend), 0),
    ctr: safe(pct(acc.clks, acc.imp), 0),
    cpm: safe(div(acc.spend, acc.imp) * 1000, 0),
    cpc: safe(div(acc.spend, acc.clks), 0),
    atcr: safe(pct(acc.a2c, acc.imp), 0),
    cvr: safe(pct(acc.conv, acc.a2c), 0),
    cpo: safe(div(acc.spend, acc.conv), 0),
    aov: safe(div(acc.gmv, acc.conv), 0),
  };
}

export function updateBucket(map, rawKey, row, meta = {}, options = {}) {
  const key = rawKey || "Unknown";
  if (options.skipBlank && !rawKey) return;
  if (options.skipNan && (!rawKey || rawKey === "nan")) return;

  let bucket = map.get(key);
  if (!bucket) {
    bucket = createMetricAccumulator(key, meta);
    map.set(key, bucket);
  } else {
    Object.entries(meta).forEach(([metaKey, metaValue]) => {
      if ((bucket[metaKey] === undefined || bucket[metaKey] === "") && metaValue) {
        bucket[metaKey] = metaValue;
      }
    });
  }

  mergeRowIntoAccumulator(bucket, row);
}

export function finalizeBuckets(map) {
  return Array.from(map.values(), (bucket) => finalizeAccumulator(bucket));
}

export function orderByMetric(rows, metric, dir = -1) {
  return [...rows].sort((a, b) => dir * ((a[metric] || 0) - (b[metric] || 0)));
}

// Config arrays

export const DAILY_METRICS = [
  { key: "roas", label: "ROAS", format: fmt.x },
  { key: "spend", label: "Spend", format: fmt.inr },
  { key: "gmv", label: "GMV", format: fmt.inr },
  { key: "imp", label: "Impressions", format: fmt.num },
  { key: "ctr", label: "CTR", format: fmt.pct },
  { key: "cpm", label: "CPM", format: fmt.inr2 },
  { key: "cpc", label: "CPC", format: fmt.inr2 },
  { key: "atcr", label: "ATCR", format: fmt.pct },
  { key: "cvr", label: "CVR", format: fmt.pct },
  { key: "aov", label: "AOV", format: fmt.inr },
  { key: "cpo", label: "CPO", format: fmt.inr },
  { key: "a2c", label: "ATC", format: fmt.num },
  { key: "conv", label: "Conversions", format: fmt.num },
];

export const CAMPAIGN_SORT_OPTIONS = ["spend", "gmv", "roas", "cpo", "conv"];
export const KEYWORD_SORT_OPTIONS = ["spend", "roas", "conv", "ctr", "atcr"];
export const PRODUCT_SORT_OPTIONS = ["spend", "gmv", "roas", "conv", "aov", "a2c"];

export const MATCH_TYPE_NOTES = [
  {
    key: "KEYWORD_MATCH_TYPE_BROAD",
    title: "Broad match",
    notes: [
      "Use it for discovery and coverage, but monitor spend tightly.",
      "Add negatives to reduce wasted reach on irrelevant intent.",
      "Trim when ROAS stays below target after search-term cleanup.",
    ],
  },
  {
    key: "KEYWORD_MATCH_TYPE_EXACT",
    title: "Exact match",
    notes: [
      "Best home for proven intent and budget scaling.",
      "Prioritize exact on terms already showing quality conversion.",
      "Mine high-performing terms here for more budget confidence.",
    ],
  },
  {
    key: "KEYWORD_MATCH_TYPE_INVALID",
    title: "Invalid match",
    notes: [
      "Review in-platform because these may reflect auto-matched traffic.",
      "Move strong terms into a cleaner exact structure where possible.",
      "Keep this share limited unless there is clear value in the output.",
    ],
  },
];

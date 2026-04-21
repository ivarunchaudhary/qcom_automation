import { lazy, Suspense, useRef, useState, useTransition } from "react";

const Dashboard = lazy(() => import("./dashboard.jsx"));

const UPLOAD_FEATURES = [
  "Daily efficiency tracking across spend, GMV, and blended ROAS.",
  "Brand, ad-type, and keyword cuts with clear action prompts.",
  "Cleaner product, match-type, and city views for quick operator scans.",
];

function stripToMetricsHeader(chunk) {
  const lines = chunk.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.includes("METRICS_DATE"));

  return headerIndex === -1 ? chunk : lines.slice(headerIndex).join("\n");
}

async function parseInstamartFile(file) {
  const { default: Papa } = await import("papaparse");
  const rawText = await file.text();
  const csvText = stripToMetricsHeader(rawText);

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        if (!results.meta.fields?.includes("METRICS_DATE")) {
          reject(new Error("Could not find the Instamart metrics header row."));
          return;
        }

        const rows = results.data.filter((row) =>
          Object.values(row).some((value) => String(value || "").trim()),
        );

        resolve(rows);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

function extractBrand(name) {
  const value = (name || "").toUpperCase();
  if (value.includes("1DS X NIC") || value.includes("X NIC X") || value.startsWith("NIC")) {
    return "NIC";
  }
  if (value.includes("GRAMEEN") || value.includes("GRAMMEN")) {
    return "Grameen";
  }
  if (value.includes("1DS X CP") || value.includes("X CP X")) {
    return "CP";
  }
  return "Other";
}

function parseNumber(value) {
  return parseFloat(String(value).replace("%", "")) || 0;
}

function processRows(rows) {
  return rows.map((row) => ({
    date: row.METRICS_DATE || "",
    campaign: row.CAMPAIGN_NAME || "",
    brand: extractBrand(row.CAMPAIGN_NAME),
    adtype: row.AD_PROPERTY || "",
    keyword: row.KEYWORD || "",
    matchType: row.MATCH_TYPE || "",
    product: row.PRODUCT_NAME || "",
    city: row.CITY || "",
    l1: row.L1_CATEGORY || "",
    l2: row.L2_CATEGORY || "",
    impressions: parseNumber(row.TOTAL_IMPRESSIONS),
    clicks: parseNumber(row.TOTAL_CLICKS),
    spend: parseNumber(row.TOTAL_BUDGET_BURNT),
    gmv: parseNumber(row.TOTAL_GMV),
    a2c: parseNumber(row.TOTAL_A2C),
    conversions: parseNumber(row.TOTAL_CONVERSIONS),
    budget: parseNumber(row.TOTAL_BUDGET),
    ecpm: parseNumber(row.eCPM),
    ecpc: parseNumber(row.eCPC),
    gmv7: parseNumber(row.TOTAL_DIRECT_GMV_7_DAYS),
    gmv14: parseNumber(row.TOTAL_DIRECT_GMV_14_DAYS),
  }));
}

function DashboardLoadingState() {
  return (
    <div className="upload-page upload-page--loading">
      <div className="upload-panel dashboard-loading">
        <p className="eyebrow">Preparing workspace</p>
        <h2 className="upload-panel__title">Loading analytics surface</h2>
        <p className="upload-panel__sub">
          Splitting the dashboard into an on-demand chunk keeps the first load lighter.
        </p>
      </div>
    </div>
  );
}

function UploadScreen({ onLoad, isPending }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const rows = await parseInstamartFile(file);
      if (!rows?.length) {
        setError("Could not parse the CSV. Use the Instamart granular export file.");
        setLoading(false);
        return;
      }

      const processed = processRows(rows);
      if (!processed.length) {
        setError("No usable rows were found in the uploaded file.");
        setLoading(false);
        return;
      }

      onLoad(processed);
    } catch (errorMessage) {
      setError(`Parse error: ${errorMessage.message}`);
      setLoading(false);
    }
  };

  const isBusy = loading || isPending;

  return (
    <div className="upload-page">
      <div className="upload-layout">
        <section className="upload-hero">
          <div className="upload-mark">IS</div>
          <div className="upload-copy">
            <p className="eyebrow">InstaSmarty performance workspace</p>
            <h1 className="upload-title">
              InstaSmarty
            </h1>
            <p className="upload-subtitle">
              Drop in the Swiggy Instamart granular export and review a sharper,
              lighter dashboard built for daily optimization.
            </p>
          </div>

          <div className="upload-notes">
            {UPLOAD_FEATURES.map((item) => (
              <div key={item} className="upload-note">
                <span className="upload-note__dot" />
                <p>{item}</p>
              </div>
            ))}
          </div>

          <div className="upload-preview">
            <div className="upload-preview__grid">
              <div>
                <span className="upload-preview__label">Core views</span>
                <strong>8 analytical tabs</strong>
              </div>
              <div>
                <span className="upload-preview__label">Signals</span>
                <strong>Bleeders and scale picks</strong>
              </div>
              <div>
                <span className="upload-preview__label">Output</span>
                <strong>Cleaner charts and calmer tables</strong>
              </div>
              <div>
                <span className="upload-preview__label">Mode</span>
                <strong>Light theme, operator-first</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="upload-panel">
          <div>
            <p className="eyebrow">Upload dataset</p>
            <h2 className="upload-panel__title">Start with a granular CSV export</h2>
            <p className="upload-panel__sub">
              The file is parsed locally in the browser. Nothing leaves this workspace.
            </p>
          </div>

          <button
            type="button"
            className={`dropzone${dragging ? " is-dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFile(event.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {isBusy ? (
              <>
                <span className="dropzone__icon">Loading</span>
                <strong>Processing your file</strong>
                <p>Parsing rows and opening the dashboard.</p>
              </>
            ) : (
              <>
                <span className="dropzone__icon">CSV</span>
                <strong>Drop the export here or browse</strong>
                <p>Expected input: Instamart granular report in `.csv` format.</p>
              </>
            )}
          </button>

          {error ? <p className="error-copy">{error}</p> : null}

        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [isPending, startTransition] = useTransition();

  if (!data) {
    return (
      <UploadScreen
        isPending={isPending}
        onLoad={(nextData) => {
          startTransition(() => {
            setData(nextData);
          });
        }}
      />
    );
  }

  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <Dashboard data={data} onReset={() => setData(null)} />
    </Suspense>
  );
}

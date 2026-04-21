# Instamart Dashboard Project Status

Analysis date: 2026-04-21

## Purpose

This repository is a frontend-only React + Vite dashboard for analyzing Swiggy Instamart ads data from a granular CSV export. The current app is positioned as a polished internal analytics prototype rather than a production-ready product.

Important context:

- This workspace is **not** a Git checkout, so this assessment is based only on the files currently present.
- Most of the real product work lives in a single file: `src/app.jsx` (`1205` lines).
- Total authored files excluding `node_modules` and `dist`: `13`.

## Current Build Of The Project

What exists today:

- A working single-page dashboard flow built in React.
- CSV upload and in-browser parsing.
- Data normalization and metric aggregation helpers.
- Interactive dashboard views with charts, KPI cards, filters, and tables.
- No backend, authentication, persistence, API layer, tests, or deployment setup beyond default Vite scaffolding.

High-level completion estimate:

| Area | Status | Notes |
| --- | --- | --- |
| App scaffold | Done | Vite app boots from `src/main.jsx`. |
| CSV ingestion | Mostly done | Reads local CSV and maps Instamart columns into a normalized row shape. |
| Analytics UI | Mostly done | Multiple tabs, KPIs, charts, tables, and filtering are implemented. |
| Productization | Partially done | Good demo quality, but not hardened for production use. |
| Testing | Not done | No unit, integration, or E2E coverage. |
| Documentation | Barely done | Default Vite `README.md` was still present before this document. |
| Backend / persistence | Not done | Entirely client-side. |

Practical estimate:

- Prototype / demo completeness: about `75-85%`
- Production readiness: about `20-30%`

## File Map

Primary authored files:

- `src/app.jsx`: almost all product logic and UI
- `src/main.jsx`: React entry point
- `src/index.css`: mostly leftover Vite/global styling
- `package.json`: minimal scripts and dependencies
- `vite.config.js`: default Vite config
- `eslint.config.js`: default-ish ESLint config
- `index.html`: standard Vite HTML shell
- `README.md`: still default Vite template text

Secondary assets:

- `public/favicon.svg`
- `public/icons.svg`
- `src/assets/hero.png`
- `src/assets/react.svg`
- `src/assets/vite.svg`

Observed dead or likely-unused assets:

- `src/assets/hero.png`
- `src/assets/react.svg`
- `src/assets/vite.svg`
- `public/icons.svg`

## Architecture Summary

The app uses a simple client-side flow:

1. `App()` shows an upload screen until CSV data is loaded.
2. `UploadScreen` reads a local `.csv` file via `FileReader`.
3. `parseInstamart()` locates the `METRICS_DATE` header row and parses rows into plain objects.
4. `processRows()` normalizes source fields into a predictable analytics row shape.
5. `Dashboard` derives all summaries with `useMemo` and renders analytics tabs using Recharts.

There is no routing and no component hierarchy beyond a few helper components inside the same file.

## Work Already Done

### 1. CSV ingestion and normalization

Implemented:

- CSV upload screen with drag-and-drop and file picker.
- File parsing for Instamart granular export format.
- Normalized row model with fields for date, campaign, brand, ad type, keyword, match type, product, city, category, impressions, clicks, spend, GMV, A2C, conversions, budgets, and attribution GMV windows.
- Brand inference via `extractBrand()` for NIC, Grameen, CP, and fallback `Other`.

Notes:

- Parsing is custom and lightweight.
- It handles quoted commas with `smartSplit()`, but it is not a full CSV parser and may break on more complex exports such as multiline quoted values.

### 2. Metrics and analytics engine

Implemented:

- Aggregate metrics for spend, GMV, impressions, clicks, A2C, conversions, 7-day GMV, and 14-day GMV.
- Derived KPIs: RoAS, CTR, CPM, CPC, ATCR, CVR, CPO, and AOV.
- Generic grouping helpers to aggregate by date, brand, ad type, campaign, keyword, product, match type, and city.

This part is reasonably complete for a frontend prototype.

### 3. Main dashboard experience

Implemented:

- Top bar with dataset date range and row count.
- Brand filter pills.
- Date range filter with presets: `All`, `Last 7D`, `Last 14D`, `This Month`.
- KPI cards for core performance metrics.
- Tabbed navigation across major analysis views.

### 4. Analytics views

Implemented tabs:

- `Overview`
  - Daily metric trend chart
  - Daily spend vs GMV chart
  - Daily summary table
  - Action items for bleeding campaigns and star keywords
- `Brands`
  - Brand cards
  - Brand RoAS comparison
  - Spend distribution pie chart
  - Brand radar chart
- `Ad Types`
  - Ad type KPI cards
  - Spend vs GMV chart
  - RoAS comparison chart
- `Campaigns`
  - Sortable campaign register
  - Bleeding and star campaign tables
  - Spend vs RoAS scatter plot
  - Full campaign table
- `Keywords`
  - Keyword bleeders and stars
  - Top keywords by spend
  - Full keyword table
- `Products`
  - Sortable product view
  - Top products chart
  - Full product table
- `Match Type`
  - Match type KPI cards
  - Spend vs GMV chart
  - Funnel metrics chart
  - Heuristic recommendation cards
- `Geo`
  - Top cities by spend
  - Top cities by RoAS
  - Full city table

This is the strongest part of the project and represents most of the work already done.

## What Looks Incomplete Or Fragile

### Engineering structure

- Almost the entire application is in `src/app.jsx`.
- Parsing, transformations, UI atoms, dashboard state, and every analytics view are tightly coupled.
- This makes the project harder to maintain, test, and extend.

### Build and environment health

Current checks in this workspace:

- `node node_modules/eslint/bin/eslint.js .` fails with `3` errors:
  - unused `useCallback`
  - unused `onReset`
  - unused `setOnReset`
- `node node_modules/vite/bin/vite.js build` fails because the installed `node_modules` is missing the native Rolldown binding package:
  - missing `@rolldown/binding-darwin-arm64`

Additional portability risk:

- `src/main.jsx` imports `./App.jsx`, but the actual file is `src/app.jsx`.
- This may work on a case-insensitive filesystem like the current macOS workspace, but it is a likely failure on case-sensitive environments and CI.

### Styling consistency

- The actual dashboard UI is built almost entirely with inline styles in `src/app.jsx`.
- `src/index.css` still contains generic Vite starter styling and naming.
- That creates split ownership of layout/styling and can cause confusing side effects.

### Missing product capabilities

Not implemented:

- Saved uploads or persisted datasets
- Export of reports, tables, or charts
- Shareable URLs / state persistence
- Backend API
- Authentication / user management
- Error monitoring
- Loading skeletons beyond basic upload feedback
- Empty-state UX for sparse datasets
- Data validation/reporting for malformed CSVs

### Testing and quality controls

Not implemented:

- Unit tests for parser and aggregation helpers
- Snapshot or interaction tests for dashboard views
- E2E tests for CSV upload and analytics flow
- Schema validation for expected Instamart columns

## Specific Technical Observations

These are useful for future work:

- The project depends only on `react`, `react-dom`, and `recharts`.
- There is no state management library; local component state and `useMemo` are sufficient for the current scope.
- Metric calculations are centralized and reusable enough to extract into a `utils/metrics` module later.
- Brand classification is heuristic and string-based; it should eventually become configurable.
- The dashboard currently assumes the CSV contains clean numeric values and a consistent column set.
- The UI is visually rich, but responsive behavior is mostly handled through flexible grids rather than a deliberate mobile layout system.

## Recommended Next Steps

Priority order:

1. Fix environment and build health.
   - Reinstall dependencies cleanly so Vite can build.
   - Fix filename casing: `App.jsx` vs `app.jsx`.
   - Remove unused state/imports so lint passes.

2. Split the monolith.
   - Extract parser helpers.
   - Extract metric helpers.
   - Break dashboard tabs into separate components.

3. Add data validation.
   - Validate required CSV headers up front.
   - Show clear messages for malformed or incompatible files.

4. Add tests.
   - Parser tests
   - Aggregation tests
   - One upload-to-dashboard integration test

5. Clean project scaffolding.
   - Replace default `README.md`
   - Remove unused assets
   - Consolidate styling strategy

## Bottom Line

This project is not an empty scaffold. A substantial amount of dashboard product work has already been completed, especially in analytics modeling and frontend presentation.

The current state is best described as:

- a strong single-user analytics prototype
- with a lot of implemented UI and reporting logic
- but still missing the engineering hardening needed for reliable production use

If future work resumes from this repository, the next phase should focus less on adding new tabs and more on stabilization, modularization, validation, and test coverage.

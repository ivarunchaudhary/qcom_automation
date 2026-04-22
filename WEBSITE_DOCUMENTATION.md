# InstaSmarty Website Documentation

## Purpose

This document only covers the website's core logic and functionality.

The website is a frontend-only analytics dashboard for Swiggy Instamart granular advertising exports.

Main flow:

1. User uploads an Instamart CSV file.
2. The app parses the file locally in the browser.
3. Rows are normalized into a consistent internal format.
4. The dashboard computes totals, grouped summaries, and performance metrics.
5. The user explores the data through filters, KPI cards, charts, and tables across 8 tabs.

## Application Flow

### 1. Initial state

The app starts on an upload screen.

It stays there until a valid CSV is loaded.

### 2. File upload

The user can:

- drag and drop a `.csv` file
- click the upload area and pick a `.csv` file manually

### 3. CSV parsing

The file is parsed locally in the browser.

Processing steps:

1. The app reads the raw file text.
2. It trims off anything before the `METRICS_DATE` header row.
3. It parses the CSV with headers.
4. It rejects the file if the Instamart metrics header is missing.
5. It removes empty rows.
6. It converts rows into the app's internal data structure.

The parser also has a timeout so very slow or broken files do not hang forever.

### 4. Dashboard load

Once parsing succeeds, the app switches from the upload screen to the analytics dashboard.

## Expected Input Data

The app expects an Instamart granular export CSV containing at least the metrics header row with `METRICS_DATE`.

Important source columns used by the app:

- `METRICS_DATE`
- `CAMPAIGN_NAME`
- `AD_PROPERTY`
- `KEYWORD`
- `MATCH_TYPE`
- `PRODUCT_NAME`
- `CITY`
- `L1_CATEGORY`
- `L2_CATEGORY`
- `TOTAL_IMPRESSIONS`
- `TOTAL_CLICKS`
- `TOTAL_BUDGET_BURNT`
- `TOTAL_GMV`
- `TOTAL_A2C`
- `TOTAL_CONVERSIONS`
- `TOTAL_BUDGET`
- `eCPM`
- `eCPC`
- `TOTAL_DIRECT_GMV_7_DAYS`
- `TOTAL_DIRECT_GMV_14_DAYS`

## Internal Row Model

Each CSV row is normalized into a consistent object with these main fields:

- `date`
- `campaign`
- `brand`
- `adtype`
- `keyword`
- `matchType`
- `product`
- `city`
- `l1`
- `l2`
- `impressions`
- `clicks`
- `spend`
- `gmv`
- `a2c`
- `conversions`
- `budget`
- `ecpm`
- `ecpc`
- `gmv7`
- `gmv14`

## Brand Classification

Brand is inferred from the campaign name.

Classification rules:

- NIC-like campaign names become `NIC`
- Grameen-like campaign names become `Grameen`
- CP-like campaign names become `CP`
- everything else becomes `Other`

## Core Metrics

The dashboard aggregates and computes these metrics across totals and grouped buckets:

- `spend`
- `gmv`
- `imp` (impressions)
- `clks` (clicks)
- `a2c` (add to carts)
- `conv` (conversions)
- `gmv7`
- `gmv14`
- `roas = gmv / spend`
- `ctr = clicks / impressions * 100`
- `cpm = spend / impressions * 1000`
- `cpc = spend / clicks`
- `atcr = a2c / impressions * 100`
- `cvr = conversions / a2c * 100`
- `cpo = spend / conversions`
- `aov = gmv / conversions`

Important threshold:

- ROAS target: `3.5`

## Dashboard Logic

After filtering the active dataset, the app aggregates the data into these grouped views:

- total KPIs
- daily summaries
- brand summaries
- ad type summaries
- campaign summaries
- keyword summaries
- product summaries
- match type summaries
- city summaries

The dashboard always works from the currently filtered dataset.

## Global Dashboard Controls

### Brand filter

Available options:

- `All`
- one button for each detected brand in the uploaded dataset

### Date filter

The user can change the active date range using:

- `All`
- `Last 7D`
- `Last 14D`
- `This Month`
- manual start date input
- manual end date input

### Tab navigation

The dashboard has 8 tabs:

- `Overview`
- `Brands`
- `Ad types`
- `Campaigns`
- `Keywords`
- `Products`
- `Match type`
- `Geo`

### Reset action

The user can reset the dashboard with:

- `Upload another CSV`

This clears the loaded dataset and returns to the upload screen.

## KPI Cards

The dashboard always shows these top-level KPI cards:

- `Blended ROAS`
- `Total spend`
- `Total GMV`
- `Impressions`
- `Clicks`
- `Add to carts`
- `Conversions`
- `Direct GMV 7D`

## Tab Functionality

## 1. Overview

Purpose:

- monitor day-level performance trends
- compare daily spend vs GMV
- inspect daily summary values

Functionality:

- switch trend metric across daily metrics such as ROAS, spend, GMV, CTR, CPC, CVR, AOV, and others
- view day-on-day trend chart
- view daily spend vs GMV chart
- sort the daily summary table
- copy the daily summary table
- export the daily summary table to XLSX

Daily summary table fields:

- Date
- Spend
- GMV
- ROAS
- Impressions
- Clicks
- CTR
- ATC
- ATCR
- Conv.
- CVR
- CPO
- AOV
- CPC

## 2. Brands

Purpose:

- compare brand-level performance and efficiency

Functionality:

- see one summary card per brand
- compare brands by a selected metric
- view brand distribution for the selected metric
- sort the brand summary table
- copy the brand summary table
- export the brand summary table to XLSX

Brand-level values shown:

- Spend
- GMV
- ROAS
- Impressions
- Clicks
- CTR
- CPM
- CPC
- ATC
- ATCR
- Conversions
- CVR
- CPO
- AOV
- spend share

## 3. Ad Types

Purpose:

- compare advertising format performance

Functionality:

- see one summary card per ad type
- compare spend vs GMV by ad type
- compare ROAS by ad type
- sort the ad type summary table
- copy the ad type summary table
- export the ad type summary table to XLSX

Ad type summary values shown:

- Spend
- GMV
- ROAS
- Impressions
- Clicks
- CTR
- ATC
- ATCR
- Conversions
- CVR
- CPO
- AOV
- CPC

## 4. Campaigns

Purpose:

- identify weak campaigns and strong campaigns
- inspect the full campaign register

Functionality:

- sort campaigns by spend, GMV, ROAS, CPO, or conversions
- view bleeding campaigns
- view star campaigns
- sort the full campaign table
- copy the campaign table
- export the campaign table to XLSX
- expand or collapse the long campaign table

Campaign rules:

- bleeding campaign: `roas < 3.5` and `spend > 500`
- star campaign: `roas >= 5`

Campaign summary fields:

- Campaign
- Spend
- GMV
- ROAS
- Impressions
- Clicks
- ATC
- Conversions
- CPO
- AOV
- CPC
- Health

## 5. Keywords

Purpose:

- identify bad keywords and strong keywords
- inspect the full keyword register

Functionality:

- sort keywords by spend, ROAS, conversions, CTR, or ATCR
- view keyword bleeders
- view power keywords
- view top keywords by spend
- sort the full keyword table
- copy the keyword table
- export the keyword table to XLSX
- expand or collapse the long keyword table

Keyword rules:

- bleeding keyword: `roas < 1.5` and `spend > 300`
- power keyword: `roas >= 10`

Keyword summary fields:

- Keyword
- Spend
- GMV
- ROAS
- Impressions
- Clicks
- CTR
- ATC
- ATCR
- Conversions
- CVR
- CPO
- AOV

## 6. Products

Purpose:

- compare product-level commercial performance
- inspect long-tail product efficiency

Functionality:

- sort products by spend, GMV, ROAS, conversions, AOV, or A2C
- view top products chart using the selected metric
- sort the full product table
- copy the product table
- export the product table to XLSX
- expand or collapse the long product table

Product summary fields:

- Product
- Spend
- GMV
- ROAS
- Impressions
- Clicks
- CTR
- ATC
- ATCR
- Conversions
- CVR
- AOV
- CPO
- Health

## 7. Match Type

Purpose:

- compare exact, broad, and invalid traffic groups
- pair performance with execution guidance

Match type labels used in the UI:

- `KEYWORD_MATCH_TYPE_BROAD` -> `Broad`
- `KEYWORD_MATCH_TYPE_EXACT` -> `Exact`
- `KEYWORD_MATCH_TYPE_INVALID` -> `Invalid`

Functionality:

- see one summary card per match type
- compare spend vs GMV by match type
- compare CTR, ATCR, and CVR by match type
- sort the match type summary table
- copy the match type summary table
- export the match type summary table to XLSX
- read fixed execution notes for each match type

Match type summary fields:

- Match type
- Spend
- GMV
- ROAS
- Impressions
- Clicks
- CTR
- ATC
- ATCR
- Conversions
- CVR
- CPO
- AOV
- CPC

## 8. Geo

Purpose:

- compare city-level scale and efficiency

Functionality:

- view top cities by spend
- view top cities by ROAS
- sort the city summary table
- copy the city summary table
- export the city summary table to XLSX
- expand or collapse the long city table

City summary fields:

- City
- Spend
- GMV
- ROAS
- Impressions
- Clicks
- ATC
- Conversions
- CPO
- AOV
- Health

## Export And Copy Functionality

Several tabs support two table output actions:

- `Copy table`: copies a tab-separated text version of the visible summary data
- `Export XLSX`: downloads the summary as an Excel file

Current export outputs:

- daily summary export
- brand summary export
- ad type summary export
- campaign summary export
- keyword summary export
- product summary export
- match type summary export
- geo summary export

## Current Functional Limitations

The current website does not include:

- backend integration
- user login or authentication
- saved uploads
- persisted dashboard state
- shareable links
- automated tests
- advanced schema validation beyond header presence checks
- server-side reporting or storage

## Core Responsibility Of Main Code Areas

### `src/app.jsx`

Handles:

- upload screen
- file input and drag-drop upload
- CSV parsing entry
- row normalization
- switching into dashboard mode

### `src/dashboard.jsx`

Handles:

- dashboard shell
- date and brand filters
- tab switching
- KPI cards
- grouped data generation
- bleeding/star insight derivation

### `src/lib/metrics.js`

Handles:

- metric math
- date helpers
- formatting helpers
- grouping and aggregation helpers
- thresholds and sort option definitions

### `src/lib/ui.jsx`

Handles:

- shared UI controls such as date filters, badges, metric cards, and table helpers

### `src/tabs/*.jsx`

Each tab file handles:

- tab-specific state
- tab-specific charts
- table sorting
- copy/export actions
- tab-specific summaries and insights

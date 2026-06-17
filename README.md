# Sanctions and Violations

An SAP Fiori application for managing employee sanctions and violations within an HR workflow. Built with SAPUI5 on the Basic V2 template, this app enables Line Managers and HC (Human Capital) staff to track, create, and resolve employee violation records.

## Features

- **Dashboard** — Tabbed view of current (active) and historical (archived) violation records with client-side search and refresh
- **Detail Views** — Read-only and editable detail pages for violation records, including employee info, punch times, incident details, and multi-step workflow status (LM → HC Ops → HC EVP → Legal → CEO)
- **Create Violation** — Comprehensive form to file a new violation with all required payload fields
- **Attendance Regularization** — Dialog to adjust punch in/out times with a reason note
- **Payroll Deduction** — Submit payroll deduction actions directly from the violation detail page
- **HC Portal** — Dedicated view for HC staff to browse all violation history records
- **Dynamic Table Columns** — Table columns are generated dynamically from configuration arrays with sorting, filtering, visibility, and time-field formatting
- **SAP Horizon Theme** — Modern SAP Fiori design

## Architecture

```
zhr_sanctions/
├── webapp/
│   ├── controller/          # MVC Controllers (7 controllers)
│   │   ├── BaseController.js              # Shared utilities for all controllers
│   │   ├── App.controller.js              # App shell controller
│   │   ├── View1.controller.js            # Main dashboard (current/history tabs)
│   │   ├── ViolationDetailPage.controller.js  # Current violation detail
│   │   ├── OldViolationDetailPage.controller.js # Historical violation detail
│   │   ├── FileViolation.controller.js    # Create violation form
│   │   └── HCPortalPage.controller.js     # HC Portal view
│   ├── view/                # XML Views (6 views + 1 fragment)
│   │   ├── App.view.xml
│   │   ├── View1.view.xml
│   │   ├── ViolationDetailPage.view.xml
│   │   ├── OldViolationDetailPage.view.xml
│   │   ├── FileViolation.view.xml
│   │   ├── HCPortalPage.view.xml
│   │   └── fragments/
│   │       └── RegularizeDialog.fragment.xml
│   ├── model/models.js      # JSONModel + OData V2 model factory
│   ├── utils/               # Shared utility modules
│   │   ├── ODataUtils.js
│   │   └── TableUtils.js
│   ├── css/style.css        # Custom styles
│   ├── i18n/i18n.properties # Resource bundle
│   ├── localService/mainService/metadata.xml  # OData metadata
│   ├── test/                # QUnit unit + OPA5 integration tests
│   ├── manifest.json        # App descriptor
│   ├── Component.js         # UIComponent
│   └── index.html           # Bootstrap entry point
├── ui5.yaml                 # UI5 tooling config (development)
├── ui5-local.yaml           # Local dev config (SAPUI5 1.147.0 + mock)
├── ui5-mock.yaml            # Mock server testing config
├── ui5-deploy.yaml          # Production deploy config
├── .nwabaprc                # NWABAP uploader credentials
├── .project.json            # Fiori tools project metadata
├── package.json
└── eslint.config.mjs
```

## Tech Stack

| Technology | Detail |
|------------|--------|
| **UI5 Framework** | SAPUI5 / OpenUI5 `>=1.147.0` |
| **Theme** | `sap_horizon` |
| **OData** | V2 — service `ZHR_SACTIONS_APPLICATION_SRV` |
| **Pattern** | Custom MVC (not Fiori Elements) |
| **Key Libraries** | `sap.f`, `sap.m`, `sap.ui.table`, `sap.ui.layout` |
| **Language** | JavaScript (ES5/6) |
| **Build Tool** | UI5 CLI (`@ui5/cli@^4.0`) |
| **Linting** | ESLint v10 + `@sap-ux/eslint-plugin-fiori-tools` |
| **Mock Server** | `@sap-ux/ui5-middleware-fe-mockserver` |
| **Deploy** | NWABAP uploader + Fiori deploy tooling |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9
- UI5 CLI: `npm install --global @ui5/cli`
- Fiori tools: `npm install --global @sap/ux-ui5-tooling`
- Access to the SAP backend system (`sapdev-app01.matarat.local:44300`)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server with FLP sandbox
npm start

# Start with local SAPUI5 framework + mock server (no backend required)
npm run start-local

# Start with mock server only
npm run start-mock

# Start without FLP sandbox (direct index.html)
npm run start-noflp
```

The app opens at `http://localhost:8080/test/flp.html#app-preview`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Dev server with FLP sandbox and SAP backend proxy |
| `npm run start-local` | Local dev with SAPUI5 1.147.0 framework + mock server |
| `npm run start-mock` | Dev server with mock OData |
| `npm run start-noflp` | Direct app access without FLP sandbox |
| `npm run start-variants-management` | Variants management preview |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint across the project |
| `npm run unit-test` | Launch QUnit unit tests |
| `npm run int-test` | Launch OPA5 integration tests |
| `npm run deploy` | Upload `dist/` to ABAP via NWABAP uploader |
| `npm run deploy-test` | Build + deploy in test mode via Fiori tooling |
| `npm run undeploy` | Build + undeploy from ABAP |

## Project Configuration

### OData Service

The app connects to the SAP backend service `ZHR_SACTIONS_APPLICATION_SRV` with three entity sets:

| Entity Set | Key | Purpose |
|------------|-----|---------|
| `HDR_STRSet` | `(ZempId, ZACTION_REF_NO)` | Current (active) violation headers for Line Managers |
| `ITM_STRSet` | `(ZempId, ZincDate)` | Detailed violation history records with full workflow data |
| `EMP_SEARCH_HELP` | `ZempId` | Employee search help |

### Routing

Five routes defined in `manifest.json`:

| Route | Target View | Pattern | Purpose |
|-------|-------------|---------|---------|
| `RouteView1` | `View1` | `` | Main dashboard |
| `RouteViolationDetailPage` | `ViolationDetailPage` | `Detail/{actionRefNo}/{source}` | Current violation detail |
| `RouteOldViolationDetailPage` | `OldViolationDetailPage` | `OldDetail/{actionRefNo}/{source}` | Historical violation detail |
| `RouteFileViolation` | `FileViolation` | `FileViolation` | Create new violation |
| `RouteHCPortalPage` | `HCPortalPage` | `HCPortal` | HC Portal |

## Deployment

Two deployment methods are available:

### NWABAP Uploader
```bash
npm run build
npm run deploy
```
Targets the ABAP system at `https://10.123.1.11:44300` with BSP app `zhr_sanctions`.

### Fiori Deploy (Test Mode)
```bash
npm run deploy-test
```
Targets `sapdev-app01.matarat.local:44300` with app name `ZHR_SAN_AND_VIO` (package `ZDAC_HR`, transport `MD4K914310`).

## Utility API Reference

### ODataUtils (`webapp/utils/ODataUtils.js`)

| Function | Description |
|----------|-------------|
| `handleODataError(oErr, sTitle)` | Parses OData error responses and displays a user-friendly message via `MessageBox` |
| `fetchOData(oModel, sEntityPath, aFilters)` | Executes an OData V2 read and returns results as a Promise |
| `formatEdmTime(oTime)` | Converts `Edm.Time` values (milliseconds or object) to `HH:mm:ss` string |
| `getuserId()` | Returns the current user ID from SAP Launchpad or local dev environment |
| `formatTimeForPayload(sTimeVal)` | Converts `HH:mm`/`HH:mm:ss` string to an `Edm.Time` payload object |
| `parseByte(val)` | Safely casts a value to integer, returning `0` for invalid input |
| `buildITMPayload(oRecord, oOverrides)` | Builds a complete `ITM_STRSet` OData payload from a source record with optional field overrides |

### TableUtils (`webapp/utils/TableUtils.js`)

| Function | Description |
|----------|-------------|
| `buildTableColumns(oTable, aConfig, fnTimeFormatter)` | Dynamically creates table columns from a config array, with automatic `Edm.Time` formatting |
| `applyTableSearch(oTable, aConfig, sQuery)` | Applies client-side filtering across all visible configured columns |

## Testing

```bash
# Unit tests (QUnit + Sinon)
npm run unit-test

# Integration tests (OPA5)
npm run int-test
```

Tests run against the mock server (`ui5-mock.yaml`) using metadata from `webapp/localService/mainService/metadata.xml`.

## OData Metadata

The local service metadata defines these entity types:

- **`HDR_STR`** — Headers: employee info, LM assignment, incident date, status, punch times, delay hours
- **`ITM_STR`** — Items: detailed records with workflow steps for LM, HC Ops, HC EVP, Legal, and CEO actions
- **`EMP_SEARCH_HELP`** — Employee lookup (ID + name)


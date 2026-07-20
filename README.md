# Sanctions and Violations (zhrsanctions)

SAPUI5/Fiori app for tracking employee attendance violations, manager actions (regularize / payroll deduction / escalate to HC), and HC (Human Capital) review workflow.

## Stack

- SAPUI5 1.147.0+, `sap.m` + `sap.f` (DynamicPage) + `sap.ui.table` + `sap.ui.layout.form`
- OData V2, service `ZHR_SACTIONS_APPLICATION_SRV` at `/sap/opu/odata/sap/ZHR_SACTIONS_APPLICATION_SRV/`
- Routing: `sap.m.routing.Router`, view type XML, root view `App.view.xml` → `<App>` control hosts all pages
- Local mock data under `webapp/localService/mainService/data/*.json` (used in dev/test against `metadata.xml`)
- Theme: `sap_horizon`, compact density (`sapUiSizeCompact`)

## App ID & Bootstrap

- Component name: `zhrsanctions` (`Component.js`, extends `UIComponent`, `IAsyncContentCreation`)
- Models set on init: `device` (from `sap.ui.Device`), default `""` model = ODataModel (`mainService`, batch off, JSON, async metadata)
- `index.html` bootstraps via `data-sap-ui-component`, resource root `zhrsanctions: "./"`

## Routes (manifest.json)

| Route | Pattern | View | Purpose |
|---|---|---|---|
| `RouteView1` | `:?query:` | `View1` | Main landing — Current + History tabs |
| `RouteViolationDetailPage` | `detail/{actionRefNo}` | `ViolationDetailPage` | Manager detail view, current/open violation |
| `RouteOldViolationDetailpage` | `prevdetail/{actionRefNo}` | `OldViolationDetailPage` | Read-only detail for history records |
| `RouteHCViolationDetailpage` | `hcdetail/{actionRefNo}` | `HCViolationDetailPage` | HC reviewer detail + action page |
| `RouteFileViolation` | `create` | `FileViolation` | Create new violation form |
| `RouteHCPortal` | `hcportal` | `HCPortalPage` | HC inbox — violations awaiting HC review |

All targets navigate via `getOwnerComponent().getRouter().navTo(...)`. Detail pages receive their record via a transient `detailData` (or `create`) JSONModel set on the **Component** before navigation — not via OData binding context — so the route param `actionRefNo` is cosmetic/URL-only; actual data passed in-memory.

## Entity Model (OData, see `localService/mainService/metadata.xml`)

| Entity Set | Key | Notes |
|---|---|---|
| `HDR_STRSet` | `ZempId` + `ZACTION_REF_NO` | Current/open violations header, read-only |
| `ITM_STRSet` | `ZactionRefNo` + `ZempId` + `ZincDate` | History/action items; also the **create target** for new violations and all manager/HC actions (POST). `ZdelayHrs`, `ZshortHrs`, `Zrepeatcount`, `Zsysyrepeatcount` are `Edm.Byte`; everything else incl. `Zn0–Zn7`, `ZstdWeekHrs`, `ZwrkDyWeek` are `Edm.String` |
| `EMP_SEARCHHELPSet` | `ZempId` + `ZempName` | Employee value-help (scoped to current manager's reports) |
| `VIOALATION_SEARCHHELPSet` | `Zviolationcategory` + `Zviolationtype` | Violation-type lookup, 3 categories: A=time/attendance, B=conduct/work-org, C=misconduct |
| `FIST_INC_DATESet` | `ZempId` + `ZincDate` + `ZincCategory` + `ZincType` | Repeat-offense lookup — first incident date + repeat counts |
| `punch_regularizeSet` | `ZempId` + `ZincDate` + `ZactionRefNo` + `DelayFlag` | PUT-only target for attendance regularization (no GET in app) |
| `GET_REMARKSSet` | `ZactionRefNo` | Free-text remarks/comments log, read via filter |

All properties marked `sap:creatable="false" sap:updatable="false"` in metadata — writes go through `update()`/`create()` calls that bypass these restrictions at runtime (backend presumably enforces via custom handler, not standard CRUD flags).

## View → Controller Map

```
App.view.xml              → App.controller.js              (shell, empty onInit)
View1.view.xml             → View1.controller.js            (landing: Current/History tabs)
FileViolation.view.xml      → FileViolation.controller.js    (create form)
ViolationDetailPage.view.xml→ ViolationDetailPage.controller.js (manager actions: Regularize/Payroll/Report-to-HC)
OldViolationDetailPage.view.xml → OldViolationDetailPage.controller.js (read-only history detail)
HCPortalPage.view.xml       → HCPortalPage.controller.js     (HC inbox table)
HCViolationDetailPage.view.xml→ HCViolationDetailPage.controller.js (HC Take Action / Take No Action)
```

`BaseController.js` — shared base, all controllers extend it:
- `formatEdmTime(edmTime)` — proxy to `ODataUtils.formatEdmTime`, used as XML formatter `.formatEdmTime`
- `onNavBack()` — browser history back, falls back to `RouteView1`

## Utils (`webapp/utils/`)

**`ODataUtils.js`** — central data-shape layer.
- `getCurrentUserId()` — returns SAPUI hardcoded `DACO_EAMV04` on localhost, else `sap.ushell.Container...UserInfo` in production
- `fetchOData(model, path, filters)` — promisified `read()`
- `formatEdmTime` / `formatTimeForPayload` / `formatDateTimeForPayload` / `formatTimeDurationForPayload` / `formatDateTimeForEntityKey` — Edm.Time/DateTime ↔ JS conversions (Edm.Time as `{ms, __edmType:"Edm.Time"}`, durations as ISO-8601 `PnDTnHnMnS`)
- `buildITMPayload(record, overrides)` — canonical ITM_STRSet payload builder; enforces Edm.Byte parsing on the 4 byte fields, string-safe trim on rest
- `submitHCAction(model, record, overrides)` — PUT to `ITM_STRSet(...)` by composite key
- `submitPunchRegularize(model, record, overrides)` — PUT to `punch_regularizeSet(...)`, `DelayFlag` semantics: `"1"`=delay only, `"2"`=short only, `"3"`=both
- `handleODataError(error, title)` — parses OData error body → `MessageBox.error`

**`TableUtils.js`** — dynamic `sap.ui.table.Table` column builder from declarative config arrays (see `CURRENT_VIOLATIONS_COLUMNS` / `HISTORY_VIOLATIONS_COLUMNS` in `View1.controller.js`, `HC_TABLE_COLUMNS` in `HCPortalPage.controller.js`). Also drives client-side OR-filter search (`applyTableSearch`).

**`ExportUtils.js`** — `sap.ui.export.Spreadsheet` wrapper; exports current table binding (post-filter) to `.xlsx`, pre-formats time/date columns.

**`SearchHelpHandler.js`** — generic `SelectDialog` value-help framework. `FIELD_CONFIG` maps input IDs (`inputZempId`, `dIpZincType`) to entity set + key/desc fields + default filters. Used by FileViolation (employee picker, scoped by `ZincDate`) and HCViolationDetailPage (violation-type picker, scoped by category). On confirm for HC violation-type selection, triggers `loadRepeatInfo` → reads `FIST_INC_DATESet` to populate repeat-count/first-incident-date.

## Key Workflows

**1. Manager — view & action current violation** (`ViolationDetailPage`)
- Loaded from `HDR_STRSet`, three header actions: Regularize, Payroll Deduction, Raise Issue to HC
- **Regularize**: auto-detects delay (`punchIn > scheduledIn`) and/or short (`punchOut < scheduledOut`) from `ZdelayHrs`/`ZshortHrs`; pre-fills From/To time gaps; mode selector shown only if both apply; submits via 2-step chain — PUT `punch_regularizeSet` (corrected times) → POST `ITM_STRSet` (action record, `Zaction="Regularized"`, `Zstatus="COMPLETED"`)
- **Payroll Deduction** / **Raise to HC**: single POST to `ITM_STRSet` with `Zaction` set accordingly; HC path requires reason via `ReportToHCDialog` fragment

**2. Manager — create violation** (`FileViolation`)
- Employee picked via value-help (gated on Incident Date being set first — `onIncidentDateChange` toggles editability)
- Selected employee snapshot stored in transient `SHData` model, bound read-only across the form (employee/position/indicator fields `Zn0–Zn7`)
- `onSave` assembles full payload — most fields read directly off form controls by `byId`, falls back to `SHData` snapshot; mandatory: `ZempId`, `ZincDate`; POST `ITM_STRSet`

**3. HC reviewer** (`HCPortalPage` → `HCViolationDetailPage`)
- Inbox filtered `ZlmIdName = currentUser AND ZIsHc = true`
- Detail page action buttons (`isEditOn`) visible only while `Zstatus !== "COMPLETED"`
- **Take Action**: opens `TakeActionDialog` — pick category (A/B/C radio-backed Select) + violation type (value-help, scoped by category) → triggers repeat-count lookup → submit PUTs `ITM_STRSet` with `Zstatus="COMPLETED"`
- **Take No Action**: simpler reason-only dialog, same submit path, no category/type required
- **View Remarks**: reads `GET_REMARKSSet` filtered by `ZactionRefNo`, lists `Tdline` entries in read-only dialog

## Fragments (`webapp/view/fragments/`)

| Fragment | Used by | Purpose |
|---|---|---|
| `RegularizeDialog` | ViolationDetailPage | Delay/Short time-gap correction form |
| `ReportToHCDialog` | ViolationDetailPage | Reason capture for HC escalation |
| `TakeActionDialog` | HCViolationDetailPage | Category + type + reason, HC resolution-with-action |
| `TakeNoActionDialog` | HCViolationDetailPage | Reason-only, HC resolution-without-action |
| `AddRemarkDialog` | HCViolationDetailPage | Read-only remarks list |

## Known Inconsistencies (carry these in mind when extending)

- `HDR_STRSet` uses `Zishc` (lowercase), `ITM_STRSet` uses `ZIsHc` — different casing for conceptually same flag across entities
- `View1.controller.js` filters current violations on `Zishc` but `ITM_STRSet`/HC portal use `ZIsHc` — verify correct property per entity when adding filters
- `ODataUtils.buildITMPayload` reads `Zstatus` off `r.Zstatus || r.Status` — `HDR_STRSet` actually exposes `Zstatus`, comment in code flags `r.Status` fallback as legacy/wrong
- Entity metadata marks nearly all properties non-creatable/non-updatable, yet app performs `create()`/`update()` against them — backend-enforced, not reflected in metadata
- `SearchHelpHandler` has deprecated aliases (`liveSearchValueHelpDialog`, `searchValueHelpDialog`, `closeValueHelpDialog`, `fetchGLData`) kept for backward compat — prefer canonical names (`onLiveSearch`, `onConfirm`, `fetchEntitySet`) in new code
- `ODataUtils.getCurrentUserId()` hardcodes `DACO_EAMV04` for `localhost`/`127.0.0.1` — dev-only stub, must not ship to prod build

## Testing

- Unit: QUnit, `webapp/test/unit/` — currently only `View1.controller` smoke test (`onInit` doesn't throw)
- Integration: OPA5, `webapp/test/integration/` — single journey, asserts App + View1 page render on startup
- Run via `webapp/test/testsuite.qunit.html` (loads both suites)

## i18n

`webapp/i18n/i18n.properties` — minimal, only `appTitle`, `appDescription`, `title` defined. Bulk of UI text (labels, button text, messages) is hardcoded in XML views and JS `MessageToast`/`MessageBox` calls — not externalized. Flag for future i18n pass if multi-language support needed.

test 
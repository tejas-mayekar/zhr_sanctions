# zhr_sanctions

This document serves as both a knowledge-transfer guide and a technical specification for the SAPUI5/Fiori application in this repository.

## 1. Purpose

The application supports a sanctions and violations workflow for employee attendance and conduct issues. It enables:

- managers to review current and historical violations
- managers to create new violation records
- managers to take actions such as regularization, payroll deduction, or escalation to Human Capital (HC)
- HC users to review, approve, reject, or close cases

The solution is implemented as a UI5 application backed by an OData V2 service and uses local mock data for development and testing.

## 2. Business Context

The app is designed for a business process in which employee attendance or conduct-related issues are captured, reviewed, and acted upon. The workflow typically follows this pattern:

1. A violation is created by a manager.
2. The violation is visible in the manager’s current/open list.
3. The manager may regularize, deduct payroll, or escalate the case.
4. HC users review the case and decide on the final outcome.
5. The result is persisted through the OData service and reflected in the history view.

## 3. Solution Architecture

### 3.1 Technology Stack

- SAPUI5 / OpenUI5
- UI5 mobile and foundational libraries: sap.m, sap.f, sap.ui.table, sap.ui.layout
- OData V2 service
- XML views, JavaScript controllers
- QUnit for unit tests and OPA5 for integration tests

### 3.2 Application Entry Points

- Main component: webapp/Component.js
- Root view: webapp/view/App.view.xml
- App manifest: webapp/manifest.json
- Bootstrap page: webapp/index.html

The application is registered as the UI5 component zhrsanctions and uses the manifest for routing, model configuration, and resource declarations.

## 4. Application Structure

### 4.1 Main Folders

- webapp/controller: all controller logic
- webapp/view: XML views and fragments
- webapp/model: model-related helpers
- webapp/utils: shared utility modules for OData, tables, exports, and value help
- webapp/localService: mock service metadata and data for local development
- webapp/test: unit and integration tests
- webapp/i18n: translation resources

### 4.2 Key Files

- webapp/manifest.json: route definitions, data source, model setup
- webapp/Component.js: component initialization and shared model handling
- webapp/controller/BaseController.js: shared navigation and formatting helpers
- webapp/utils/ODataUtils.js: central OData request and payload logic
- webapp/utils/TableUtils.js: table configuration and search behavior
- webapp/utils/ExportUtils.js: spreadsheet export wrapper
- webapp/utils/SearchHelpHandler.js: reusable value-help dialogs

## 5. Navigation and Screens

The app uses a view-based router configured in the manifest.

| Route | Pattern | Screen | Responsibility |
|---|---|---|---|
| RouteView1 | :?query: | View1 | Landing page with current and history views |
| RouteViolationDetailPage | detail/{actionRefNo} | ViolationDetailPage | Manager detail and action page |
| RouteOldViolationDetailpage | prevdetail/{actionRefNo} | OldViolationDetailPage | Read-only history detail |
| RouteHCViolationDetailpage | hcdetail/{actionRefNo} | HCViolationDetailPage | HC review and decision page |
| RouteFileViolation | create | FileViolation | Create new violation form |
| RouteHCPortal | hcportal | HCPortalPage | HC inbox and case review |

Navigation is performed through the component router and uses transient in-memory data for detail views rather than relying solely on OData binding context.

## 6. UI and Controller Mapping

| View | Controller | Purpose |
|---|---|---|
| App.view.xml | App.controller.js | Shell container |
| View1.view.xml | View1.controller.js | Main landing page with current/history tabs |
| FileViolation.view.xml | FileViolation.controller.js | Violation creation screen |
| ViolationDetailPage.view.xml | ViolationDetailPage.controller.js | Manager action workflow |
| OldViolationDetailPage.view.xml | OldViolationDetailPage.controller.js | Read-only historical detail |
| HCPortalPage.view.xml | HCPortalPage.controller.js | HC inbox view |
| HCViolationDetailPage.view.xml | HCViolationDetailPage.controller.js | HC resolution workflow |

BaseController provides shared behavior including navigation back and formatting helpers used by the views.

## 7. Data Model and OData Integration

The application connects to the OData service defined in the manifest:

- Service: /sap/opu/odata/sap/ZHR_ACTIONS_APPLICATION_SRV/
- Local metadata: webapp/localService/mainService/metadata.xml
- Local mock data: webapp/localService/mainService/data

### 7.1 Main Entity Sets

| Entity Set | Role |
|---|---|
| HDR_STRSet | Current/open violation header data |
| ITM_STRSet | Main transaction entity for violation records and actions |
| EMP_SEARCHHELPSet | Employee value-help data |
| VIOALATION_SEARCHHELPSet | Violation-type lookup data |
| FIST_INC_DATESet | Repeat offense and first incident lookup |
| punch_regularizeSet | Punch regularization update target |
| GET_REMARKSSet | Remarks/comment retrieval |

### 7.2 Important Implementation Notes

- The metadata marks many properties as non-creatable and non-updatable, but the app uses create and update calls at runtime.
- The backend is expected to enforce business rules even when metadata does not reflect them.
- The app uses composite keys and explicit payload construction rather than relying on generic CRUD defaults.

## 8. Core Business Workflows

### 8.1 Manager Creates a Violation

The FileViolation flow collects the violation information, uses a value-help dialog for employee selection, and submits a new record through ITM_STRSet.

Key behavior:

- Incident date must be selected first before the employee picker becomes active.
- Employee data is cached in a transient model for display in the form.
- The save action assembles the payload from form controls and helper values.

### 8.2 Manager Reviews and Acts on a Violation

The ViolationDetailPage workflow supports:

- regularization of attendance gaps
- payroll deduction action
- escalation to HC

Regularization is handled through a two-step process:

1. a punch regularization request is sent
2. an item/action record is posted to complete the workflow

### 8.3 HC Review Flow

The HC portal displays cases assigned to the current user. The HC detail page supports:

- taking action on a case
- taking no action
- viewing remarks and supporting comments

These interactions are driven by dialogs and payload submission to ITM_STRSet.

## 9. Supporting Utilities

### ODataUtils

This is the central utility layer for OData interactions. It handles:

- user ID resolution
- read requests with filters
- time/date payload conversion
- payload construction for ITM_STRSet and punch regularize operations
- error handling and message display

### TableUtils

Used to build table columns dynamically and to support client-side filtering and search across different views.

### ExportUtils

Wraps spreadsheet export logic for table data and prepares values for export in a user-friendly format.

### SearchHelpHandler

Provides reusable select-dialog value-help behavior for employee and violation-type selection.

## 10. User Experience and Localization

The current implementation uses a mix of:

- XML view definitions
- hardcoded labels and messages in JavaScript/XML
- i18n resource bundles for basic app metadata

The localization coverage is still incomplete, and several UI texts remain hardcoded. This should be considered when extending the app for broader language support.


### How to Run

Use the available npm scripts:

- npm run start-local
- npm run unit-test
- npm run int-test
- npm run lint

## 11. Development Notes and Known Considerations

The following points are important for future maintenance or enhancement work:

- There are naming inconsistencies between entity properties such as Zishc and ZIsHc.
- Some business logic is implemented in the UI layer rather than in a separate service layer.
- Development-time user ID handling is currently hardcoded for localhost scenarios.
- The app relies on runtime backend enforcement for write operations even where metadata appears restrictive.

## 12. Recommended Starting Points for New Developers

If you are taking over this application, start with these files in order:

1. webapp/manifest.json
2. webapp/Component.js
3. webapp/controller/BaseController.js
4. webapp/controller/View1.controller.js
5. webapp/controller/ViolationDetailPage.controller.js
6. webapp/controller/FileViolation.controller.js
7. webapp/controller/HCPortalPage.controller.js
8. webapp/controller/HCViolationDetailPage.controller.js
9. webapp/utils/ODataUtils.js

## 13. Summary

This application is a business workflow UI for sanctions and violation management. Its main value lies in orchestrating manager actions, HC review, and OData-driven persistence in a single SAPUI5/Fiori experience.

The current codebase is structured clearly enough to support ongoing maintenance, but future work should focus on standardizing payload handling, improving localization, and reducing UI-level business logic where possible.

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel"
], (Controller, Column, Label, Text, JSONModel, Filter, FilterOperator, ODataModel) => {
    "use strict";

    const CURRENT_COLUMNS = [
        { label: "Action Ref No", binding: "ZACTION_REF_NO", width: "11rem", sortProperty: "ZACTION_REF_NO", filterProperty: "ZACTION_REF_NO", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        // { label: "Violation Type", binding: "ViolationType", width: "14rem", sortProperty: "ViolationType", filterProperty: "ViolationType", visible: true },
        { label: "Status", binding: "Status", width: "8rem", sortProperty: "Status", filterProperty: "Status", visible: false },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true },
        { label: "Employee Type", binding: "ZempTypeDesc", width: "12rem", sortProperty: "ZempTypeDesc", filterProperty: "ZempTypeDesc", visible: true },
        { label: "Employment Class", binding: "ZempClass", width: "14rem", sortProperty: "ZempClass", filterProperty: "ZempClass", visible: true },
        { label: "Company", binding: "Zcompany", width: "14rem", sortProperty: "Zcompany", filterProperty: "Zcompany", visible: true },
        { label: "Department", binding: "Zn3", width: "14rem", sortProperty: "Zn3", filterProperty: "Zn3", visible: true },
        { label: "Position", binding: "Zposition", width: "16rem", sortProperty: "Zposition", filterProperty: "Zposition", visible: true },
        { label: "Job Title", binding: "ZjobTitle", width: "14rem", sortProperty: "ZjobTitle", filterProperty: "ZjobTitle", visible: true },
        { label: "Punch In Time", binding: "Zpunchintime", width: "12rem", sortProperty: "Zpunchintime", filterProperty: "Zpunchintime", visible: true, isTime: true },
        { label: "Punch Out Time", binding: "Zpunchouttime", width: "12rem", sortProperty: "Zpunchouttime", filterProperty: "Zpunchouttime", visible: true, isTime: true },
        { label: "Scheduled In", binding: "ZschTimeIn", width: "12rem", sortProperty: "ZschTimeIn", filterProperty: "ZschTimeIn", visible: false, isTime: true },
        { label: "Scheduled Out", binding: "ZschTimeOut", width: "12rem", sortProperty: "ZschTimeOut", filterProperty: "ZschTimeOut", visible: false, isTime: true },
        { label: "Delay Hours", binding: "ZdelayHrs", width: "10rem", sortProperty: "ZdelayHrs", filterProperty: "ZdelayHrs", visible: true },
        { label: "Short Hours", binding: "ZshortHrs", width: "10rem", sortProperty: "ZshortHrs", filterProperty: "ZshortHrs", visible: true },
        { label: "Unauthorized Days", binding: "ZunautDays", width: "12rem", sortProperty: "ZunautDays", filterProperty: "ZunautDays", visible: false },
        { label: "Location", binding: "Zlocation", width: "8rem", sortProperty: "Zlocation", filterProperty: "Zlocation", visible: true },
        { label: "Location Group", binding: "ZlocGroup", width: "14rem", sortProperty: "ZlocGroup", filterProperty: "ZlocGroup", visible: true },
        { label: "Hire Date", binding: "ZhireDate", width: "12rem", sortProperty: "ZhireDate", filterProperty: "ZhireDate", visible: false },
        { label: "Manager ID", binding: "ZlmIdName", width: "10rem", sortProperty: "ZlmIdName", filterProperty: "ZlmIdName", visible: false },
        { label: "Manager Action Date", binding: "ZlmIdActionDate", width: "12rem", sortProperty: "ZlmIdActionDate", filterProperty: "ZlmIdActionDate", visible: false },
        { label: "Pay Grade", binding: "ZpayGrade", width: "8rem", sortProperty: "ZpayGrade", filterProperty: "ZpayGrade", visible: false },
        { label: "Nationality", binding: "Znationality", width: "12rem", sortProperty: "Znationality", filterProperty: "Znationality", visible: false },
        { label: "Work Schedule", binding: "Zworkschedule", width: "12rem", sortProperty: "Zworkschedule", filterProperty: "Zworkschedule", visible: false },
        { label: "Standard Weekly Hours", binding: "ZstdWeekHrs", width: "10rem", sortProperty: "ZstdWeekHrs", filterProperty: "ZstdWeekHrs", visible: false },
        { label: "Working Days/Week", binding: "ZwrkDyWeek", width: "10rem", sortProperty: "ZwrkDyWeek", filterProperty: "ZwrkDyWeek", visible: false },
    ];

    const HISTORY_COLUMNS = [
        { label: "Action Ref No", binding: "ZACTION_REF_NO", width: "11rem", sortProperty: "ZACTION_REF_NO", filterProperty: "ZACTION_REF_NO", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Closed Date", binding: "ZlmIdActionDate", width: "10rem", sortProperty: "ZlmIdActionDate", filterProperty: "ZlmIdActionDate", visible: true },
        { label: "Resolution", binding: "ZempTypeDesc", width: "14rem", sortProperty: "ZempTypeDesc", filterProperty: "ZempTypeDesc", visible: true },
        { label: "Resolved By", binding: "ZlmIdName", width: "10rem", sortProperty: "ZlmIdName", filterProperty: "ZlmIdName", visible: true },
    ];

    return Controller.extend("zhrsanctions.controller.View1", {

        onInit() {
            // UI state model (JSONModel for UI properties)
            const oUIModel = new JSONModel({
                currentCount: 0,
                historyCount: 0,
                HDR_STRSet: [],
                HDR_HISTSet: []
            });
            this.getView().setModel(oUIModel);

            // Initialize ODataModel
            this._initializeODataModel();

            // Build columns (data columns first; the Actions column is declared in XML and stays frozen)
            this._buildColumns("currentTable", CURRENT_COLUMNS);
            this._buildColumns("historyTable", HISTORY_COLUMNS);

            // Auto-load data on init
            this.onSearch();
        },

        _initializeODataModel() {
            const sServiceUrl = "/sap/opu/odata/sap/ZHR_SACTIONS_APPLICATION_SRV/";

            try {
                const oODataModel = new ODataModel(sServiceUrl, {
                    json: true,
                    loadMetadataAsync: true,
                    useBatch: false
                });

                this.getView().setModel(oODataModel, "mainService");
                console.log("OData model initialized successfully");
            } catch (error) {
                console.error("Failed to initialize OData model:", error);
            }
        },

        // ── Edm.Time Formatter ────────────────────────────────────────────────
        //
        // OData v2 returns Edm.Time values as plain objects: { ms: 28800000 }
        // where `ms` is the number of milliseconds since midnight.
        // This helper converts that (or a raw number) into a "HH:mm:ss" string.
        //
        // Accepted input shapes
        //   { ms: 28800000 }   → "08:00:00"   (standard ODataModel v2 object)
        //   28800000           → "08:00:00"   (raw number, just in case)
        //   "08:00:00"         → "08:00:00"   (already a string — returned as-is)
        //   null / undefined   → ""

        formatEdmTime(oTime) {
            if (oTime === null || oTime === undefined) {
                return "";
            }

            // Already a formatted string — pass through unchanged.
            if (typeof oTime === "string") {
                return oTime;
            }

            // Resolve the millisecond value from an object ({ ms: ... }) or a bare number.
            let iMs;
            if (typeof oTime === "object" && oTime.ms !== undefined) {
                iMs = oTime.ms;
            } else if (typeof oTime === "number") {
                iMs = oTime;
            } else {
                // Unknown shape — return an empty string rather than "[object Object]".
                return "";
            }

            const iSeconds = Math.floor(iMs / 1000);
            const hh = String(Math.floor(iSeconds / 3600)).padStart(2, "0");
            const mm = String(Math.floor((iSeconds % 3600) / 60)).padStart(2, "0");
            const ss = String(iSeconds % 60).padStart(2, "0");

            return `${hh}:${mm}:${ss}`;
        },

        // ── Column builder ────────────────────────────────────────────────────
        // The frozen Actions column is declared first in the XML (index 0).
        // Data columns are appended after it so the Actions button stays
        // frozen on the LEFT edge while the rest of the columns scroll.
        //
        // Columns flagged with `isTime: true` use a binding with a formatter
        // so that Edm.Time objects render as "HH:mm:ss" instead of
        // "[object Object]".

        _buildColumns(sTableId, aConfig) {
            const oTable = this.byId(sTableId);

            aConfig
                .filter(cfg => cfg.visible)
                .forEach(cfg => {
                    // For time fields, supply a formatter reference so the Text
                    // control calls this.formatEdmTime() whenever the value changes.
                    const oBindingInfo = cfg.isTime
                        ? { path: cfg.binding, formatter: this.formatEdmTime.bind(this) }
                        : `{${cfg.binding}}`;

                    oTable.addColumn(new Column({
                        label: new Label({ text: cfg.label }),
                        template: new Text({ text: oBindingInfo, wrapping: false }),
                        sortProperty: cfg.sortProperty,
                        filterProperty: cfg.filterProperty,
                        autoResizable: true,
                        width: cfg.width
                    }));
                });
        },

        // ── Main Search ───────────────────────────────────────────────────────

        async onSearch() {
            try {
                const oUIModel = this.getView().getModel();

                sap.ui.core.BusyIndicator.show(0);

                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, '200129')
                ];

                const aData = await this.fetchOData("mainService", "/HDR_STRSet", filters);
                console.log("Fetched data:", aData);

                if (aData && aData.length > 0) {
                    oUIModel.setProperty("/HDR_STRSet", aData);
                    oUIModel.setProperty("/currentCount", aData.length);
                    sap.m.MessageToast.show(`Loaded ${aData.length} violations`);
                } else {
                    oUIModel.setProperty("/HDR_STRSet", []);
                    oUIModel.setProperty("/currentCount", 0);
                    sap.m.MessageToast.show("No data found");
                }

                sap.ui.core.BusyIndicator.hide();

            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                console.error("OData fetch error details:", {
                    message: error.message,
                    statusCode: error.statusCode,
                    responseText: error.responseText
                });
                sap.m.MessageToast.show("An error occurred while loading data.");
            }
        },
        onPayrollDeductionPress() {

        },
        // ── View Details ──────────────────────────────────────────────────────

        /**
         * Called by the "Details" button in the Current (HDR_STRSet) table.
         * Reads the row context from the JSONModel and navigates to the object page.
         */
        onViewDetails(oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext(); // context on the default (JSON) model
            if (!oContext) {
                return;
            }
            const sActionRefNo = oContext.getProperty("ZACTION_REF_NO");
            this._navigateToDetail(sActionRefNo, "current");
        },

        /**
         * Called by the "Details" button in the History (HDR_HISTSet) table.
         */
        onViewDetailsHistory(oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext();
            if (!oContext) {
                return;
            }
            const sActionRefNo = oContext.getProperty("ZACTION_REF_NO");
            this._navigateToDetail(sActionRefNo, "history");
        },

        /**
         * Shared navigation helper.
         * Passes the full row data to the detail view via a named model so the
         * object page does not need a round-trip for the data it already has.
         *
         * @param {string} sActionRefNo   - The key of the record.
         * @param {string} sSource        - "current" | "history"  (used by the detail page to know which entity was opened)
         */
        _navigateToDetail(sActionRefNo, sSource) {
            if (!sActionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            // Find the full record from the JSON model so the object page has all fields immediately
            const oUIModel = this.getView().getModel();
            const sSetKey = sSource === "history" ? "HDR_HISTSet" : "HDR_STRSet";
            const aRecords = oUIModel.getProperty(`/${sSetKey}`) || [];
            const oRecord = aRecords.find(r => r.ZACTION_REF_NO === sActionRefNo);

            // Store the selected record in the component model so it survives navigation
            const oComponent = this.getOwnerComponent();
            const oDetailModel = new JSONModel({
                record: oRecord || {},
                source: sSource
            });
            oComponent.setModel(oDetailModel, "detailData");

            // Navigate via the router
            this.getOwnerComponent().getRouter().navTo("RouteViolationDetailPage", {
                actionRefNo: encodeURIComponent(sActionRefNo),
                source: sSource
            });
        },

        // ── Create Violation ─────────────────────────────────────────────────

        onCreateViolation() {
            this.getOwnerComponent().getRouter().navTo("RouteFileViolation");
        },

        // ── Search ────────────────────────────────────────────────────────────

        onSearchCurrent(oEvent) {
            this._applySearch("currentTable", CURRENT_COLUMNS, oEvent.getParameter("newValue"));
        },

        onSearchHistory(oEvent) {
            this._applySearch("historyTable", HISTORY_COLUMNS, oEvent.getParameter("newValue"));
        },

        _applySearch(sTableId, aConfig, sQuery) {
            const oBinding = this.byId(sTableId).getBinding("rows");
            if (!oBinding) return;

            const aFilters = sQuery
                ? aConfig
                    .filter(cfg => cfg.visible && cfg.filterProperty)
                    .map(cfg => new Filter(cfg.filterProperty, FilterOperator.Contains, sQuery))
                : [];

            oBinding.filter(
                aFilters.length ? [new Filter({ filters: aFilters, and: false })] : []
            );
        },

        // ── Refresh ───────────────────────────────────────────────────────────

        onRefreshCurrent() {
            this.onSearch();
        },

        onRefreshHistory() {
            this.byId("historyTable").getBinding("rows")?.refresh(true);
        },

        // ── OData Fetch ───────────────────────────────────────────────────────

        fetchOData(modelName, entitySetPath, filters) {
            const oModel = this.getView().getModel(modelName);

            if (!oModel) {
                return Promise.reject(new Error(`Model '${modelName}' not found`));
            }

            if (typeof oModel.read !== "function") {
                return Promise.reject(new Error(`Model '${modelName}' does not have read method`));
            }

            return new Promise((resolve, reject) => {
                oModel.read(entitySetPath, {
                    filters: filters || [],
                    success: oData => {
                        if (!oData || !oData.results) {
                            reject(new Error("No data returned from service"));
                        } else {
                            resolve(oData.results);
                        }
                    },
                    error: oError => {
                        console.error("OData Error Response:", {
                            statusCode: oError.statusCode,
                            statusText: oError.statusText,
                            message: oError.message,
                            responseText: oError.responseText
                        });
                        reject(oError);
                    }
                });
            });
        }

    });
});
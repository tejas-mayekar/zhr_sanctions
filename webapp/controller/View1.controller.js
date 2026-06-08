sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel"  // Add this import
], (Controller, Column, Label, Text, JSONModel, Filter, FilterOperator, ODataModel) => {
    "use strict";

    const CURRENT_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "EmployeeId", width: "9rem", sortProperty: "EmployeeId", filterProperty: "EmployeeId", visible: true },
        { label: "Violation Type", binding: "ViolationType", width: "14rem", sortProperty: "ViolationType", filterProperty: "ViolationType", visible: true },
        { label: "Status", binding: "Status", width: "8rem", sortProperty: "Status", filterProperty: "Status", visible: false },
        { label: "Date", binding: "ActionDate", width: "10rem", sortProperty: "ActionDate", filterProperty: "ActionDate", visible: true },
    ];

    const HISTORY_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "EmployeeId", width: "9rem", sortProperty: "EmployeeId", filterProperty: "EmployeeId", visible: true },
        { label: "Closed Date", binding: "ClosedDate", width: "10rem", sortProperty: "ClosedDate", filterProperty: "ClosedDate", visible: true },
        { label: "Resolution", binding: "Resolution", width: "14rem", sortProperty: "Resolution", filterProperty: "Resolution", visible: true },
        { label: "Resolved By", binding: "ResolvedBy", width: "10rem", sortProperty: "ResolvedBy", filterProperty: "ResolvedBy", visible: true },
    ];

    return Controller.extend("zhrsanctions.controller.View1", {

        onInit() {
            // UI state model
            const oModel = new JSONModel({ currentCount: 0, historyCount: 0 });
            this.getView().setModel(oModel);

            // Explicitly create and set the ODataModel
            this._initializeODataModel();

            this._buildColumns("currentTable", CURRENT_COLUMNS);
            this._buildColumns("historyTable", HISTORY_COLUMNS);
        },

        _initializeODataModel() {
            const sServiceUrl = "/sap/opu/odata/sap/ZHR_SACTIONS_APPLICATION_SRV/";

            try {
                const oODataModel = new ODataModel(sServiceUrl, {
                    json: true,
                    loadMetadataAsync: true,
                    useBatch: false  // Disable batching
                });

                this.getView().setModel(oODataModel, "mainService");
                console.log("OData model initialized successfully");
            } catch (error) {
                console.error("Failed to initialize OData model:", error);
            }
        },

        // ── Column builder ────────────────────────────────────────────────────

        _buildColumns(sTableId, aConfig) {
            const oTable = this.byId(sTableId);

            aConfig
                .filter(cfg => cfg.visible)
                .forEach(cfg => {
                    oTable.addColumn(new Column({
                        label: new Label({ text: cfg.label }),
                        template: new Text({ text: `{${cfg.binding}}`, wrapping: false }),
                        sortProperty: cfg.sortProperty,
                        filterProperty: cfg.filterProperty,
                        autoResizable: true,
                        width: cfg.width
                    }));
                });
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
            this.byId("currentTable").getBinding("rows")?.refresh(true);
        },

        onRefreshHistory() {
            this.byId("historyTable").getBinding("rows")?.refresh(true);
        },

        async onSearch() {
            try {
                // Change this to the correct entity set name from metadata
                var filters = []; // Add any necessary filters here
                filters.push(new sap.ui.model.Filter(
                    "ZlmIdName",
                    sap.ui.model.FilterOperator.EQ,
                    '200129'
                ));
                var mydata = await this.fetchOData("mainService", "/HDR_STRSet", filters);
                console.log("Fetched data:", mydata);
            } catch (error) {
                console.error("OData fetch error details:", {
                    message: error.message,
                    statusCode: error.statusCode,
                    responseText: error.responseText
                });
                sap.m.MessageToast.show("An error occurred while loading data.");
            }
        },


        fetchOData(modelName, entitySetPath, filters) {
            const oModel = this.getView().getModel(modelName);

            if (!oModel) {
                return Promise.reject(new Error(`Model '${modelName}' not found`));
            }

            if (typeof oModel.read !== "function") {
                return Promise.reject(new Error(`Model '${modelName}' does not have read method. Type: ${oModel.getMetadata().getName()}`));
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

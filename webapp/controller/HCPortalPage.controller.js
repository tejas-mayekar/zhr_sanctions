sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "zhrsanctions/utils/ODataUtils",
    "sap/ui/core/routing/History",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageToast"
], (Controller, JSONModel, ODataUtils) => {
    "use strict";

    /* eslint-disable camelcase */

    const HISTORY_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true },
        { label: "Action", binding: "Zaction", width: "14rem", sortProperty: "Zaction", filterProperty: "Zaction", visible: true },
        { label: "Status", binding: "Zstatus", width: "10rem", sortProperty: "Zstatus", filterProperty: "Zstatus", visible: true },
        { label: "Sanction", binding: "Zsanction", width: "14rem", sortProperty: "Zsanction", filterProperty: "Zsanction", visible: true },
        { label: "Initiated By", binding: "ZinitatedBy", width: "14rem", sortProperty: "ZinitatedBy", filterProperty: "ZinitatedBy", visible: true },
        { label: "Initiated Date", binding: "ZinitDate", width: "12rem", sortProperty: "ZinitDate", filterProperty: "ZinitDate", visible: true },
        { label: "Line Manager", binding: "Zlinemanagername", width: "14rem", sortProperty: "Zlinemanagername", filterProperty: "Zlinemanagername", visible: true },
        { label: "LM Action", binding: "Zlinemanageraction", width: "12rem", sortProperty: "Zlinemanageraction", filterProperty: "Zlinemanageraction", visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true },
        { label: "Remark", binding: "Zremark", width: "16rem", sortProperty: "Zremark", filterProperty: "Zremark", visible: true }
    ];

    return Controller.extend("zhrsanctions.controller.HCPortalPage", {

        onInit() {
            // UI state model (JSONModel for UI properties)
            const oUIModel = new JSONModel({
                historyCount: 0,
                ITM_STRSet: []
            });
            this.getView().setModel(oUIModel);

            // Initialize ODataModel
            this._initializeODataModel();

            // Build history columns dynamically
            this._buildColumns("_IDGenTable", HISTORY_COLUMNS);

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteHCPortal").attachPatternMatched(this._onRouteMatched, this);
        },

        _initializeODataModel() {
            const sServiceUrl = "/sap/opu/odata/sap/ZHR_SACTIONS_APPLICATION_SRV/";

            try {
                const ODataModel = sap.ui.require("sap/ui/model/odata/v2/ODataModel");
                const oODataModel = new ODataModel(sServiceUrl, {
                    json: true,
                    loadMetadataAsync: true,
                    useBatch: false
                });

                this.getView().setModel(oODataModel, "mainService");
            } catch (error) {
                // Ignore error
            }
        },

        _onRouteMatched() {
            this._loadHistory();
        },

        async _loadHistory() {
            try {
                const oUIModel = this.getView().getModel();
                sap.ui.core.BusyIndicator.show(0);
                const aHistoryData = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"), "/ITM_STRSet", []
                );
                oUIModel.setProperty("/ITM_STRSet", aHistoryData || []);
                oUIModel.setProperty("/historyCount", (aHistoryData || []).length);
                sap.ui.core.BusyIndicator.hide();
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                ODataUtils.handleODataError(error, "Failed to load history.");
            }
        },

        formatEdmTime(oTime) {
            if (oTime === null || oTime === undefined) {
                return "";
            }

            if (typeof oTime === "string") {
                return oTime;
            }

            let iMs;
            if (typeof oTime === "object" && oTime.ms !== undefined) {
                iMs = oTime.ms;
            } else if (typeof oTime === "number") {
                iMs = oTime;
            } else {
                return "";
            }

            const iSeconds = Math.floor(iMs / 1000);
            const hh = String(Math.floor(iSeconds / 3600)).padStart(2, "0");
            const mm = String(Math.floor((iSeconds % 3600) / 60)).padStart(2, "0");
            const ss = String(iSeconds % 60).padStart(2, "0");

            return `${hh}:${mm}:${ss}`;
        },

        _buildColumns(sTableId, aConfig) {
            const oTable = this.byId(sTableId);
            if (!oTable) {
                return;
            }

            const Column = sap.ui.require("sap/ui/table/Column");
            const Label = sap.ui.require("sap/m/Label");
            const Text = sap.ui.require("sap/m/Text");

            aConfig
                .filter(cfg => cfg.visible)
                .forEach(cfg => {
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

        onSearchHistory(oEvent) {
            this._applySearch("_IDGenTable", HISTORY_COLUMNS, oEvent.getParameter("newValue"));
        },

        onRefreshHistory() {
            this._loadHistory();
        },

        _applySearch(sTableId, aConfig, sQuery) {
            const oBinding = this.byId(sTableId).getBinding("rows");
            if (!oBinding) {
                return;
            }

            const Filter = sap.ui.require("sap/ui/model/Filter");
            const FilterOperator = sap.ui.require("sap/ui/model/FilterOperator");

            const aFilters = sQuery
                ? aConfig
                    .filter(cfg => cfg.visible && cfg.filterProperty)
                    .map(cfg => new Filter(cfg.filterProperty, FilterOperator.Contains, sQuery))
                : [];

            oBinding.filter(
                aFilters.length ? [new Filter({ filters: aFilters, and: false })] : []
            );
        },

        onViewDetails(oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext();
            if (!oContext) {
                return;
            }
            const sActionRefNo = oContext.getProperty("ZactionRefNo");

            if (!sActionRefNo) {
                const MessageToast = sap.ui.require("sap/m/MessageToast");
                MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const oUIModel = this.getView().getModel();
            const aRecords = oUIModel.getProperty("/ITM_STRSet") || [];
            const oRecord = aRecords.find(r => r.ZactionRefNo === sActionRefNo);

            const oDetailModel = new JSONModel({
                record: oRecord || {},
                source: "prevdetail"
            });
            this.getOwnerComponent().setModel(oDetailModel, "detailData");

            this.getOwnerComponent().getRouter().navTo("RouteOldViolationDetailpage", {
                actionRefNo: encodeURIComponent(sActionRefNo)
            });
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onNavBack() {
            const History = sap.ui.require("sap/ui/core/routing/History");
            const oHistory = History.getInstance();
            const sPrevHash = oHistory.getPreviousHash();

            if (sPrevHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        }

    });
});
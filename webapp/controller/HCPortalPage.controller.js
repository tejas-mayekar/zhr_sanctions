sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/TableUtils",
    "zhrsanctions/utils/ExportUtils",
    "sap/ui/core/format/DateFormat"
], (BaseController, JSONModel, Filter, FilterOperator, ODataUtils, TableUtils, ExportUtils, DateFormat) => {
    "use strict";

    // ─── Column Config ────────────────────────────────────────────────────────

    const HC_TABLE_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true, isDate: true },
        { label: "Incident Discovery Date", binding: "ZincDisDate", width: "10rem", sortProperty: "ZincDisDate", filterProperty: "ZincDisDate", visible: true, isDate: true },
        { label: "Action", binding: "Zaction", width: "14rem", sortProperty: "Zaction", filterProperty: "Zaction", visible: true },
        { label: "Status", binding: "Zstatus", width: "10rem", sortProperty: "Zstatus", filterProperty: "Zstatus", visible: true, isStatus: true },
        { label: "Sanction", binding: "Zsanction", width: "14rem", sortProperty: "Zsanction", filterProperty: "Zsanction", visible: true },
        { label: "Initiated By", binding: "ZinitatedBy", width: "14rem", sortProperty: "ZinitatedBy", filterProperty: "ZinitatedBy", visible: true },
        { label: "Initiated Date", binding: "ZinitDate", width: "12rem", sortProperty: "ZinitDate", filterProperty: "ZinitDate", visible: true, isDate: true },
        { label: "Line Manager", binding: "Zlinemanagername", width: "14rem", sortProperty: "Zlinemanagername", filterProperty: "Zlinemanagername", visible: true },
        { label: "LM Action", binding: "Zlinemanageraction", width: "12rem", sortProperty: "Zlinemanageraction", filterProperty: "Zlinemanageraction", visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true, isDate: true },
        { label: "LM Remarks", binding: "Zlinemanagerremarks", width: "16rem", sortProperty: "Zlinemanagerremarks", filterProperty: "Zlinemanagerremarks", visible: true },
        { label: "HC Remarks", binding: "Zhcopsremark", width: "16rem", sortProperty: "Zhcopsremark", filterProperty: "Zhcopsremark", visible: true }
    ];

    // ─── Controller ───────────────────────────────────────────────────────────

    return BaseController.extend("zhrsanctions.controller.HCPortalPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                historyCount: 0,
                newCount: 0,
                completedCount: 0,
                ITM_STRSet: [],
                ITM_NEW_SET: [],
                ITM_COMPLETED_SET: []
            }));
            const dateFormatter = (value) => {
                if (!value) return "";
                const oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                return oDateFormat.format(new Date(value));
            };

            TableUtils.buildTableColumns(
                this.byId("HcTable"),
                HC_TABLE_COLUMNS,
                this.formatEdmTime.bind(this),
                dateFormatter,
                this.formatZstatus.bind(this)
            );

            TableUtils.buildTableColumns(
                this.byId("HcNewTable"),
                HC_TABLE_COLUMNS,
                this.formatEdmTime.bind(this),
                dateFormatter,
                this.formatZstatus.bind(this)
            );

            TableUtils.buildTableColumns(
                this.byId("HcCompletedTable"),
                HC_TABLE_COLUMNS,
                this.formatEdmTime.bind(this),
                dateFormatter,
                this.formatZstatus.bind(this)
            );

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteHCPortal")
                .attachPatternMatched(this._onRouteMatched, this);
        }
        ,
        // ── Route Handler ─────────────────────────────────────────────────────

        _onRouteMatched() {
            this._loadHCViolations();
        },

        // ── Toolbar Actions ───────────────────────────────────────────────────

        onSearchHistory(oEvent) {
            TableUtils.applyTableSearch(
                this.byId("HcTable"),
                HC_TABLE_COLUMNS,
                oEvent.getParameter("newValue")
            );
        },

        onRefreshHistory() {
            this._loadHCViolations();
        },

        onExportHCData() {
            ExportUtils.exportTableToExcel(
                this.byId("HcTable"),
                HC_TABLE_COLUMNS,
                "HC_Violations",
                this.formatEdmTime.bind(this)
            );
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onViewDetails(oEvent) {
            const context = oEvent.getSource().getBindingContext();
            if (!context) { return; }

            const actionRefNo = context.getProperty("ZactionRefNo");
            if (!actionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const allRecords = this.getView().getModel().getProperty("/ITM_STRSet") || [];
            const selectedRecord = allRecords.find(rec => rec.ZactionRefNo === actionRefNo);

            this.getOwnerComponent().setModel(
                new JSONModel({ record: selectedRecord || {}, source: "hcdetail" }),
                "detailData"
            );

            this.getOwnerComponent().getRouter().navTo("RouteHCViolationDetailpage", {
                actionRefNo: encodeURIComponent(actionRefNo)
            });
        },
        // ── Data Loading ──────────────────────────────────────────────────────

        async _loadHCViolations() {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                    new Filter("ZIsHc", FilterOperator.EQ, true),
                    
                    new Filter("Zstatus", FilterOperator.EQ, "1")
                ];

                const records = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"),
                    "/ITM_STRSet",
                    filters
                );

                const uiModel = this.getView().getModel();
                uiModel.setProperty("/ITM_STRSet", records || []);
                uiModel.setProperty("/historyCount", (records || []).length);

            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load HC violations.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        async _loadHCNew() {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                    new Filter("Zishc", FilterOperator.EQ, true)
                ];

                const records = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"),
                    "/HDR_STRSet",
                    filters
                );

                const uiModel = this.getView().getModel();
                uiModel.setProperty("/ITM_NEW_SET", records || []);
                uiModel.setProperty("/newCount", (records || []).length);

            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load new HC violations.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        async _loadHCCompleted() {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                    new Filter("ZIsHc", FilterOperator.EQ, true),
                    new Filter("Zstatus", FilterOperator.EQ, "4")
                ];

                const records = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"),
                    "/ITM_STRSet",
                    filters
                );

                const uiModel = this.getView().getModel();
                uiModel.setProperty("/ITM_COMPLETED_SET", records || []);
                uiModel.setProperty("/completedCount", (records || []).length);

            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load completed HC violations.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        // ── Tab Selection Handler ─────────────────────────────────────────────

        onTabSelect(oEvent) {
            const selectedKey = oEvent.getParameter("key");

            switch (selectedKey) {
                case "current":
                    this._loadHCViolations();
                    break;
                case "new":
                    this._loadHCNew();
                    break;
                case "completed":
                    this._loadHCCompleted();
                    break;
            }
        },

        // ── Toolbar Actions - New Tab ──────────────────────────────────────────

        onSearchNew(oEvent) {
            TableUtils.applyTableSearch(
                this.byId("HcNewTable"),
                HC_TABLE_COLUMNS,
                oEvent.getParameter("newValue")
            );
        },

        onRefreshNew() {
            this._loadHCNew();
        },

        onExportNew() {
            ExportUtils.exportTableToExcel(
                this.byId("HcNewTable"),
                HC_TABLE_COLUMNS,
                "HC_New_Violations",
                this.formatEdmTime.bind(this)
            );
        },

        // ── Toolbar Actions - Completed Tab ────────────────────────────────────

        onSearchCompleted(oEvent) {
            TableUtils.applyTableSearch(
                this.byId("HcCompletedTable"),
                HC_TABLE_COLUMNS,
                oEvent.getParameter("newValue")
            );
        },

        onRefreshCompleted() {
            this._loadHCCompleted();
        },

        onExportCompleted() {
            ExportUtils.exportTableToExcel(
                this.byId("HcCompletedTable"),
                HC_TABLE_COLUMNS,
                "HC_Completed_Violations",
                this.formatEdmTime.bind(this)
            );
        }

    });
});
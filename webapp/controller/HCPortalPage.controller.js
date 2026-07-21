sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/TableUtils",
    "zhrsanctions/utils/ExportUtils"
], (BaseController, JSONModel, Filter, FilterOperator, ODataUtils, TableUtils, ExportUtils) => {
    "use strict";

    const HC_TABLE_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true, isDate: true },
        { label: "Incident Discovery Date", binding: "ZincDisDate", width: "10rem", sortProperty: "ZincDisDate", filterProperty: "ZincDisDate", visible: true, isDate: true },
        { label: "Action", binding: "Zaction", width: "14rem", sortProperty: "Zaction", filterProperty: "Zaction", visible: true, isAction: true },
        { label: "Status", binding: "Zstatus", width: "10rem", sortProperty: "Zstatus", filterProperty: "Zstatus", visible: true, isStatus: true },
        { label: "Sanction", binding: "Zsanction", width: "14rem", sortProperty: "Zsanction", filterProperty: "Zsanction", visible: true },
        { label: "Initiated By", binding: "ZinitatedBy", width: "14rem", sortProperty: "ZinitatedBy", filterProperty: "ZinitatedBy", visible: true },
        { label: "Initiated Date", binding: "ZinitDate", width: "12rem", sortProperty: "ZinitDate", filterProperty: "ZinitDate", visible: true, isDate: true },
        { label: "Line Manager", binding: "Zlinemanagername", width: "14rem", sortProperty: "Zlinemanagername", filterProperty: "Zlinemanagername", visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true, isDate: true },
    ];
    const HC_REPORT_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true, isDate: true },
        { label: "Incident Discovery Date", binding: "ZincDisDate", width: "10rem", sortProperty: "ZincDisDate", filterProperty: "ZincDisDate", visible: true, isDate: true },
        { label: "Action", binding: "Zaction", width: "14rem", sortProperty: "Zaction", filterProperty: "Zaction", visible: true, isAction: true },
        { label: "Status", binding: "Zstatus", width: "10rem", sortProperty: "Zstatus", filterProperty: "Zstatus", visible: true, isStatus: true },
        { label: "Sanction", binding: "Zsanction", width: "14rem", sortProperty: "Zsanction", filterProperty: "Zsanction", visible: true },
        { label: "Initiated By", binding: "ZinitatedBy", width: "14rem", sortProperty: "ZinitatedBy", filterProperty: "ZinitatedBy", visible: true },
        { label: "Initiated Date", binding: "ZinitDate", width: "12rem", sortProperty: "ZinitDate", filterProperty: "ZinitDate", visible: true, isDate: true },
        { label: "Line Manager", binding: "Zlinemanagername", width: "14rem", sortProperty: "Zlinemanagername", filterProperty: "Zlinemanagername", visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true, isDate: true },
    ];
    const NEW_VIOLATIONS = [
        { label: "Action Ref No", binding: "ZACTION_REF_NO", width: "11rem", sortProperty: "ZACTION_REF_NO", filterProperty: "ZACTION_REF_NO", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Status", binding: "Zstatus", width: "8rem", sortProperty: "Zstatus", filterProperty: "Zstatus", visible: true, isStatus: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true, isDate: true },
        { label: "Employee Type", binding: "ZempTypeDesc", width: "12rem", sortProperty: "ZempTypeDesc", filterProperty: "ZempTypeDesc", visible: true },
        { label: "Employment Class", binding: "ZempClass", width: "14rem", sortProperty: "ZempClass", filterProperty: "ZempClass", visible: true },
        { label: "Company", binding: "Zn0", width: "14rem", sortProperty: "Zcompany", filterProperty: "Zcompany", visible: true },
        { label: "Department", binding: "Zn3", width: "14rem", sortProperty: "Zn3", filterProperty: "Zn3", visible: true },
        { label: "Position", binding: "Zposition", width: "16rem", sortProperty: "Zposition", filterProperty: "Zposition", visible: true },
        { label: "Job Title", binding: "ZjobTitle", width: "14rem", sortProperty: "ZjobTitle", filterProperty: "ZjobTitle", visible: true },
        { label: "Scheduled In", binding: "ZschTimeIn", width: "12rem", sortProperty: "ZschTimeIn", filterProperty: "ZschTimeIn", visible: true, isTime: true },
        { label: "Scheduled Out", binding: "ZschTimeOut", width: "12rem", sortProperty: "ZschTimeOut", filterProperty: "ZschTimeOut", visible: true, isTime: true },
        { label: "Punch In Time", binding: "Zpunchintime", width: "12rem", sortProperty: "Zpunchintime", filterProperty: "Zpunchintime", visible: true, isTime: true },
        { label: "Punch Out Time", binding: "Zpunchouttime", width: "12rem", sortProperty: "Zpunchouttime", filterProperty: "Zpunchouttime", visible: true, isTime: true },
        { label: "Delay Hours", binding: "ZdelayHrs", width: "10rem", sortProperty: "ZdelayHrs", filterProperty: "ZdelayHrs", visible: true },
        { label: "Short Hours", binding: "ZshortHrs", width: "10rem", sortProperty: "ZshortHrs", filterProperty: "ZshortHrs", visible: true },
        { label: "Unauthorized Days", binding: "ZunautDays", width: "12rem", sortProperty: "ZunautDays", filterProperty: "ZunautDays", visible: true },
        { label: "Location", binding: "Zlocation", width: "8rem", sortProperty: "Zlocation", filterProperty: "Zlocation", visible: true },
        { label: "Location Group", binding: "ZlocGroup", width: "14rem", sortProperty: "ZlocGroup", filterProperty: "ZlocGroup", visible: true },
        { label: "Hire Date", binding: "ZhireDate", width: "12rem", sortProperty: "ZhireDate", filterProperty: "ZhireDate", visible: false },
        { label: "Manager ID", binding: "ZlmIdName", width: "10rem", sortProperty: "ZlmIdName", filterProperty: "ZlmIdName", visible: true },
        { label: "Manager Action Date", binding: "ZlmIdActionDate", width: "12rem", sortProperty: "ZlmIdActionDate", filterProperty: "ZlmIdActionDate", visible: false },
        { label: "Pay Grade", binding: "ZpayGrade", width: "8rem", sortProperty: "ZpayGrade", filterProperty: "ZpayGrade", visible: false },
        { label: "Nationality", binding: "Znationality", width: "12rem", sortProperty: "Znationality", filterProperty: "Znationality", visible: false },
        { label: "Work Schedule", binding: "Zworkschedule", width: "12rem", sortProperty: "Zworkschedule", filterProperty: "Zworkschedule", visible: false },
        { label: "Standard Weekly Hours", binding: "ZstdWeekHrs", width: "10rem", sortProperty: "ZstdWeekHrs", filterProperty: "ZstdWeekHrs", visible: false },
        { label: "Working Days/Week", binding: "ZwrkDyWeek", width: "10rem", sortProperty: "ZwrkDyWeek", filterProperty: "ZwrkDyWeek", visible: false }
    ];
    return BaseController.extend("zhrsanctions.controller.HCPortalPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                historyCount: 0,
                newCount: 0,
                completedCount: 0,
                ITM_STRSet: [],
                ITM_NEW_SET: [],
                ITM_COMPLETED_SET: [],
                ITM_REPORT_SET: []
            }));

            TableUtils.buildTableColumns(
                this.byId("HcTable"),
                HC_TABLE_COLUMNS,
                this.formatEdmTime.bind(this),
                this.displaydateFormatter.bind(this),
                this.formatZstatus.bind(this),
                this.formatZaction.bind(this)
            );

            TableUtils.buildTableColumns(
                this.byId("HcNewTable"),
                NEW_VIOLATIONS,
                this.formatEdmTime.bind(this),
                this.displaydateFormatter.bind(this),
                this.formatZstatus.bind(this),
                this.formatZaction.bind(this)
            );

            TableUtils.buildTableColumns(
                this.byId("HcCompletedTable"),
                HC_TABLE_COLUMNS,
                this.formatEdmTime.bind(this),
                this.displaydateFormatter.bind(this),
                this.formatZstatus.bind(this),
                this.formatZaction.bind(this)
            );
            TableUtils.buildTableColumns(
                this.byId("HcReportTable"),
                HC_REPORT_COLUMNS,
                this.formatEdmTime.bind(this),
                this.displaydateFormatter.bind(this),
                this.formatZstatus.bind(this),
                this.formatZaction.bind(this),
                "mainService"
            );

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteHCPortal")
                .attachPatternMatched(this._onRouteMatched, this);
        }
        ,
        _onRouteMatched() {
            this._loadHCViolations();
        },

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
        onViewCompletedDetails(oEvent) {
            const context = oEvent.getSource().getBindingContext();
            if (!context) { return; }

            const actionRefNo = context.getProperty("ZactionRefNo");
            if (!actionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const allRecords = this.getView().getModel().getProperty("/ITM_COMPLETED_SET") || [];
            const selectedRecord = allRecords.find(rec => rec.ZactionRefNo === actionRefNo);

            this.getOwnerComponent().setModel(
                new JSONModel({ record: selectedRecord || {}, source: "hcdetail" }),
                "detailData"
            );

            this.getOwnerComponent().getRouter().navTo("RouteHCViolationDetailpage", {
                actionRefNo: encodeURIComponent(actionRefNo)
            });
        },
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
                case "report":
                    this._loadHCReport();
                    break;
            }
        },

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
        onViewNewDetails(oEvent) {
            const context = oEvent.getSource().getBindingContext();
            if (!context) { return; }

            const actionRefNo = context.getProperty("ZACTION_REF_NO");
            if (!actionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const allRecords = this.getView().getModel().getProperty("/ITM_NEW_SET") || [];
            const selectedRecord = allRecords.find(rec => rec.ZACTION_REF_NO === actionRefNo);

            this.getOwnerComponent().setModel(
                new JSONModel({ record: selectedRecord || {}, source: "hcunattendeddetail" }),
                "detailData"
            );

            this.getOwnerComponent().getRouter().navTo("RouteHCUnattendedDetailpage", {
                actionRefNo: encodeURIComponent(actionRefNo)
            });
        },
        onExportCompleted() {
            ExportUtils.exportTableToExcel(
                this.byId("HcCompletedTable"),
                HC_TABLE_COLUMNS,
                "HC_Completed_Violations",
                this.formatEdmTime.bind(this)
            );
        },
        _loadHCReport() {
            const table = this.byId("HcReportTable");

            table.bindRows({
                path: "mainService>/HC_REPORTSet",
                events: {
                    dataReceived: () => {
                        const count = table.getBinding("rows").getLength();
                        this.getView().getModel().setProperty("/reportCount", count);
                    }
                }
            });
        },

        onSearchReport(oEvent) {
            TableUtils.applyTableSearch(
                this.byId("HcReportTable"),
                HC_REPORT_COLUMNS,
                oEvent.getParameter("newValue")
            );
        },

        onRefreshReport() {
            this._loadHCReport();
        },

        onExportReport() {
            ExportUtils.exportTableToExcel(
                this.byId("HcReportTable"),
                HC_REPORT_COLUMNS,
                "HC_Report",
                this.formatEdmTime.bind(this)
            );
        },

        onViewReportDetails(oEvent) {
            const context = oEvent.getSource().getBindingContext();
            if (!context) { return; }

            const actionRefNo = context.getProperty("ZactionRefNo");
            if (!actionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const allRecords = this.getView().getModel().getProperty("/ITM_REPORT_SET") || [];
            const selectedRecord = allRecords.find(rec => rec.ZactionRefNo === actionRefNo);

            this.getOwnerComponent().setModel(
                new JSONModel({ record: selectedRecord || {}, source: "hcdetail" }),
                "detailData"
            );

            this.getOwnerComponent().getRouter().navTo("RouteHCViolationDetailpage", {
                actionRefNo: encodeURIComponent(actionRefNo)
            });
        },

    });
});
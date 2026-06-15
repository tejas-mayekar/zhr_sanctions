sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel",
    "zhrsanctions/utils/ODataUtils"
], (Controller, Column, Label, Text, JSONModel, Filter, FilterOperator, ODataModel, ODataUtils) => {
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
        { label: "Remark", binding: "Zremark", width: "16rem", sortProperty: "Zremark", filterProperty: "Zremark", visible: true },
    ];

    return Controller.extend("zhrsanctions.controller.View1", {

        onInit() {
            // UI state model (JSONModel for UI properties)
            const oUIModel = new JSONModel({
                currentCount: 0,
                historyCount: 0,
                HDR_STRSet: [],
                ITM_STRSet: []
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


        async onSearch() {
            try {
                const oUIModel = this.getView().getModel();

                sap.ui.core.BusyIndicator.show(0);

                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, '200129')
                ];

                const aCurrentData = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"), "/HDR_STRSet", filters
                );
                console.log("Fetched current data:", aCurrentData);

                if (aCurrentData && aCurrentData.length > 0) {
                    oUIModel.setProperty("/HDR_STRSet", aCurrentData);
                    oUIModel.setProperty("/currentCount", aCurrentData.length);
                    sap.m.MessageToast.show(`Loaded ${aCurrentData.length} violations`);
                } else {
                    oUIModel.setProperty("/HDR_STRSet", []);
                    oUIModel.setProperty("/currentCount", 0);
                    sap.m.MessageToast.show("No data found");
                }

                sap.ui.core.BusyIndicator.hide();

            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                ODataUtils.handleODataError(error, "Failed to load violations.");
            }finally{   
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onTabSelect(oEvent) {
            const sKey = oEvent.getParameter("key");
            if (sKey === "history") {
                this._loadHistory();
            }
        },
        onPayrollDeductionPress() {

        },
        onViewDetails(oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext(); // context on the default (JSON) model
            if (!oContext) {
                return;
            }
            const sActionRefNo = oContext.getProperty("ZACTION_REF_NO");
            this._navigateToDetail(sActionRefNo, "current");
        },

        onViewDetailsHistory(oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext();
            if (!oContext) {
                return;
            }
            const sActionRefNo = oContext.getProperty("ZactionRefNo");
            this._navigateToDetail(sActionRefNo, "prevdetail");
        },
        _navigateToDetail(sActionRefNo, sSource) {
            if (!sActionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const oUIModel = this.getView().getModel();
            const sSetKey = sSource === "prevdetail" ? "ITM_STRSet" : "HDR_STRSet";
            const aRecords = oUIModel.getProperty(`/${sSetKey}`) || [];
            const oRecord = aRecords.find(r => (r.ZACTION_REF_NO || r.ZactionRefNo) === sActionRefNo);

            const oDetailModel = new JSONModel({
                record: oRecord || {},
                source: sSource
            });
            this.getOwnerComponent().setModel(oDetailModel, "detailData");

            // Route depends on which tab triggered the navigation
            const sRouteName = sSource === "prevdetail"
                ? "RouteOldViolationDetailpage"   // note lowercase 'p' — matches manifest exactly
                : "RouteViolationDetailPage";

            this.getOwnerComponent().getRouter().navTo(sRouteName, {
                actionRefNo: encodeURIComponent(sActionRefNo)
            });
        },

        onCreateViolation() {
            this.getOwnerComponent().getRouter().navTo("RouteFileViolation");
        },
        onHCPortal() {
            this.getOwnerComponent().getRouter().navTo("RouteHCPortal");
        },

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
        onRefreshCurrent() {
            this.onSearch();
        },

        onRefreshHistory() {
            this._loadHistory();
        },

        async _loadHistory() {
            try {
                const oUIModel = this.getView().getModel();
                sap.ui.core.BusyIndicator.show(0);
                const aHistoryData = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"), "/ITM_STRSet", []
                );
                console.log("Fetched history data:", aHistoryData);
                oUIModel.setProperty("/ITM_STRSet", aHistoryData || []);
                oUIModel.setProperty("/historyCount", (aHistoryData || []).length);
                sap.ui.core.BusyIndicator.hide();
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                ODataUtils.handleODataError(error, "Failed to load history.");
            }finally{
                
                sap.ui.core.BusyIndicator.hide();
            }
        },
        fetchOData(modelName, sEntityPath, aFilters) {
            const oModel = this.getView().getModel(modelName);
            return ODataUtils.fetchOData(oModel, sEntityPath, aFilters);
        }

    });
});
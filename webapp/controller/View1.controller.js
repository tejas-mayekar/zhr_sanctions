sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/TableUtils"
], (BaseController, JSONModel,Filter, FilterOperator,ODataUtils, TableUtils) => {
    "use strict";

    const CURRENT_COLUMNS = [
        { label: "Action Ref No", binding: "ZACTION_REF_NO", width: "11rem", sortProperty: "ZACTION_REF_NO", filterProperty: "ZACTION_REF_NO", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
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
        { label: "Working Days/Week", binding: "ZwrkDyWeek", width: "10rem", sortProperty: "ZwrkDyWeek", filterProperty: "ZwrkDyWeek", visible: false }
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
        { label: "Line Manager ID", binding: "ZlmIdName", width: "14rem", sortProperty: "ZlmIdName", filterProperty: "ZlmIdName", visible: true },
        { label: "Line Manager Name", binding: "Zlinemanagername", width: "14rem", sortProperty: "Zlinemanagername", filterProperty: "Zlinemanagername", visible: true },
        { label: "LM Action", binding: "Zlinemanageraction", width: "12rem", sortProperty: "Zlinemanageraction", filterProperty: "Zlinemanageraction", visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true },
        { label: "Remark", binding: "Zremark", width: "16rem", sortProperty: "Zremark", filterProperty: "Zremark", visible: true }
    ];

    return BaseController.extend("zhrsanctions.controller.View1", {

        onInit() {
            this.getView().setModel(new JSONModel({
                currentCount: 0,
                historyCount: 0,
                HDR_STRSet: [],
                ITM_STRSet: []
            }));

            TableUtils.buildTableColumns(this.byId("currentTable"), CURRENT_COLUMNS, this.formatEdmTime.bind(this));
            TableUtils.buildTableColumns(this.byId("historyTable"), HISTORY_COLUMNS, this.formatEdmTime.bind(this));

            // Defer search until next tick to ensure model is attached
            setTimeout(() => this.onSearch(), 0);
            // var oUser = sap.ushell.Container.getService("UserInfo").getUser();
            // var sId = oUser.getId();        // user ID
            // var sName = oUser.getFullName(); // full name
            // var sEmail = oUser.getEmail();   // email (if available)
            // // use/attach to model
            // console.log("/user", { id: sId, name: sName, email: sEmail });
        }
        ,

        async onSearch() {
            try {
                const oUIModel = this.getView().getModel();
                sap.ui.core.BusyIndicator.show(0);
                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getuserId())
                ];
                const aCurrentData = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"), "/HDR_STRSet", filters
                );

                oUIModel.setProperty("/HDR_STRSet", aCurrentData || []);
                oUIModel.setProperty("/currentCount", (aCurrentData || []).length);
                oUIModel.setProperty("/isHC", (aCurrentData[0].Zishc || false));
            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load violations.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onTabSelect(oEvent) {
            if (oEvent.getParameter("key") === "history") {
                this._loadHistory();
            } else if (oEvent.getParameter("key") === "current") {
                this.onSearch();
            }
        },

        onViewDetails(oEvent) {
            const sActionRefNo = oEvent.getSource().getBindingContext()?.getProperty("ZACTION_REF_NO");
            this._navigateToDetail(sActionRefNo, "current");
        },

        onViewDetailsHistory(oEvent) {
            const sActionRefNo = oEvent.getSource().getBindingContext()?.getProperty("ZactionRefNo");
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

            this.getOwnerComponent().setModel(
                new JSONModel({ record: oRecord || {}, source: sSource }),
                "detailData"
            );

            const sRouteName = sSource === "prevdetail"
                ? "RouteOldViolationDetailpage"
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
            if (!oBinding) {
                return;
            }
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
                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getuserId()),
                    new Filter("ZIsHc", FilterOperator.EQ, false)
                ];
                const aHistoryData = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"), "/ITM_STRSet", filters
                );
                oUIModel.setProperty("/ITM_STRSet", aHistoryData || []);
                oUIModel.setProperty("/historyCount", (aHistoryData || []).length);
            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load history.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        }
    });
});
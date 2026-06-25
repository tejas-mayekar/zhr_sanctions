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

    // ─── Column Configs ───────────────────────────────────────────────────────

    const CURRENT_VIOLATIONS_COLUMNS = [
        { label: "Action Ref No",       binding: "ZACTION_REF_NO",  width: "11rem", sortProperty: "ZACTION_REF_NO",  filterProperty: "ZACTION_REF_NO",  visible: true },
        { label: "Employee ID",         binding: "ZempId",          width: "9rem",  sortProperty: "ZempId",          filterProperty: "ZempId",          visible: true },
        { label: "Employee Name",       binding: "ZempName",        width: "14rem", sortProperty: "ZempName",        filterProperty: "ZempName",        visible: true },
        { label: "Status",              binding: "Status",          width: "8rem",  sortProperty: "Status",          filterProperty: "Status",          visible: false },
        { label: "Incident Date",       binding: "ZincDate",        width: "10rem", sortProperty: "ZincDate",        filterProperty: "ZincDate",        visible: true },
        { label: "Employee Type",       binding: "ZempTypeDesc",    width: "12rem", sortProperty: "ZempTypeDesc",    filterProperty: "ZempTypeDesc",    visible: true },
        { label: "Employment Class",    binding: "ZempClass",       width: "14rem", sortProperty: "ZempClass",       filterProperty: "ZempClass",       visible: true },
        { label: "Company",             binding: "Zcompany",        width: "14rem", sortProperty: "Zcompany",        filterProperty: "Zcompany",        visible: true },
        { label: "Department",          binding: "Zn3",             width: "14rem", sortProperty: "Zn3",             filterProperty: "Zn3",             visible: true },
        { label: "Position",            binding: "Zposition",       width: "16rem", sortProperty: "Zposition",       filterProperty: "Zposition",       visible: true },
        { label: "Job Title",           binding: "ZjobTitle",       width: "14rem", sortProperty: "ZjobTitle",       filterProperty: "ZjobTitle",       visible: true },
        { label: "Punch In Time",       binding: "Zpunchintime",    width: "12rem", sortProperty: "Zpunchintime",    filterProperty: "Zpunchintime",    visible: true,  isTime: true },
        { label: "Punch Out Time",      binding: "Zpunchouttime",   width: "12rem", sortProperty: "Zpunchouttime",   filterProperty: "Zpunchouttime",   visible: true,  isTime: true },
        { label: "Scheduled In",        binding: "ZschTimeIn",      width: "12rem", sortProperty: "ZschTimeIn",      filterProperty: "ZschTimeIn",      visible: false, isTime: true },
        { label: "Scheduled Out",       binding: "ZschTimeOut",     width: "12rem", sortProperty: "ZschTimeOut",     filterProperty: "ZschTimeOut",     visible: false, isTime: true },
        { label: "Delay Hours",         binding: "ZdelayHrs",       width: "10rem", sortProperty: "ZdelayHrs",       filterProperty: "ZdelayHrs",       visible: true },
        { label: "Short Hours",         binding: "ZshortHrs",       width: "10rem", sortProperty: "ZshortHrs",       filterProperty: "ZshortHrs",       visible: true },
        { label: "Unauthorized Days",   binding: "ZunautDays",      width: "12rem", sortProperty: "ZunautDays",      filterProperty: "ZunautDays",      visible: false },
        { label: "Location",            binding: "Zlocation",       width: "8rem",  sortProperty: "Zlocation",       filterProperty: "Zlocation",       visible: true },
        { label: "Location Group",      binding: "ZlocGroup",       width: "14rem", sortProperty: "ZlocGroup",       filterProperty: "ZlocGroup",       visible: true },
        { label: "Hire Date",           binding: "ZhireDate",       width: "12rem", sortProperty: "ZhireDate",       filterProperty: "ZhireDate",       visible: false },
        { label: "Manager ID",          binding: "ZlmIdName",       width: "10rem", sortProperty: "ZlmIdName",       filterProperty: "ZlmIdName",       visible: false },
        { label: "Manager Action Date", binding: "ZlmIdActionDate", width: "12rem", sortProperty: "ZlmIdActionDate", filterProperty: "ZlmIdActionDate", visible: false },
        { label: "Pay Grade",           binding: "ZpayGrade",       width: "8rem",  sortProperty: "ZpayGrade",       filterProperty: "ZpayGrade",       visible: false },
        { label: "Nationality",         binding: "Znationality",    width: "12rem", sortProperty: "Znationality",    filterProperty: "Znationality",    visible: false },
        { label: "Work Schedule",       binding: "Zworkschedule",   width: "12rem", sortProperty: "Zworkschedule",   filterProperty: "Zworkschedule",   visible: false },
        { label: "Standard Weekly Hours", binding: "ZstdWeekHrs",  width: "10rem", sortProperty: "ZstdWeekHrs",     filterProperty: "ZstdWeekHrs",     visible: false },
        { label: "Working Days/Week",   binding: "ZwrkDyWeek",     width: "10rem",  sortProperty: "ZwrkDyWeek",      filterProperty: "ZwrkDyWeek",      visible: false }
    ];

    const HISTORY_VIOLATIONS_COLUMNS = [
        { label: "Action Ref No",       binding: "ZactionRefNo",           width: "11rem", sortProperty: "ZactionRefNo",           filterProperty: "ZactionRefNo",           visible: true },
        { label: "Employee ID",         binding: "ZempId",                 width: "9rem",  sortProperty: "ZempId",                 filterProperty: "ZempId",                 visible: true },
        { label: "Employee Name",       binding: "ZempName",               width: "14rem", sortProperty: "ZempName",               filterProperty: "ZempName",               visible: true },
        { label: "Incident Date",       binding: "ZincDate",               width: "10rem", sortProperty: "ZincDate",               filterProperty: "ZincDate",               visible: true },
        { label: "Action",              binding: "Zaction",                width: "14rem", sortProperty: "Zaction",                filterProperty: "Zaction",                visible: true },
        { label: "Status",              binding: "Zstatus",                width: "10rem", sortProperty: "Zstatus",                filterProperty: "Zstatus",                visible: true },
        { label: "Sanction",            binding: "Zsanction",              width: "14rem", sortProperty: "Zsanction",              filterProperty: "Zsanction",              visible: true },
        { label: "Initiated By",        binding: "ZinitatedBy",            width: "14rem", sortProperty: "ZinitatedBy",            filterProperty: "ZinitatedBy",            visible: true },
        { label: "Initiated Date",      binding: "ZinitDate",              width: "12rem", sortProperty: "ZinitDate",              filterProperty: "ZinitDate",              visible: true },
        { label: "Line Manager ID",     binding: "ZlmIdName",              width: "14rem", sortProperty: "ZlmIdName",              filterProperty: "ZlmIdName",              visible: true },
        { label: "Line Manager Name",   binding: "Zlinemanagername",       width: "14rem", sortProperty: "Zlinemanagername",       filterProperty: "Zlinemanagername",       visible: true },
        { label: "LM Action",           binding: "Zlinemanageraction",     width: "12rem", sortProperty: "Zlinemanageraction",     filterProperty: "Zlinemanageraction",     visible: true },
        { label: "LM Action Date",      binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true },
        { label: "Remark",              binding: "Zremark",                width: "16rem", sortProperty: "Zremark",                filterProperty: "Zremark",                visible: true }
    ];

    // ─── Controller ───────────────────────────────────────────────────────────

    return BaseController.extend("zhrsanctions.controller.View1", {

        onInit() {
            this.getView().setModel(new JSONModel({
                currentCount: 0,
                historyCount: 0,
                HDR_STRSet:   [],
                ITM_STRSet:   [],
                isHC:         false
            }));

            TableUtils.buildTableColumns(
                this.byId("currentTable"),
                CURRENT_VIOLATIONS_COLUMNS,
                this.formatEdmTime.bind(this)
            );
            TableUtils.buildTableColumns(
                this.byId("historyTable"),
                HISTORY_VIOLATIONS_COLUMNS,
                this.formatEdmTime.bind(this)
            );

            // Defer until model attaches
            setTimeout(() => this._loadCurrentViolations(), 0);
        },

        // ── Tab Selection ─────────────────────────────────────────────────────

        onTabSelect(oEvent) {
            const selectedKey = oEvent.getParameter("key");
            if (selectedKey === "history") {
                this._loadHistoryViolations();
            } else if (selectedKey === "current") {
                this._loadCurrentViolations();
            }
        },

        // ── Data Loading ──────────────────────────────────────────────────────

        /**
         * Load current (unresolved) violations for this manager.
         * Also updates the isHC flag from the first record.
         */
        async onSearch() {
            return this._loadCurrentViolations();
        },

        async _loadCurrentViolations() {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                    new Filter("Zishc", FilterOperator.EQ, false)
                ];

                const records = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"),
                    "/HDR_STRSet",
                    filters
                );

                const uiModel = this.getView().getModel();
                uiModel.setProperty("/HDR_STRSet",    records || []);
                uiModel.setProperty("/currentCount",  (records || []).length);
                if((records || []).length > 0 ){

                    uiModel.setProperty("/isHC",          true);
                }else{
                    
                    uiModel.setProperty("/isHC",          false);
                }

            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load violations.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        async _loadHistoryViolations() {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                    new Filter("ZIsHc",     FilterOperator.EQ, false)
                ];

                const records = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"),
                    "/ITM_STRSet",
                    filters
                );

                const uiModel = this.getView().getModel();
                uiModel.setProperty("/ITM_STRSet",    records || []);
                uiModel.setProperty("/historyCount",  (records || []).length);

            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load history.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        // ── Refresh Buttons ───────────────────────────────────────────────────

        onRefreshCurrent() { this._loadCurrentViolations(); },
        onRefreshHistory()  { this._loadHistoryViolations(); },

        // ── Search / Filter ───────────────────────────────────────────────────

        onSearchCurrent(oEvent) {
            TableUtils.applyTableSearch(
                this.byId("currentTable"),
                CURRENT_VIOLATIONS_COLUMNS,
                oEvent.getParameter("newValue")
            );
        },

        onSearchHistory(oEvent) {
            TableUtils.applyTableSearch(
                this.byId("historyTable"),
                HISTORY_VIOLATIONS_COLUMNS,
                oEvent.getParameter("newValue")
            );
        },

        // ── Export ────────────────────────────────────────────────────────────

        onExportCurrent() {
            ExportUtils.exportTableToExcel(
                this.byId("currentTable"),
                CURRENT_VIOLATIONS_COLUMNS,
                "Current_Violations",
                this.formatEdmTime.bind(this)
            );
        },

        onExportHistory() {
            ExportUtils.exportTableToExcel(
                this.byId("historyTable"),
                HISTORY_VIOLATIONS_COLUMNS,
                "Violation_History",
                this.formatEdmTime.bind(this)
            );
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onViewDetails(oEvent) {
            const actionRefNo = oEvent.getSource().getBindingContext()?.getProperty("ZACTION_REF_NO");
            this._navigateToDetailPage(actionRefNo, "current");
        },

        onViewDetailsHistory(oEvent) {
            const actionRefNo = oEvent.getSource().getBindingContext()?.getProperty("ZactionRefNo");
            this._navigateToDetailPage(actionRefNo, "prevdetail");
        },

        /**
         * Navigate to the appropriate detail page.
         *
         * @param {string} actionRefNo  - violation reference number
         * @param {string} sourceContext - "current" | "prevdetail"
         */
        _navigateToDetailPage(actionRefNo, sourceContext) {
            if (!actionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const uiModel   = this.getView().getModel();
            const dataSetKey = sourceContext === "prevdetail" ? "ITM_STRSet" : "HDR_STRSet";
            const allRecords = uiModel.getProperty(`/${dataSetKey}`) || [];

            const selectedRecord = allRecords.find(
                rec => (rec.ZACTION_REF_NO || rec.ZactionRefNo) === actionRefNo
            );

            this.getOwnerComponent().setModel(
                new JSONModel({ record: selectedRecord || {}, source: sourceContext }),
                "detailData"
            );

            const routeName = sourceContext === "prevdetail"
                ? "RouteOldViolationDetailpage"
                : "RouteViolationDetailPage";

            this.getOwnerComponent().getRouter().navTo(routeName, {
                actionRefNo: encodeURIComponent(actionRefNo)
            });
        },

        onCreateViolation() {
            this.getOwnerComponent().getRouter().navTo("RouteFileViolation");
        },

        onHCPortal() {
            this.getOwnerComponent().getRouter().navTo("RouteHCPortal");
        }
    });
});
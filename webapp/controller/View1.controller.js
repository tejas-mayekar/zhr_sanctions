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

    const CURRENT_VIOLATIONS_COLUMNS = [
        { label: "Action Ref No", binding: "ZACTION_REF_NO", width: "11rem", sortProperty: "ZACTION_REF_NO", filterProperty: "ZACTION_REF_NO", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Status", binding: "Status", width: "8rem", sortProperty: "Status", filterProperty: "Status", visible: false, isStatus: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true, isDate: true },
        { label: "Employee Type", binding: "ZempTypeDesc", width: "12rem", sortProperty: "ZempTypeDesc", filterProperty: "ZempTypeDesc", visible: true },
        { label: "Employment Class", binding: "ZempClass", width: "14rem", sortProperty: "ZempClass", filterProperty: "ZempClass", visible: true },
        { label: "Company", binding: "Zcompany", width: "14rem", sortProperty: "Zcompany", filterProperty: "Zcompany", visible: true },
        { label: "Department", binding: "Zn3", width: "14rem", sortProperty: "Zn3", filterProperty: "Zn3", visible: true },
        { label: "Position", binding: "Zposition", width: "16rem", sortProperty: "Zposition", filterProperty: "Zposition", visible: true },
        { label: "Job Title", binding: "ZjobTitle", width: "14rem", sortProperty: "ZjobTitle", filterProperty: "ZjobTitle", visible: true },
        { label: "Scheduled In", binding: "ZschTimeIn", width: "12rem", sortProperty: "ZschTimeIn", filterProperty: "ZschTimeIn", visible: true, isTime: true },
        { label: "Scheduled Out", binding: "ZschTimeOut", width: "12rem", sortProperty: "ZschTimeOut", filterProperty: "ZschTimeOut", visible: true, isTime: true },
        { label: "Punch In Time", binding: "Zpunchintime", width: "12rem", sortProperty: "Zpunchintime", filterProperty: "Zpunchintime", visible: true, isTime: true },
        { label: "Punch Out Time", binding: "Zpunchouttime", width: "12rem", sortProperty: "Zpunchouttime", filterProperty: "Zpunchouttime", visible: true, isTime: true },
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

    const HISTORY_VIOLATIONS_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true, isDate: true },
        { label: "Action", binding: "Zaction", width: "14rem", sortProperty: "Zaction", filterProperty: "Zaction", visible: true, isAction: true },
        { label: "Status", binding: "Zstatus", width: "10rem", sortProperty: "Zstatus", filterProperty: "Zstatus", visible: true, isStatus: true },
        { label: "Sanction", binding: "Zsanction", width: "14rem", sortProperty: "Zsanction", filterProperty: "Zsanction", visible: true },
        { label: "Initiated By", binding: "ZinitatedBy", width: "14rem", sortProperty: "ZinitatedBy", filterProperty: "ZinitatedBy", visible: true },
        { label: "Initiated Date", binding: "ZinitDate", width: "12rem", sortProperty: "ZinitDate", filterProperty: "ZinitDate", visible: true, isDate: true },
        { label: "Line Manager ID", binding: "ZlmIdName", width: "14rem", sortProperty: "ZlmIdName", filterProperty: "ZlmIdName", visible: true },
        { label: "Line Manager Name", binding: "Zlinemanagername", width: "14rem", sortProperty: "Zlinemanagername", filterProperty: "Zlinemanagername", visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true, isDate: true },
    ];
    const MISS_PUNCH_COLUMNS = [
        { label: "Employee ID", binding: "ZempId", width: "6rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Scheduled In", binding: "ZschTimeIn", width: "12rem", sortProperty: "ZschTimeIn", filterProperty: "ZschTimeIn", visible: true, isTime: true },
        { label: "Scheduled Out", binding: "ZschTimeOut", width: "12rem", sortProperty: "ZschTimeOut", filterProperty: "ZschTimeOut", visible: true, isTime: true },
        {
            label: "Punch In Time", binding: "Zpunchintime", width: "12rem", sortProperty: "Zpunchintime", filterProperty: "Zpunchintime", visible: true, isTime: true,
            editableConfig: { dependsOn: "Zpunchouttime", formatter: null, onChange: null }
        },
        {
            label: "Punch Out Time", binding: "Zpunchouttime", width: "12rem", sortProperty: "Zpunchouttime", filterProperty: "Zpunchouttime", visible: true, isTime: true,
            editableConfig: { dependsOn: "Zpunchintime", formatter: null, onChange: null }
        },
        { label: "Manager ID", binding: "ZmanagerId", width: "10rem", sortProperty: "ZmanagerId", filterProperty: "ZmanagerId", visible: true },
        { label: "Manager Name", binding: "ZmanagerName", width: "20rem", sortProperty: "ZmanagerName", filterProperty: "ZmanagerName", visible: true }
    ];
    return BaseController.extend("zhrsanctions.controller.View1", {

        onInit() {
            this.getView().setModel(new JSONModel({
                currentCount: 0,
                historyCount: 0,
                missPunchCount: 0,
                MissPunchSet: [],
                HDR_STRSet: [],
                ITM_STRSet: [],
                isHC: false
            }));
            TableUtils.buildTableColumns(
                this.byId("currentTable"), CURRENT_VIOLATIONS_COLUMNS,
                this.formatEdmTime.bind(this), this.displaydateFormatter.bind(this),
                this.formatZstatus.bind(this), this.formatZaction.bind(this),
                "mainService"
            );
            TableUtils.buildTableColumns(
                this.byId("historyTable"), HISTORY_VIOLATIONS_COLUMNS,
                this.formatEdmTime.bind(this), this.displaydateFormatter.bind(this),
                this.formatZstatus.bind(this), this.formatZaction.bind(this),
                "mainService"
            );
            const inCol = MISS_PUNCH_COLUMNS.find(c => c.binding === "Zpunchintime");
            inCol.editableConfig.formatter = this.isPunchInEditable.bind(this);
            inCol.editableConfig.onChange = this.onMissPunchTimeChange.bind(this);

            const outCol = MISS_PUNCH_COLUMNS.find(c => c.binding === "Zpunchouttime");
            outCol.editableConfig.formatter = this.isPunchOutEditable.bind(this);
            outCol.editableConfig.onChange = this.onMissPunchTimeChange.bind(this);
            TableUtils.buildTableColumns(
                this.byId("missPunchTable"), MISS_PUNCH_COLUMNS,
                this.formatEdmTime.bind(this), this.displaydateFormatter.bind(this),
                this.formatZstatus.bind(this), this.formatZaction.bind(this),
                "mainService"
            );
            setTimeout(() => this._loadCurrentViolations(), 0);
        },

        onTabSelect(oEvent) {
            const selectedKey = oEvent.getParameter("key");
            if (selectedKey === "history") {
                this._loadHistoryViolations();
            } else if (selectedKey === "current") {
                this._loadCurrentViolations();
            } else if (selectedKey === "missPunch") {
                this._loadMissPunch();
            }
        },
        onMissPunchSelectionChange(oEvent) {
            const table = oEvent.getSource();
            this.getView().getModel().setProperty(
                "/hasMissPunchSelection",
                table.getSelectedIndices().length > 0
            );
        },
        isPunchOutEditable(punchIn, punchOut) {
            const inStr = ODataUtils.formatEdmTime(punchIn);
            const outStr = ODataUtils.formatEdmTime(punchOut);
            const hasIn = !!inStr && inStr !== "00:00:00";
            const isMissingOut = !outStr || outStr === "00:00:00";
            // Editable if punchOut is missing (regardless of punchIn state)
            return isMissingOut || !hasIn;
        },

        isPunchInEditable(punchIn, punchOut) {
            const inStr = ODataUtils.formatEdmTime(punchIn);
            const outStr = ODataUtils.formatEdmTime(punchOut);
            const hasOut = !!outStr && outStr !== "00:00:00";
            const isMissingIn = !inStr || inStr === "00:00:00";
            // Editable if punchIn is missing OR punchOut is missing
            return isMissingIn || !hasOut;
        },
        onMissPunchTimeChange(oEvent) {
            const picker = oEvent.getSource();
            const newVal = oEvent.getParameter("value"); // "HH:mm:ss"
            const ctx = picker.getBindingContext("mainService");
            if (!ctx) { return; }
            const propName = picker.getBinding("value").getPath(); // e.g. Zpunchintime
            const edmTime = ODataUtils.formatTimeForPayload(newVal);
            ctx.getModel().setProperty(ctx.getPath() + "/" + propName, edmTime);
        },
        async onSubmitMissPunch() {
            const table = this.byId("missPunchTable");
            const selectedRecords = table.getSelectedIndices()
                .map(i => table.getContextByIndex(i).getObject());
            // TODO: wire selectedRecords into miss-punch submit OData call
            sap.m.MessageToast.show(selectedRecords.length + " record(s) selected for submit");
            console.log(selectedRecords)
            const oDataModel = this.getOwnerComponent().getModel()
                || this.getView().getModel("mainService");
            if (!oDataModel) {
                MessageBox.warning("No active OData service connected.");
                return;
            }
            selectedRecords.map(
                record => {
                    ODataUtils.submitSFRegularize(oDataModel, record, {
                        "ZempNumber": record.ZempId,
                        "ZschDateIn": "\/Date(1784160000000)\/",
                        "ZschDateOut": "\/Date(1784160000000)\/",
                        "Zpunchindate": null,
                        "Zpunchintime": record.Zpunchintime,
                        "Zpunchoutdate": null,
                        "Zpunchouttime": record.Zpunchouttime
                    }
                    )
                }
            )
            table.clearSelection();
            this.getView().getModel().setProperty("/hasMissPunchSelection", false);
            this._loadMissPunch();
        },
        /**
         * Load current (unresolved) violations for this manager.
         * Also updates the isHC flag from the first record.
         */
        async onSearch() {
            return this._loadCurrentViolations();
        },

        async _loadCurrentViolations() {
            const isHC = await ODataUtils.fetchODataEntity(
                this.getView().getModel("mainService"),
                `/ZHR_IS_HCSet(Zempid='${ODataUtils.getCurrentUserId()}')`
            ).catch(() => ({ Zishc: '' }));

            this.getView().getModel().setProperty("/isHC", isHC.Zishc === 'X');

            const table = this.byId("currentTable");
            table.bindRows({
                path: "mainService>/HDR_STRSet",
                filters: [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                    new Filter("Zishc", FilterOperator.EQ, false)
                ],
                events: {
                    dataReceived: () => {
                        this.getView().getModel().setProperty("/currentCount", table.getBinding("rows").getLength());
                    }
                }
            });
        },

        _loadHistoryViolations() {
            const table = this.byId("historyTable");
            table.bindRows({
                path: "mainService>/ITM_STRSet",
                filters: [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                    new Filter("ZIsHc", FilterOperator.EQ, false)
                ],
                events: {
                    dataReceived: () => {
                        this.getView().getModel().setProperty("/historyCount", table.getBinding("rows").getLength());
                    }
                }
            });
        },

        onRefreshCurrent() { this._loadCurrentViolations(); },
        onRefreshHistory() { this._loadHistoryViolations(); },

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

        onViewDetails(oEvent) {
            const context = oEvent.getSource().getBindingContext("mainService");
            if (!context) { return; }
            this._navigateToDetailPage(context.getObject(), "current");
        },

        onViewDetailsHistory(oEvent) {
            const context = oEvent.getSource().getBindingContext("mainService");
            if (!context) { return; }
            this._navigateToDetailPage(context.getObject(), "prevdetail");
        },

        /**
         * Navigate to the appropriate detail page.
         *
         * @param {string} actionRefNo  - violation reference number
         * @param {string} sourceContext - "current" | "prevdetail"
         */
        _navigateToDetailPage(record, sourceContext) {
            const actionRefNo = record?.ZACTION_REF_NO || record?.ZactionRefNo;
            if (!actionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            this.getOwnerComponent().setModel(
                new JSONModel({ record, source: sourceContext }),
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
        },
        _loadMissPunch() {
            const table = this.byId("missPunchTable");
            table.bindRows({
                path: "mainService>/MissPunchSet",
                filters: [
                    new Filter("ZmanagerId", FilterOperator.EQ, ODataUtils.getCurrentUserId()),
                ],
                events: {
                    dataReceived: () => {
                        this.getView().getModel().setProperty("/missPunchCount", table.getBinding("rows").getLength());
                    }
                }
            });
        },
        onRefreshMissPunch() { this._loadMissPunch(); },

        onSearchMissPunch(oEvent) {
            TableUtils.applyTableSearch(
                this.byId("missPunchTable"),
                MISS_PUNCH_COLUMNS,
                oEvent.getParameter("newValue")
            );
        },

        onExportMissPunch() {
            ExportUtils.exportTableToExcel(
                this.byId("missPunchTable"),
                MISS_PUNCH_COLUMNS,
                "Miss_Punch",
                this.formatEdmTime.bind(this)
            );
        },

        onViewMissPunchDetails(oEvent) {
            const context = oEvent.getSource().getBindingContext("mainService");
            if (!context) { return; }
            this._navigateToDetailPage(context.getObject(), "current");
        },
    });
});
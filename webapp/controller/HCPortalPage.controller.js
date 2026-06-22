sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/TableUtils"
], (BaseController, JSONModel,Filter, FilterOperator, ODataUtils, TableUtils) => {
    "use strict";

    /* eslint-disable camelcase */

    const HISTORY_COLUMNS = [
        { label: "Action Ref No", binding: "ZactionRefNo", width: "11rem", sortProperty: "ZactionRefNo", filterProperty: "ZactionRefNo", visible: true },
        { label: "Employee ID", binding: "ZempId", width: "9rem", sortProperty: "ZempId", filterProperty: "ZempId", visible: true },
        { label: "Employee Name", binding: "ZempName", width: "14rem", sortProperty: "ZempName", filterProperty: "ZempName", visible: true },
        { label: "Incident Date", binding: "ZincDate", width: "10rem", sortProperty: "ZincDate", filterProperty: "ZincDate", visible: true },
        { label: "Incident Dicovery Date", binding: "ZincDisDate", width: "10rem", sortProperty: "ZincDisDate", filterProperty: "ZincDisDate", visible: true },
        { label: "Action", binding: "Zaction", width: "14rem", sortProperty: "Zaction", filterProperty: "Zaction", visible: true },
        { label: "Status", binding: "Zstatus", width: "10rem", sortProperty: "Zstatus", filterProperty: "Zstatus", visible: true },
        { label: "Sanction", binding: "Zsanction", width: "14rem", sortProperty: "Zsanction", filterProperty: "Zsanction", visible: true },
        { label: "Initiated By", binding: "ZinitatedBy", width: "14rem", sortProperty: "ZinitatedBy", filterProperty: "ZinitatedBy", visible: true },
        { label: "Initiated Date", binding: "ZinitDate", width: "12rem", sortProperty: "ZinitDate", filterProperty: "ZinitDate", visible: true },
        { label: "Line Manager", binding: "Zlinemanagername", width: "14rem", sortProperty: "Zlinemanagername", filterProperty: "Zlinemanagername", visible: true },
        { label: "LM Action", binding: "Zlinemanageraction", width: "12rem", sortProperty: "Zlinemanageraction", filterProperty: "Zlinemanageraction", visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate", width: "12rem", sortProperty: "Zlinemanageractiondate", filterProperty: "Zlinemanageractiondate", visible: true },
        { label: "LM Remarks", binding: "Zlinemanagerremarks", width: "16rem", sortProperty: "Zlinemanagerremarks", filterProperty: "Zlinemanagerremarks", visible: true },
        { label: "HC Remarks", binding: "Zhcopsremark", width: "16rem", sortProperty: "Zhcopsremark", filterProperty: "Zhcopsremark", visible: true }
    ];

    return BaseController.extend("zhrsanctions.controller.HCPortalPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                historyCount: 0,
                ITM_STRSet: []
            }));

            TableUtils.buildTableColumns(this.byId("_IDGenTable"), HISTORY_COLUMNS, this.formatEdmTime.bind(this));

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteHCPortal")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            this._loadHistory();
        },

        async _loadHistory() {
            try {
                sap.ui.core.BusyIndicator.show(0);
                const filters = [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getuserId()),
                    new Filter("ZIsHc", FilterOperator.EQ, true)

                ];
                const aData = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"), "/ITM_STRSet", filters
                );
                const oUIModel = this.getView().getModel();
                oUIModel.setProperty("/ITM_STRSet", aData || []);
                oUIModel.setProperty("/historyCount", (aData || []).length);
            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load history.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onSearchHistory(oEvent) {
            TableUtils.applyTableSearch(this.byId("_IDGenTable"), HISTORY_COLUMNS, oEvent.getParameter("newValue"));
        },

        onRefreshHistory() {
            this._loadHistory();
        },

        onViewDetails(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            if (!oContext) {
                return;
            }
            const sActionRefNo = oContext.getProperty("ZactionRefNo");
            if (!sActionRefNo) {
                sap.m.MessageToast.show("Cannot open details: record has no Action Ref No.");
                return;
            }

            const aRecords = this.getView().getModel().getProperty("/ITM_STRSet") || [];
            const oRecord = aRecords.find(r => r.ZactionRefNo === sActionRefNo);

            this.getOwnerComponent().setModel(
                new JSONModel({ record: oRecord || {}, source: "hcdetail" }),
                "detailData"
            );

            this.getOwnerComponent().getRouter().navTo("RouteHCViolationDetailpage", {
                actionRefNo: encodeURIComponent(sActionRefNo)
            });
        }
    });
});
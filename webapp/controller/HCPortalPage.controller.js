sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils"
], (BaseController, JSONModel, Column, Label, Text, Filter, FilterOperator, ODataUtils) => {
    "use strict";

    /* eslint-disable camelcase */

    const HISTORY_COLUMNS = [
        { label: "Action Ref No",  binding: "ZactionRefNo",          width: "11rem", sortProperty: "ZactionRefNo",          filterProperty: "ZactionRefNo",          visible: true },
        { label: "Employee ID",    binding: "ZempId",                width: "9rem",  sortProperty: "ZempId",                filterProperty: "ZempId",                visible: true },
        { label: "Employee Name",  binding: "ZempName",              width: "14rem", sortProperty: "ZempName",              filterProperty: "ZempName",              visible: true },
        { label: "Incident Date",  binding: "ZincDate",              width: "10rem", sortProperty: "ZincDate",              filterProperty: "ZincDate",              visible: true },
        { label: "Action",         binding: "Zaction",               width: "14rem", sortProperty: "Zaction",               filterProperty: "Zaction",               visible: true },
        { label: "Status",         binding: "Zstatus",               width: "10rem", sortProperty: "Zstatus",               filterProperty: "Zstatus",               visible: true },
        { label: "Sanction",       binding: "Zsanction",             width: "14rem", sortProperty: "Zsanction",             filterProperty: "Zsanction",             visible: true },
        { label: "Initiated By",   binding: "ZinitatedBy",           width: "14rem", sortProperty: "ZinitatedBy",           filterProperty: "ZinitatedBy",           visible: true },
        { label: "Initiated Date", binding: "ZinitDate",             width: "12rem", sortProperty: "ZinitDate",             filterProperty: "ZinitDate",             visible: true },
        { label: "Line Manager",   binding: "Zlinemanagername",      width: "14rem", sortProperty: "Zlinemanagername",      filterProperty: "Zlinemanagername",      visible: true },
        { label: "LM Action",      binding: "Zlinemanageraction",    width: "12rem", sortProperty: "Zlinemanageraction",    filterProperty: "Zlinemanageraction",    visible: true },
        { label: "LM Action Date", binding: "Zlinemanageractiondate",width: "12rem", sortProperty: "Zlinemanageractiondate",filterProperty: "Zlinemanageractiondate",visible: true },
        { label: "Remark",         binding: "Zremark",               width: "16rem", sortProperty: "Zremark",               filterProperty: "Zremark",               visible: true }
    ];

    return BaseController.extend("zhrsanctions.controller.HCPortalPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                historyCount: 0,
                ITM_STRSet:   []
            }));

            this.initODataModel();
            this._buildColumns("_IDGenTable", HISTORY_COLUMNS);

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
                const aData = await ODataUtils.fetchOData(
                    this.getView().getModel("mainService"), "/ITM_STRSet", []
                );
                const oUIModel = this.getView().getModel();
                oUIModel.setProperty("/ITM_STRSet",   aData || []);
                oUIModel.setProperty("/historyCount", (aData || []).length);
            } catch (error) {
                ODataUtils.handleODataError(error, "Failed to load history.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _buildColumns(sTableId, aConfig) {
            const oTable = this.byId(sTableId);
            if (!oTable) {
                return;
            }
            aConfig
                .filter(cfg => cfg.visible)
                .forEach(cfg => {
                    const oBindingInfo = cfg.isTime
                        ? { path: cfg.binding, formatter: this.formatEdmTime.bind(this) }
                        : `{${cfg.binding}}`;

                    oTable.addColumn(new Column({
                        label:          new Label({ text: cfg.label }),
                        template:       new Text({ text: oBindingInfo, wrapping: false }),
                        sortProperty:   cfg.sortProperty,
                        filterProperty: cfg.filterProperty,
                        autoResizable:  true,
                        width:          cfg.width
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
            const oRecord  = aRecords.find(r => r.ZactionRefNo === sActionRefNo);

            this.getOwnerComponent().setModel(
                new JSONModel({ record: oRecord || {}, source: "prevdetail" }),
                "detailData"
            );

            this.getOwnerComponent().getRouter().navTo("RouteOldViolationDetailpage", {
                actionRefNo: encodeURIComponent(sActionRefNo)
            });
        }
    });
});
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, History, Fragment, JSONModel, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.View3", {

        onInit() {
        
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteView3").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("create");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onNavBack() {
            const oHistory  = History.getInstance();
            const sPrevHash = oHistory.getPreviousHash();

            if (sPrevHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        },



    });
});
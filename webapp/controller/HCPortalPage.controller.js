sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], (Controller, History, Fragment, JSONModel) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.HCPortalPage", {

        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteHCPortal").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("hcportal");
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onNavBack() {
            const oHistory = History.getInstance();
            const sPrevHash = oHistory.getPreviousHash();

            if (sPrevHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        },

    });
});
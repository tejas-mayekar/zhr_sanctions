sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], (Controller, History, Fragment, JSONModel) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.OldViolationDetailPage", {

         onInit() {
    // Must match manifest exactly — note lowercase 'p' in 'Detailpage'
    const oRouter = this.getOwnerComponent().getRouter();
    oRouter.getRoute("RouteOldViolationDetailpage")
           .attachPatternMatched(this._onRouteMatched, this);

    this.getView().setModel(new JSONModel({
        punchIn: "", punchOut: "", reason: ""
    }), "regularize");
},

_onRouteMatched() {
    const oDetailModel = this.getOwnerComponent().getModel("detailData");
    if (oDetailModel) {
        this.getView().setModel(oDetailModel, "detailData");
    }

    this.getView().getModel("regularize").setData({
        punchIn: "", punchOut: "", reason: ""
    });
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
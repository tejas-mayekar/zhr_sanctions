sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "zhrsanctions/utils/ODataUtils"
], (Controller, History, ODataUtils) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.BaseController", {

        // Formatter proxy for XML view bindings: formatter: '.formatEdmTime'
        formatEdmTime(oTime) {
            return ODataUtils.formatEdmTime(oTime);
        },

        onNavBack() {
            const sPrevHash = History.getInstance().getPreviousHash();
            if (sPrevHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        }
    });
});
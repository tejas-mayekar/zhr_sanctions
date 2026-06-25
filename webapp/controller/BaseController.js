sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "zhrsanctions/utils/ODataUtils"
], (Controller, History, ODataUtils) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.BaseController", {

        /**
         * Proxy for ODataUtils.formatEdmTime — used as formatter in XML view bindings.
         * Example: formatter: '.formatEdmTime'
         */
        formatEdmTime(edmTime) {
            return ODataUtils.formatEdmTime(edmTime);
        },

        /**
         * Navigate back to the previous page, or fall back to the main list view.
         */
        onNavBack() {
            const previousHash = History.getInstance().getPreviousHash();

            if (previousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        }
    });
});
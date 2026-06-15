sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/odata/v2/ODataModel",
    "zhrsanctions/utils/ODataUtils"
], (Controller, History, ODataModel, ODataUtils) => {
    "use strict";

    const SERVICE_URL = "/sap/opu/odata/sap/ZHR_SACTIONS_APPLICATION_SRV/";

    return Controller.extend("zhrsanctions.controller.BaseController", {

        /**
         * Initialize and attach named OData model "mainService" to view.
         * Call from onInit() in subclass controllers.
         */
        initODataModel() {
            try {
                const oODataModel = new ODataModel(SERVICE_URL, {
                    json: true,
                    loadMetadataAsync: true,
                    useBatch: false
                });
                this.getView().setModel(oODataModel, "mainService");
            } catch (error) {
                console.error("BaseController: failed to initialize OData model:", error);
            }
        },

        /**
         * Formatter proxy — lets XML views bind: formatter: '.formatEdmTime'
         * Delegates to shared ODataUtils.formatEdmTime.
         */
        formatEdmTime(oTime) {
            return ODataUtils.formatEdmTime(oTime);
        },

        // ── Navigation ────────────────────────────────────────────────────────

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
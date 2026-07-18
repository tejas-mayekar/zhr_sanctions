sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "zhrsanctions/utils/ODataUtils",
    "sap/ui/core/format/DateFormat"
], (Controller, History, ODataUtils, DateFormat) => {
    "use strict";

    const ZSTATUS_MAP = {
        "1": "In Progress",
        "2": "Sent Back to HR",
        "3": "Sent Back to LM",
        "4": "Completed",
        "5": "Sent to EVP",
        "6": "Sent to CEO",
    };
    const ZACTION_MAP = {
        "A": "Regularized",
        "B": "Payroll Deduction",
        "C": "Report To HC"
    }
    return Controller.extend("zhrsanctions.controller.BaseController", {

        formatEdmTime(edmTime) {
            return ODataUtils.formatEdmTime(edmTime);
        },
        formatVisibility: function (value) {
            return !!value;
        },

        /**
         * Map Zstatus code (1-4) to a display label.
         * Falls back to the raw value if it's not a recognized code.
         */
        formatZstatus(status) {
            if (status === null || status === undefined || status === "") { return ""; }
            const key = String(status).trim();
            return ZSTATUS_MAP[key] || status;
        },
        formatZaction(action) {
            if (action === null || action === undefined || action === "") { return ""; }
            const key = String(action).trim();
            return ZACTION_MAP[key] || action;
        },
        displaydateFormatter(value) {
            if (!value) return "";
            const oDateFormat = DateFormat.getDateInstance({ pattern: "dd-MM-yyyy" });
            return oDateFormat.format(new Date(value));
        },
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
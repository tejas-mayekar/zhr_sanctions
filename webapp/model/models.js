sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/Device"
], (JSONModel, ODataModel, Device) => {
    "use strict";

    const ODATA_SERVICE_URL = "/sap/opu/odata/sap/ZHR_SACTIONS_APPLICATION_SRV/";

    return {

        /**
         * Create a one-way JSONModel from sap.ui.Device — used for responsive rendering.
         */
        createDeviceModel() {
            const model = new JSONModel(Device);
            model.setDefaultBindingMode("OneWay");
            return model;
        },

        /**
         * Create the main OData V2 model pointing at the sanctions service.
         */
        createODataModel() {
            return new ODataModel(ODATA_SERVICE_URL, {
                json:             true,
                loadMetadataAsync:true,
                useBatch:         false
            });
        }
    };
});
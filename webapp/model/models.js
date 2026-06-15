sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/Device"
], (JSONModel, ODataModel, Device) => {
    "use strict";

    const SERVICE_URL = "/sap/opu/odata/sap/ZHR_SACTIONS_APPLICATION_SRV/";

    return {

        createDeviceModel() {
            const oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        createODataModel() {
            return new ODataModel(SERVICE_URL, {
                json:              true,
                loadMetadataAsync: true,
                useBatch:          false
            });
        }
    };
});
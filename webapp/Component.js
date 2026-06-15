sap.ui.define([
    "sap/ui/core/UIComponent",
    "zhrsanctions/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("zhrsanctions.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");
            this.setModel(models.createODataModel(), "mainService");

            this.getRouter().initialize();
        }
    });
});
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.View1", {
        onInit() {
        },
        	onModelRefresh: function() {
			this.getTable().getBinding().refresh(true);
		},
    });
});
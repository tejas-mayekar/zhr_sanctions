sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], (BaseController, JSONModel) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.OldViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                punchIn: "", punchOut: "", reason: ""
            }), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteOldViolationDetailpage")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
            this.getView().getModel("regularize").setData({
                punchIn: "", punchOut: "", reason: ""
            });
        }

        // onNavBack inherited from BaseController
    });
});
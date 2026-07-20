sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils"
], (BaseController, JSONModel, ODataUtils) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.OldViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                isEditOn: false
            }));
            this.getView().setModel(new JSONModel({
                punchIn: "", punchOut: "", reason: ""
            }), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteOldViolationDetailpage")
                .attachPatternMatched(this._onRouteMatched, this);

            this.getView()
                .getModel()
                .setProperty("/isEditOn", false);

        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
            this.getView().getModel("regularize").setData({
                punchIn: "", punchOut: "", reason: ""
            });

            const violationRec = oDetailModel?.getData().record;
            this.loadMediaFiles(violationRec);
        },

        onMediaFilePress(oEvent) {
            const ctx = oEvent.getSource().getBindingContext("media");
            if (!ctx) { return; }
            this.downloadMediaFile(ctx.getObject());
        },
        onViewRemarkPress() {
            if (!this._addRemark) {
                this._addRemark = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.AddRemarkDialog",
                    this
                );
                this.getView().addDependent(this._addRemark);
            }

            const violationRec = this.getView().getModel("detailData").getData().record;
            this.loadRemarks(violationRec, this._addRemark).catch((err) => {
                console.error("RemarksSet fetch failed:", err);
                sap.m.MessageBox.error("Failed to load remarks.");
            });
        },

        formatRemarkColor(text) {
            return BaseController.prototype.formatRemarkColor.call(this, text);
        },

        onViewRemarkCancel() {
            this._addRemark.close();
        }
    });
});
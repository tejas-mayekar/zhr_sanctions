sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/m/MessageBox"
], (BaseController, MessageBox) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.HCReportDetailPage", {

        onInit() {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteHCReportDetailpage")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const detailModel = this.getOwnerComponent().getModel("detailData");
            if (detailModel) {
                this.getView().setModel(detailModel, "detailData");
            }

            const violationRec = detailModel?.getData().record;
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
                console.error("HCReportDetailPage: RemarksSet fetch failed:", err);
                MessageBox.error("Failed to load remarks.");
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
sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController, JSONModel, Filter, FilterOperator) => {
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

            // Now this works because the default model exists
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

            const oDataModel = this.getOwnerComponent().getModel();
            const violationRec = this.getView().getModel("detailData").getData().record;
            oDataModel.setUseBatch(false);
            oDataModel.read("/GET_REMARKSSet", {
                filters: [
                    new Filter("ZactionRefNo", FilterOperator.EQ, violationRec.ZactionRefNo || violationRec.ZACTION_REF_NO)
                ],
                success: (data) => {
                    const remarks = { results: data.results || [] };
                    if (!this.getView().getModel("remarks")) {
                        this.getView().setModel(new JSONModel(remarks), "remarks");
                    } else {
                        this.getView().getModel("remarks").setData(remarks);
                    }
                    this._addRemark.open();
                },
                error: (err) => {
                    console.error("RemarksSet fetch failed:", err);
                    sap.m.MessageBox.error("Failed to load remarks.");
                }
            });
        },

        formatRemarkColor(text) {
            if (!text) { return ""; }
            const t = text.toUpperCase();
            if (t.includes("CEO COMMENTS")) {
                return `<span style="background-color:#c00; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else if (t.includes("EVP COMMENTS")) {
                return `<span style="background-color:#0070c0; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            }
            return `<span style="background-color:transparent; padding:2px 6px; color:#000; border-radius:3px;">${text}</span>`;
        },

        onViewRemarkCancel() {
            this._addRemark.close();
        }
        // onNavBack inherited from BaseController
    });
});
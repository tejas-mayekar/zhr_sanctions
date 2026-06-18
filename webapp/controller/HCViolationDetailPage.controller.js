sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "zhrsanctions/utils/ODataUtils",
], (BaseController, JSONModel, MessageToast, ODataUtils) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.HCViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                isEditOn: false
            }));
            this.getView().setModel(new JSONModel({
                ZincCategory: "",
                ZincType: "",
                reason: "",
                actionOptions: []
            }), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteHCViolationDetailpage")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
            this.getView().getModel("regularize").setData({
                ZincCategory: "",
                ZincType: "",
                reason: "",
                actionOptions: []
            });
        },

        onTakeActionPress() {
            if (!this._oTakeActionDialog) {
                this._oTakeActionDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.TakeActionDialog",
                    this
                );
                this.getView().addDependent(this._oTakeActionDialog);
            }
            this._oTakeActionDialog.open();
        },

        onCloseTakeActionDialog() {
            this._oTakeActionDialog.close();
        },

        onSubmitTakeAction() {
            const oRegularizeModel = this.getView().getModel("regularize");
            const oDetailModel = this.getView().getModel("detailData");
            const oActionData = oRegularizeModel.getData();
            const oRecord = oDetailModel.getData().record;

            // Validate inputs
            if (!oActionData.ZincCategory || !oActionData.ZincType) {
                sap.m.MessageBox.error("Please fill all required fields");
                return;
            }

            // Get OData model and submit
            const oODataModel = this.getOwnerComponent().getModel();

            // Build override payload with action data
            const oOverrides = {
                ZincCategory: oActionData.ZincCategory,
                ZincType: oActionData.ZincType,
                Zlinemanageraction: oActionData.Zlinemanageraction,
                Zlinemanagerremarks: oActionData.reason,
                Zlinemanageractiondate: new Date(),
                Zstatus: "SUBMITTED"
            };

            ODataUtils.submitTakeAction(oODataModel, oRecord, oOverrides)
                .then(() => {
                    MessageToast.show("Action submitted successfully");
                    this._oTakeActionDialog.close();
                    oRegularizeModel.setData({
                        ZincCategory: "",
                        ZincType: "",
                        reason: "",
                        actionOptions: []
                    });
                })
                .catch((oError) => {
                    console.error("Failed to submit action:", oError);
                });
        }
    });
});

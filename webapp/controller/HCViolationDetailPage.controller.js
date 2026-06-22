sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/SearchHelpHandler"
], (BaseController, JSONModel, MessageToast, ODataUtils, ValueHelpHandler) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.HCViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                isEditOn: false
            }));
            this.getView().setModel(new JSONModel({
                ZactionRefNo: "",
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
            if(oDetailModel.getData().record.Zstatus !== "COMPLETED"){
                  this.getView()
                .getModel()
                .setProperty("/isEditOn", true);
            }else{
                 this.getView()
                .getModel()
                .setProperty("/isEditOn", false);
            }
            this.getView().getModel("regularize").setData({
                ZactionRefNo: "",
                ZincCategory: "",
                ZincType: "",
                reason: "",
                actionOptions: []
            });
        },

        onGetCategoryType() {
            var oSelect = this.getView().byId("violation_type");
            if (oSelect) {
                var sKey = oSelect.getSelectedKey();
                this.getView().getModel("regularize").setData({
                    ZincCategory: sKey,
                });
                return sKey;
            }
            return null;
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
        onValueHelpRequest: function (oEvent) {
            var CategoryValue = this.onGetCategoryType()
            if (!CategoryValue) {
                MessageBox.warning("Please select Incident Category before choosing Type.");
                this.byId("violation_type").focus();
                return;
            }
            ValueHelpHandler.openValueHelpDialog(this, oEvent, CategoryValue);
        },

        onValueHelpLiveSearch: function (oEvent) {
            ValueHelpHandler.liveSearchValueHelpDialog(oEvent);
        },

        onValueHelpClose: function (oEvent) {
            // Handled internally by SearchHelpHandler confirm callback
        },
        onSubmitTakeAction() {
            const oRegularizeModel = this.getView().getModel("regularize");
            const oDetailModel = this.getView().getModel("detailData");
            const oActionData = oRegularizeModel.getData();
            const oRecord = oDetailModel.getData().record;

            if (!oActionData.ZincCategory || !oActionData.ZincType) {
                sap.m.MessageBox.error("Please fill all required fields");
                return;
            }

            const oODataModel = this.getOwnerComponent().getModel();
            oODataModel.setUseBatch(false)
            const oOverrides = {
                ZactionRefNo: oRecord.ZactionRefNo,
                ZincCategory: oActionData.ZincCategory,
                ZincType: oActionData.ZincType,
                Zhcopsremark: oActionData.reason,
                Zhcevpactiondate: new Date(),
                Zstatus: "COMPLETED",
                ZlmIdName: ODataUtils.getuserId()   // ← stamp current user
            };

            // Add ODataUtils import at the top of the controller — it's already available
            ODataUtils.submitTakeAction(oODataModel, oRecord, oOverrides)
                .then(() => {
                    sap.m.MessageToast.show("Action submitted successfully");
                    this._oTakeActionDialog.close();
                    oRegularizeModel.setData({
                        ZincCategory: "", ZincType: "", reason: "", actionOptions: []
                    });
                     this.getView()
                .getModel()
                .setProperty("/isEditOn", false);
                })
                .catch((oError) => {
                    console.error("Failed to submit action:", oError);
                });
        }
    });
});

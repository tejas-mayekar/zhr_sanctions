sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/SearchHelpHandler"
], (BaseController, JSONModel, MessageToast, MessageBox, ODataUtils, SearchHelpHandler) => {
    "use strict";

    // ─── Default State ────────────────────────────────────────────────────────

    const EMPTY_ACTION_STATE = {
        ZactionRefNo:  "",
        ZincCategory:  "",
        ZincType:      "",
        ZfirstIncDate: "",
        Zrepeatcount:  "",
        ZincDate:      "",
        isVisible:     false,
        reason:        "",
        actionOptions: []
    };

    // ─── Controller ───────────────────────────────────────────────────────────

    return BaseController.extend("zhrsanctions.controller.HCViolationDetailPage", {

        onInit() {
            // Default model: drive button visibility
            this.getView().setModel(new JSONModel({ isEditOn: false }));

            // regularize model: holds Take Action / Take No Action form state
            this.getView().setModel(new JSONModel({ ...EMPTY_ACTION_STATE }), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteHCViolationDetailpage")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        // ── Route Handler ─────────────────────────────────────────────────────

        _onRouteMatched() {
            const detailModel = this.getOwnerComponent().getModel("detailData");
            if (detailModel) {
                this.getView().setModel(detailModel, "detailData");
            }

            // Show action buttons only when the record is still open
            const isOpen = detailModel?.getData().record?.Zstatus !== "COMPLETED";
            this.getView().getModel().setProperty("/isEditOn", isOpen);

            // Reset action form
            this.getView().getModel("regularize").setData({ ...EMPTY_ACTION_STATE });
        },

        // ── Violation Category Helper ─────────────────────────────────────────

        /**
         * Read the currently selected violation category from the dropdown.
         * Side-effect: writes it into the regularize model.
         * Returns the selected key, or null if nothing is selected.
         */
        _getSelectedCategory() {
            const categorySelect = this.getView().byId("violation_type");
            if (!categorySelect) { return null; }

            const selectedKey = categorySelect.getSelectedKey();
            this.getView().getModel("regularize").setProperty("/ZincCategory", selectedKey);
            return selectedKey || null;
        },

        // ── Take Action Dialog ────────────────────────────────────────────────

        onTakeActionPress() {
            if (!this._takeActionDialog) {
                this._takeActionDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.TakeActionDialog",
                    this
                );
                this.getView().addDependent(this._takeActionDialog);
            }
            this._takeActionDialog.open();
        },

        onCloseTakeActionDialog() {
            this._takeActionDialog.close();
        },

        onSubmitTakeAction() {
            const actionData   = this.getView().getModel("regularize").getData();
            const violationRec = this.getView().getModel("detailData").getData().record;

            if (!actionData.ZincCategory || !actionData.ZincType) {
                MessageBox.error("Please fill all required fields");
                return;
            }

            this._submitHCAction(violationRec, {
                ZactionRefNo:   violationRec.ZactionRefNo,
                ZincCategory:   actionData.ZincCategory,
                ZincType:       actionData.ZincType,
                Zhcopsremark:   actionData.reason,
                Zhcevpactiondate: new Date(),
                Zstatus:        "COMPLETED",
                ZlmIdName:      ODataUtils.getCurrentUserId()
            }, () => this._takeActionDialog.close());
        },

        // ── Take No Action Dialog ─────────────────────────────────────────────

        onTakeNoActionPress() {
            if (!this._takeNoActionDialog) {
                this._takeNoActionDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.TakeNoActionDialog",
                    this
                );
                this.getView().addDependent(this._takeNoActionDialog);
            }
            this._takeNoActionDialog.open();
        },

        onCloseTakeNoActionDialog() {
            this._takeNoActionDialog.close();
        },

        onSubmitTakeNoAction() {
            const actionData   = this.getView().getModel("regularize").getData();
            const violationRec = this.getView().getModel("detailData").getData().record;

            this._submitHCAction(violationRec, {
                ZactionRefNo:     violationRec.ZactionRefNo,
                Zhcopsremark:     actionData.reason,
                Zrepeatcount:     actionData.Zrepeatcount,
                Zhcevpactiondate: new Date(),
                Zstatus:          "COMPLETED",
                ZlmIdName:        ODataUtils.getCurrentUserId()
            }, () => this._takeNoActionDialog.close());
        },

        // ── Value Help ────────────────────────────────────────────────────────

        onValueHelpRequest(oEvent) {
            const category = this._getSelectedCategory();
            if (!category) {
                MessageBox.warning("Please select Incident Category before choosing Type.");
                this.byId("violation_type").focus();
                return;
            }
            SearchHelpHandler.openValueHelpDialog(this, oEvent, category);
        },

        onValueHelpLiveSearch(oEvent) {
            SearchHelpHandler.onLiveSearch(oEvent);
        },

        onValueHelpClose() {
            // Selection handling is done inside SearchHelpHandler.onConfirm
        },

        // ── Private: Shared Submit ────────────────────────────────────────────

        /**
         * PUT to ITM_STRSet with the given overrides, then close the active dialog.
         *
         * @param {object}   violationRecord
         * @param {object}   overrides        - fields specific to this action
         * @param {Function} closeDialog      - called on success to close the dialog
         */
        _submitHCAction(violationRecord, overrides, closeDialog) {
            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            ODataUtils.submitHCAction(oDataModel, violationRecord, overrides)
                .then(() => {
                    MessageToast.show("Action submitted successfully");
                    closeDialog();
                    this.getView().getModel("regularize").setData({ ...EMPTY_ACTION_STATE });
                    this.getView().getModel().setProperty("/isEditOn", false);
                })
                .catch(error => {
                    console.error("HCViolationDetailPage: failed to submit action:", error);
                });
        }
    });
});
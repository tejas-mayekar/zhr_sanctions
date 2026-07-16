sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/SearchHelpHandler",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController, JSONModel, MessageToast, MessageBox, ODataUtils, SearchHelpHandler, Filter, FilterOperator) => {
    "use strict";
    // add near top of HCViolationDetailPage.controller.js, after other helper fns
    function toTimeStr(edmTime) {
        return ODataUtils.formatEdmTime(edmTime) || "";
    }
    function timeToSec(t) {
        if (!t) { return 0; }
        const [h, m, s = "0"] = t.split(":");
        return (parseInt(h, 10) || 0) * 3600 + (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
    }
    function hasTimeDiff(record) {
        const schIn = toTimeStr(record.ZschTimeIn);
        const schOut = toTimeStr(record.ZschTimeOut);
        const pIn = toTimeStr(record.Zpunchintime);
        const pOut = toTimeStr(record.Zpunchouttime);
        const delay = schIn && pIn && timeToSec(pIn) > timeToSec(schIn);
        const short = schOut && pOut && timeToSec(pOut) < timeToSec(schOut);
        return delay || short;
    }
    // ─── Default State ────────────────────────────────────────────────────────
    function timeStringToSeconds(timeStr) {
        if (!timeStr) { return 0; }
        const [hh, mm, ss = "0"] = timeStr.split(":");
        return (parseInt(hh, 10) || 0) * 3600
            + (parseInt(mm, 10) || 0) * 60
            + (parseInt(ss, 10) || 0);
    }

    /**
     * Convert total seconds → zero-padded "HH:mm:ss".
     */
    function secondsToTimeString(totalSeconds) {
        if (totalSeconds < 0) { totalSeconds = 0; }
        const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const ss = String(totalSeconds % 60).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
    }
    const EMPTY_ACTION_STATE = {
        ZactionRefNo: "",
        ZincCategory: "",
        ZincType: "",
        ZfirstIncDate: "",
        ZincTypeDesc: "",
        Zrepeatcount: "",
        Zsysrepeatcount: "",
        ZincDate: "",
        isVisible: false,
        reason: "",
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
            const isOpen = detailModel?.getData().record?.Zstatus !== "4";
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
            const regularizeModel = this.getView().getModel("regularize");
            regularizeModel.setProperty("/Zrepeatcount", 0);
            regularizeModel.setProperty("/ZfirstIncDate", 0);
            regularizeModel.setProperty("/isVisible", false);
            regularizeModel.setProperty("/ZincTypeDesc", "");
            regularizeModel.setProperty("/ZincType", "");
            this._takeActionDialog.open();
        },

        onCloseTakeActionDialog() {
            this._takeActionDialog.close();
        },
        onRepeatCountChange(oEvent) {
            const actionData = this.getView().getModel("regularize").getData();

            const oInput = oEvent.getSource();
            const newValue = oInput.getValue();
            if (actionData.Zrepeatcount < parseInt(newValue)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Repeat count cannot be greater than system repeat count");
            }
            else {
                oInput.setValueState("None");
            }
        },
        onSubmitTakeAction() {
            const actionData = this.getView().getModel("regularize").getData();
            const violationRec = this.getView().getModel("detailData").getData().record;

            if (!actionData.ZincCategory || !actionData.ZincType) {
                MessageBox.error("Please fill all required fields");
                return;
            }
            if (!actionData.Zsysrepeatcount || actionData.Zsysrepeatcount === "0") {
                MessageBox.error("System repeat count is required");
                return;
            }
            if (actionData.Zrepeatcount < actionData.Zsysrepeatcount) {
                MessageBox.error("Repeat count cannot be greater than system repeat count");
                return;
            }
            if (actionData.Zsysrepeatcount > 4) {
                MessageBox.error("Repeat count cannot be more than 4");
                return;
            }
            if (actionData.reason.trim() === "") {
                MessageBox.error("Please provide a reason for taking action");
                return;
            }
            this._submitHCAction(violationRec, {
                ZactionRefNo: violationRec.ZactionRefNo,
                ZincCategory: actionData.ZincCategory,
                ZincType: actionData.ZincType,
                Zhcopsremark: actionData.reason,
                Zhcevpactiondate: new Date(),
                Zstatus: "4",
                Zsysyrepeatcount: parseInt(actionData.Zsysrepeatcount),
                ZlmIdName: ODataUtils.getCurrentUserId(),
                Zhcopsname: ODataUtils.getCurrentUserName(),
            }, () => this._takeActionDialog.close());
        },

        // ── Take No Action Dialog ─────────────────────────────────────────────
        // replace onTakeNoActionPress
        onTakeNoActionPress() {
            const violationRec = this.getView().getModel("detailData").getData().record;

            if (hasTimeDiff(violationRec) || (parseInt(violationRec.ZunautDays, 10) || 0) > 0) {
                this._populateRegularizeModel(violationRec);
                this._openRegularizeDialog();
                return;
            }

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
        _populateRegularizeModel(record) {
            const schIn = toTimeStr(record.ZschTimeIn);
            const schOut = toTimeStr(record.ZschTimeOut);
            const pIn = toTimeStr(record.Zpunchintime);
            const pOut = toTimeStr(record.Zpunchouttime);
            const unautDays = parseInt(record.ZunautDays, 10) || 0;
            const hasUnauth = unautDays > 0;
            const hasDelay = schIn && pIn && timeToSec(pIn) > timeToSec(schIn);
            const hasShort = schOut && pOut && timeToSec(pOut) < timeToSec(schOut);
            const hasBoth = hasDelay && hasShort;
            const mode = hasBoth ? "both" : hasDelay ? "delay" : "short";

            const state = {
                dialogTitle: hasUnauth ? "Regularize Unauthorized Absence" : "Regularize Attendance",
                scheduledIn: schIn,
                scheduledOut: schOut,
                punchIn: pIn,
                punchOut: pOut,
                delayHrs: record.ZdelayHrs || "0:00",
                shortHrs: record.ZshortHrs || "0:00",
                hasDelay: hasUnauth ? false : hasDelay,
                hasShort: hasUnauth ? false : hasShort,
                showModeSelector: hasUnauth ? false : hasBoth,
                showDelay: hasUnauth ? false : (hasBoth ? hasDelay : mode === "delay"),
                showShort: hasUnauth ? false : (hasBoth ? hasShort : mode === "short"),
                showUnauth: hasUnauth,
                unauthPunchIn: schIn,
                unauthPunchOut: schOut,
                mode: hasUnauth ? "unauth" : mode,
                delayFrom: schIn,
                delayTo: secondsToTimeString(timeStringToSeconds(pIn) - 1),
                shortFrom: secondsToTimeString(timeStringToSeconds(pOut) + 1),
                shortTo: schOut,
                reason: ""
            };

            this.getView().getModel("regularize").setData(state);
        },
        onRegularizeSubmit() {
            const state = this.getView().getModel("regularize").getData();
            const reason = (state.reason || "").trim();
            if (!reason) {
                MessageBox.warning("Please enter a reason before submitting.");
                return;
            }

            const record = this.getView().getModel("detailData").getData().record;
            const delayFlag = state.showUnauth ? "4"
                : state.showDelay && state.showShort ? "3"
                    : state.showDelay ? "1" : "2";

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            sap.ui.core.BusyIndicator.show(0);

            ODataUtils.submitPunchRegularize(oDataModel, record, {
                ZschTimeIn: state.showUnauth ? state.unauthPunchIn : state.delayFrom,
                Zpunchintime: state.showUnauth ? state.unauthPunchIn : state.delayTo,
                Zpunchouttime: state.showUnauth ? state.unauthPunchOut : state.shortFrom,
                ZschTimeOut: state.showUnauth ? state.unauthPunchOut : state.shortTo,
                DelayFlag: delayFlag
            })
                .then(() => ODataUtils.submitHCAction(oDataModel, record, {
                    Zaction: "A",
                    Zhcopsremark: reason,
                    Zstatus: "4",
                    Zhcopsname: ODataUtils.getCurrentUserName(),
                }))
                .then(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Regularization submitted successfully.");
                    this._regularizeDialog.close();
                    this.getView().getModel("regularize").setData({ ...EMPTY_ACTION_STATE });
                    this.getView().getModel().setProperty("/isEditOn", false);
                })
                .catch((err) => {
                    sap.ui.core.BusyIndicator.hide();
                    console.error("HCViolationDetailPage: regularize submit failed:", err);
                });
        },

        onRegularizeCancel() {
            this._regularizeDialog.close();
        },
        _openRegularizeDialog() {
            if (!this._regularizeDialog) {
                this._regularizeDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.RegularizeDialog",
                    this
                );
                this.getView().addDependent(this._regularizeDialog);
            }
            this._regularizeDialog.open();
        },


        onCloseTakeNoActionDialog() {
            this._takeNoActionDialog.close();
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
            oDataModel.setUseBatch(false)
            oDataModel.read("/GET_REMARKSSet", {
                filters: [
                    new Filter("ZactionRefNo", FilterOperator.EQ, violationRec.ZactionRefNo)
                ],
                success: (data) => {
                    // Extract the results array from the OData response
                    const remarks = {
                        results: data.results || []
                    };

                    if (!this.getView().getModel("remarks")) {
                        this.getView().setModel(new JSONModel(remarks), "remarks");
                    } else {
                        this.getView().getModel("remarks").setData(remarks);
                    }
                    this._addRemark.open();
                },
                error: (err) => {
                    console.error("RemarksSet fetch failed:", err);
                    MessageBox.error("Failed to load remarks.");
                }
            });
        },
        formatRemarkColor(text) {
            if (!text) { return ""; }
            const t = text.toUpperCase();
            let bg = "transparent";
            if (t.includes("CEO COMMENTS")) {
                bg = "#c00";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else if (t.includes("EVP COMMENTS")) {
                bg = "#0070c0";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else if (t.includes("HC COMMENTS")) {
                bg = "#9b7dbe";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else if (t.includes("LINE MANAGER COMMENTS")) {
                bg = "#31c699";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else {
                return `<span style="background-color:${bg}; padding:2px 6px; color:#000; border-radius:3px;">${text}</span>`;
            }
        },
        onViewRemarkCancel() {
            this._addRemark.close();
        },
        onSubmitTakeNoAction() {
            const actionData = this.getView().getModel("regularize").getData();
            const violationRec = this.getView().getModel("detailData").getData().record;
            function parseByteField(value) {
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? 0 : parsed;
            }
            if (actionData.reason.trim() === "") {
                MessageBox.error("Please provide a reason for taking action");
                return;
            }
            this._submitHCAction(violationRec, {
                ZactionRefNo: violationRec.ZactionRefNo,
                Zhcopsremark: actionData.reason,
                Zrepeatcount: parseByteField(actionData.Zrepeatcount),
                Zhcevpactiondate: new Date(),
                Zstatus: "4",
                ZlmIdName: ODataUtils.getCurrentUserId(),
                Zhcopsname: ODataUtils.getCurrentUserName(),
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
        onPayrollDeductionPress() {
            const violationRec = this.getView().getModel("detailData").getData().record;
            if (!violationRec?.ZactionRefNo) {
                MessageBox.error("No violation record loaded. Cannot submit Payroll Deduction.");
                return;
            }

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            sap.ui.core.BusyIndicator.show(0);
            ODataUtils.submitHCAction(oDataModel, violationRec, {
                Zaction: "B",
                Zstatus: "4"
            })
                .then(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Payroll Deduction submitted successfully.");
                    this.onNavBack();
                })
                .catch((error) => {
                    sap.ui.core.BusyIndicator.hide();
                    console.error("HCViolationDetailPage: payroll deduction update failed:", error);
                });
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
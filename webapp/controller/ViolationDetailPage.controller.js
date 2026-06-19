sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils"
], (BaseController, Fragment, JSONModel, MessageToast, MessageBox, ODataUtils) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.ViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                punchIn: "",
                punchOut: "",
                reason: ""
            }), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteViolationDetailPage")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
        },

        // ── Regularize ────────────────────────────────────────────────────────

        onRegularizePress() {
            const oRecord = this.getView().getModel("detailData").getProperty("/record");
            this.getView().getModel("regularize").setData({
                punchIn: ODataUtils.formatEdmTime(oRecord.Zpunchintime),
                punchOut: ODataUtils.formatEdmTime(oRecord.Zpunchouttime),
                reason: ""
            });
            this._openRegularizeDialog();
        },
        // ── Report To HC ──────────────────────────────────────────────────────

        onReportToHCPress() {
            const oRecord = this.getView().getModel("detailData").getProperty("/record");
            this.getView().getModel("regularize").setData({
                reason: ""
            });
            this._openReportToHCDialog();
        },

        _openReportToHCDialog() {
            if (!this._oReportToHCDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "zhrsanctions.view.fragments.ReportToHCDialog",
                    controller: this
                }).then(oDialog => {
                    this._oReportToHCDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.setModel(this.getView().getModel("detailData"), "detailData");
                    oDialog.setModel(this.getView().getModel("regularize"), "regularize");
                    oDialog.open();
                });
            } else {
                this._oReportToHCDialog.open();
            }
        },

        onReportToHCSubmit() {
            const oRegModel = this.getView().getModel("regularize");
            const sReason = oRegModel.getProperty("/reason").trim();

            if (!sReason) {
                MessageBox.warning("Please enter a reason before submitting.");
                return;
            }

            const oRecord = this.getView().getModel("detailData").getProperty("/record");
            if (!oRecord || !oRecord.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Report To HC.");
                return;
            }

            const oPayload = ODataUtils.buildITMPayload(oRecord, {
                Zaction: "Report To HC",
                Zlinemanagerremarks: sReason
            });

            this._submitITM(oPayload, "Report to HC submitted successfully.", () => {
                this._closeReportToHCDialog();
                this.onNavBack();
            }, "Error submitting Report to HC");
        },

        onReportToHCCancel() {
            this._closeReportToHCDialog();
        },

        _closeReportToHCDialog() {
            if (this._oReportToHCDialog) {
                this._oReportToHCDialog.close();
            }
        },
        _openRegularizeDialog() {
            if (!this._oRegularizeDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "zhrsanctions.view.fragments.RegularizeDialog",
                    controller: this
                }).then(oDialog => {
                    this._oRegularizeDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.setModel(this.getView().getModel("detailData"), "detailData");
                    oDialog.setModel(this.getView().getModel("regularize"), "regularize");
                    oDialog.open();
                });
            } else {
                this._oRegularizeDialog.open();
            }
        },

        onRegularizeSubmit() {
            const oRegModel = this.getView().getModel("regularize");
            const sPunchIn = oRegModel.getProperty("/punchIn");
            const sPunchOut = oRegModel.getProperty("/punchOut");
            const sReason = oRegModel.getProperty("/reason").trim();

            if (!sPunchIn || !sPunchOut || !sReason) {
                MessageBox.warning("Please fill in Punch In Time, Punch Out Time, and Reason before submitting.");
                return;
            }
            if (sPunchIn >= sPunchOut) {
                MessageBox.warning("Punch Out time must be later than Punch In time.");
                return;
            }

            const oRecord = this.getView().getModel("detailData").getProperty("/record");
            if (!oRecord || !oRecord.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Regularization.");
                return;
            }

            const oPayload = ODataUtils.buildITMPayload(oRecord, {
                Zaction: "Regularized",
                Zlinemanagerremarks: sReason,
                Zpunchintime: ODataUtils.formatTimeForPayload(sPunchIn),
                Zpunchouttime: ODataUtils.formatTimeForPayload(sPunchOut),
                Zstatus: "COMPLETED"
            });

            this._submitITM(oPayload, "Regularization submitted successfully.", () => {
                this._closeRegularizeDialog();
                this.onNavBack();
            }, "Error submitting Regularization");
        },

        onRegularizeCancel() {
            this._closeRegularizeDialog();
        },

        _closeRegularizeDialog() {
            if (this._oRegularizeDialog) {
                this._oRegularizeDialog.close();
            }
        },

        // ── Payroll Deduction ─────────────────────────────────────────────────

        onPayrollDeductionPress() {
            const oRecord = this.getView().getModel("detailData").getProperty("/record");
            if (!oRecord || !oRecord.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Payroll Deduction.");
                return;
            }

            const oPayload = ODataUtils.buildITMPayload(oRecord, {
                Zaction: "Payroll Deduction"
            });

            this._submitITM(oPayload, "Payroll Deduction submitted successfully.",
                () => this.onNavBack(),
                "Error submitting Payroll Deduction"
            );
        },

        // ── Shared Submit ─────────────────────────────────────────────────────

        _submitITM(oPayload, sSuccessMsg, fnSuccess, sErrorTitle) {
            console.log("ITM_STRSet payload:", oPayload);

            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            if (!oModel) {
                MessageBox.warning(
                    "No active OData service connected. Payload logged to console:\n" +
                    JSON.stringify(oPayload, null, 2)
                );
                return;
            }

            sap.ui.core.BusyIndicator.show(0);
            oModel.create("/ITM_STRSet", oPayload, {
                success: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(sSuccessMsg);
                    fnSuccess();
                },
                error: (oErr) => {
                    sap.ui.core.BusyIndicator.hide();
                    ODataUtils.handleODataError(oErr, sErrorTitle);
                }
            });
        }
    });
});
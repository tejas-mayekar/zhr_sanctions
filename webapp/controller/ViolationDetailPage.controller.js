sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils"
], (BaseController, Fragment, JSONModel, MessageToast, MessageBox, ODataUtils) => {
    "use strict";

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Convert an OData Edm.Time value (or "HH:mm:ss" string) to "HH:mm:ss".
     * Returns "" on null / undefined.
     */
    function toTimeStr(oTime) {
        return ODataUtils.formatEdmTime(oTime) || "";
    }

    /**
     * Parse "HH:mm:ss" → total seconds. Returns 0 on bad input.
     */
    function toSeconds(sTime) {
        if (!sTime) { return 0; }
        const parts = sTime.split(":");
        if (parts.length < 2) { return 0; }
        return (parseInt(parts[0], 10) || 0) * 3600
            + (parseInt(parts[1], 10) || 0) * 60
            + (parseInt(parts[2], 10) || 0);
    }

    /**
     * Format total seconds → "HH:mm:ss".
     */
    function fromSeconds(iTotalSec) {
        if (iTotalSec < 0) { iTotalSec = 0; }
        const hh = String(Math.floor(iTotalSec / 3600)).padStart(2, "0");
        const mm = String(Math.floor((iTotalSec % 3600) / 60)).padStart(2, "0");
        const ss = String(iTotalSec % 60).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
    }

    /**
     * Determine whether a time field carries a non-zero value.
     * Handles Edm.Time objects, numeric ms, "HH:mm:ss" strings, or falsy.
     */
    function hasNonZeroTime(oTime) {
        if (!oTime) { return false; }
        const s = toTimeStr(oTime);
        return s !== "" && s !== "00:00:00";
    }

    /**
     * Format "HH:mm:ss" → "dd-MM-yyyy HH:mm:ss" display string
     * using the incident date string already stored in the regularize model.
     */
    function buildDisplayDateTime(sDate, sTime) {
        if (!sDate || !sTime) { return sTime || ""; }
        return `${sDate} ${sTime}`;
    }

    // ── Controller ─────────────────────────────────────────────────────────────

    return BaseController.extend("zhrsanctions.controller.ViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel(this._emptyRegularizeModel()), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteViolationDetailPage")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _emptyRegularizeModel() {
            return {
                // display labels
                dialogTitle: "Regularize Attendance",
                scheduledIn: "",
                scheduledOut: "",
                punchIn: "",
                punchOut: "",
                delayHrs: "",
                shortHrs: "",
                incidentDate: "",

                // flags
                hasDelay: false,
                hasShort: false,
                showModeSelector: false,

                // mode: "delay" | "short" | "both"
                mode: "both",

                // section visibility (derived from mode + flags)
                showDelay: false,
                showShort: false,

                // editable time fields
                delayFrom: "",
                delayTo: "",
                shortFrom: "",
                shortTo: "",

                reason: ""
            };
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
            this._buildRegularizeModel(oRecord);
            this._openRegularizeDialog();
        },

        /**
         * Build the regularize model from the current violation record.
         * Determines which sections apply (delay / short / both) and
         * pre-fills the From/To time fields to close each gap.
         */
        _buildRegularizeModel(oRecord) {
            const sSchIn = toTimeStr(oRecord.ZschTimeIn);
            const sSchOut = toTimeStr(oRecord.ZschTimeOut);
            const sPunchIn = toTimeStr(oRecord.Zpunchintime);
            const sPunchOut = toTimeStr(oRecord.Zpunchouttime);

            // Determine whether delay / short exist.
            // The backend may supply ZdelayHrs / ZshortHrs as numeric strings ("00:15"),
            // numbers (minutes), or time objects — check them, but also fall back to
            // comparing scheduled vs actual times directly.
            const hasDelay = hasNonZeroTime(oRecord.ZdelayHrs) || (
                sPunchIn && sSchIn && toSeconds(sPunchIn) > toSeconds(sSchIn)
            );
            const hasShort = hasNonZeroTime(oRecord.ZshortHrs) || (
                sPunchOut && sSchOut && toSeconds(sPunchOut) < toSeconds(sSchOut)
            );

            const showBoth = hasDelay && hasShort;

            // Default mode when both apply → "both"; otherwise whichever is relevant
            let sMode = "both";
            if (hasDelay && !hasShort) { sMode = "delay"; }
            if (hasShort && !hasDelay) { sMode = "short"; }

            // Derive a display date string from ZincDate
            const sIncDate = this._formatDisplayDate(oRecord.ZincDate);

            // Format ZdelayHrs / ZshortHrs for display
            const sDelayDisp = this._formatHrsDisplay(oRecord.ZdelayHrs);
            const sShortDisp = this._formatHrsDisplay(oRecord.ZshortHrs);

            const oModel = {
                dialogTitle: showBoth ? "Regularize Both" : hasDelay ? "Regularize Delay" : "Regularize Short Hours",
                scheduledIn: buildDisplayDateTime(sIncDate, sSchIn),
                scheduledOut: buildDisplayDateTime(sIncDate, sSchOut),
                punchIn: buildDisplayDateTime(sIncDate, sPunchIn),
                punchOut: buildDisplayDateTime(sIncDate, sPunchOut),
                delayHrs: sDelayDisp,
                shortHrs: sShortDisp,
                incidentDate: sIncDate,

                hasDelay,
                hasShort,
                showModeSelector: showBoth,

                mode: sMode,

                // Delay gap: scheduled-in → actual punch-in
                delayFrom: sSchIn,
                delayTo: sPunchIn,

                // Short gap: actual punch-out → scheduled-out
                shortFrom: sPunchOut,
                shortTo: sSchOut,

                reason: ""
            };

            // Derive section visibility from mode
            Object.assign(oModel, this._sectionVisibility(sMode, hasDelay, hasShort));

            this.getView().getModel("regularize").setData(oModel);
        },

        /**
         * Returns { showDelay, showShort } based on current mode and available flags.
         */
        _sectionVisibility(sMode, hasDelay, hasShort) {
            return {
                showDelay: sMode === "both" ? hasDelay : sMode === "delay",
                showShort: sMode === "both" ? hasShort : sMode === "short"
            };
        },

        onRegularizeModeChange(oEvent) {
            const oModel = this.getView().getModel("regularize");
            const sMode = oEvent.getParameter("item").getKey();
            const hasDelay = oModel.getProperty("/hasDelay");
            const hasShort = oModel.getProperty("/hasShort");

            oModel.setProperty("/mode", sMode);
            const vis = this._sectionVisibility(sMode, hasDelay, hasShort);
            oModel.setProperty("/showDelay", vis.showDelay);
            oModel.setProperty("/showShort", vis.showShort);

            // Update dialog title
            const titles = { delay: "Regularize Delay", short: "Regularize Short Hours", both: "Regularize Both" };
            oModel.setProperty("/dialogTitle", titles[sMode] || "Regularize Attendance");
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
            const oData = oRegModel.getData();
            const sReason = (oData.reason || "").trim();

            // ── Validation ─────────────────────────────────────────────────
            if (!sReason) {
                MessageBox.warning("Please enter a reason before submitting.");
                return;
            }

            if (oData.showDelay) {
                if (!oData.delayFrom || !oData.delayTo) {
                    MessageBox.warning("Please fill in both Delay From and To times.");
                    return;
                }
                if (toSeconds(oData.delayTo) <= toSeconds(oData.delayFrom)) {
                    MessageBox.warning("Delay 'To Time' must be later than 'From Time'.");
                    return;
                }
            }

            if (oData.showShort) {
                if (!oData.shortFrom || !oData.shortTo) {
                    MessageBox.warning("Please fill in both Short Hours From and To times.");
                    return;
                }
                if (toSeconds(oData.shortTo) <= toSeconds(oData.shortFrom)) {
                    MessageBox.warning("Short Hours 'To Time' must be later than 'From Time'.");
                    return;
                }
            }

            const oRecord = this.getView().getModel("detailData").getProperty("/record");
            if (!oRecord || !oRecord.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Regularization.");
                return;
            }

            // ── Derive corrected punch times ────────────────────────────────
            let sCorrectedPunchIn = toTimeStr(oRecord.Zpunchintime);
            let sCorrectedPunchOut = toTimeStr(oRecord.Zpunchouttime);

            if (oData.showDelay) {
                sCorrectedPunchIn = oData.delayFrom;
            }
            if (oData.showShort) {
                sCorrectedPunchOut = oData.shortTo;
            }

            // ── Determine DelayFlag ─────────────────────────────────────────
            // "1" when regularizing delay, "0" when short-only
            const sDelayFlag = oData.showDelay ? "1" : "0";

            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            if (!oModel) {
                MessageBox.warning("No active OData service connected.");
                return;
            }

            // ── Build the ITM_STRSet create payload (step 1) ────────────────
            const oITMPayload = ODataUtils.buildITMPayload(oRecord, {
                Zaction: "Regularized",
                Zlinemanagerremarks: sReason,
                Zpunchintime: ODataUtils.formatTimeForPayload(sCorrectedPunchIn),
                Zpunchouttime: ODataUtils.formatTimeForPayload(sCorrectedPunchOut),
                Zstatus: "COMPLETED"
            });

            sap.ui.core.BusyIndicator.show(0);

            // Step 1: create ITM_STRSet. Step 2 (only on step 1 success): PUT to
            // punch_regularizeSet with the corrected punch times / DelayFlag.
            oModel.create("/ITM_STRSet", oITMPayload, {
                success: () => {
                    ODataUtils.submitPunchRegularize(oModel, oRecord, {
                        Zpunchintime: sCorrectedPunchIn,
                        Zpunchouttime: sCorrectedPunchOut,
                        DelayFlag: sDelayFlag
                    })
                        .then(() => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("Regularization submitted successfully.");
                            this._closeRegularizeDialog();
                            this.onNavBack();
                        })
                        .catch((oPunchError) => {
                            sap.ui.core.BusyIndicator.hide();
                            // ITM_STRSet create already succeeded; submitPunchRegularize already
                            // surfaced the error via handleODataError. Log for traceability —
                            // the ITM_STRSet record exists even though the punch PUT failed.
                            console.error("Punch regularize PUT failed after successful ITM_STRSet create:", oPunchError);
                        });
                },
                error: (oErr) => {
                    sap.ui.core.BusyIndicator.hide();
                    ODataUtils.handleODataError(oErr, "Error submitting Regularization");
                }
            });
        },

        onRegularizeCancel() {
            this._closeRegularizeDialog();
        },

        _closeRegularizeDialog() {
            if (this._oRegularizeDialog) {
                this._oRegularizeDialog.close();
            }
        },

        // ── Report To HC ──────────────────────────────────────────────────────

        onReportToHCPress() {
            this.getView().getModel("regularize").setData(
                Object.assign(this._emptyRegularizeModel(), { reason: "" })
            );
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
            const sReason = (this.getView().getModel("regularize").getProperty("/reason") || "").trim();
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
            if (this._oReportToHCDialog) { this._oReportToHCDialog.close(); }
        },

        // ── Payroll Deduction ─────────────────────────────────────────────────

        onPayrollDeductionPress() {
            const oRecord = this.getView().getModel("detailData").getProperty("/record");
            if (!oRecord || !oRecord.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Payroll Deduction.");
                return;
            }
            const oPayload = ODataUtils.buildITMPayload(oRecord, { Zaction: "Payroll Deduction" });
            this._submitITM(oPayload, "Payroll Deduction submitted successfully.",
                () => this.onNavBack(), "Error submitting Payroll Deduction");
        },

        // ── Shared OData submit (used by Report To HC / Payroll Deduction) ────

        _submitITM(oPayload, sSuccessMsg, fnSuccess, sErrorTitle) {
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
        },

        // ── Private formatting helpers ────────────────────────────────────────

        /**
         * Format an OData DateTime value (e.g. "/Date(...)/" or Date object) to "dd-MM-yyyy".
         */
        _formatDisplayDate(vDate) {
            if (!vDate) { return ""; }
            let d;
            if (typeof vDate === "string" && vDate.startsWith("/Date(")) {
                d = new Date(parseInt(vDate.replace(/[^0-9]/g, ""), 10));
            } else if (vDate instanceof Date) {
                d = vDate;
            } else {
                return String(vDate);
            }
            if (isNaN(d.getTime())) { return ""; }
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        },

        /**
         * Convert ZdelayHrs / ZshortHrs to a human-readable string.
         * Backend may send "00:15", a number (minutes), or an Edm.Time object.
         */
        _formatHrsDisplay(oVal) {
            if (!oVal && oVal !== 0) { return "0:00"; }
            // Already a "HH:mm" or "HH:mm:ss" string
            if (typeof oVal === "string" && oVal.includes(":")) { return oVal.substring(0, 5); }
            // Numeric minutes
            if (typeof oVal === "number") {
                const h = Math.floor(oVal / 60);
                const m = oVal % 60;
                return `${h}:${String(m).padStart(2, "0")}`;
            }
            // Edm.Time object
            const s = toTimeStr(oVal);
            return s ? s.substring(0, 5) : "0:00";
        }
    });
});
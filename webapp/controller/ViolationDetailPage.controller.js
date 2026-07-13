sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils"
], (BaseController, Fragment, JSONModel, MessageToast, MessageBox, ODataUtils) => {
    "use strict";

    // ─── Time Helpers ─────────────────────────────────────────────────────────

    /**
     * Convert an OData Edm.Time value (or "HH:mm:ss" string) to "HH:mm:ss".
     * Returns "" for null / undefined.
     */
    function toTimeString(edmTime) {
        return ODataUtils.formatEdmTime(edmTime) || "";
    }

    /**
     * Parse "HH:mm:ss" → total seconds. Returns 0 on bad input.
     */
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

    /**
     * Return true when an OData time field contains a non-zero value.
     */
    function isNonZeroTime(edmTime) {
        if (!edmTime) { return false; }
        const s = toTimeString(edmTime);
        return s !== "" && s !== "00:00:00";
    }

    /**
     * Build a display string "dd-MM-yyyy HH:mm:ss" from separate date and time strings.
     */
    function buildDateTimeDisplayString(dateStr, timeStr) {
        if (!dateStr || !timeStr) { return timeStr || ""; }
        return `${dateStr} ${timeStr}`;
    }

    // ─── Regularize Model Flags ───────────────────────────────────────────────

    /**
     * Map regularization mode + available flags to section visibility booleans.
     */
    function resolveSectionVisibility(mode, hasDelay, hasShort) {
        return {
            showDelay: mode === "both" ? hasDelay : mode === "delay",
            showShort: mode === "both" ? hasShort : mode === "short"
        };
    }

    /**
     * Derive the dialog title from the mode.
     */
    const MODE_TITLE = {
        delay: "Regularize Delay",
        short: "Regularize Short Hours",
        both: "Regularize Both"
    };

    // ─── Controller ───────────────────────────────────────────────────────────

    return BaseController.extend("zhrsanctions.controller.ViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel(this._buildEmptyRegularizeState()), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteViolationDetailPage")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        // ── Route Handler ─────────────────────────────────────────────────────

        _onRouteMatched() {
            const detailModel = this.getOwnerComponent().getModel("detailData");
            if (detailModel) {
                this.getView().setModel(detailModel, "detailData");
            }
        },

        // ── Regularize Dialog ─────────────────────────────────────────────────

        onRegularizePress() {
            const record = this.getView().getModel("detailData").getProperty("/record");
            this._populateRegularizeModel(record);
            this._openDialog("regularize", "zhrsanctions.view.fragments.RegularizeDialog");
        },

        /**
         * Build the regularize model from the violation record.
         * Determines which sections apply (delay / short / both) and
         * pre-fills the From/To time pickers to close each attendance gap.
         */
        _populateRegularizeModel(record) {
            const scheduledIn = toTimeString(record.ZschTimeIn);
            const scheduledOut = toTimeString(record.ZschTimeOut);
            const punchIn = toTimeString(record.Zpunchintime);
            const punchOut = toTimeString(record.Zpunchouttime);

            // Detect delay: ZdelayHrs non-zero AND punch-in is later than scheduled-in
            const hasDelay = isNonZeroTime(record.ZdelayHrs) && (
                !punchIn || !scheduledIn ||
                timeStringToSeconds(punchIn) > timeStringToSeconds(scheduledIn)
            );

            // Detect short: ZshortHrs non-zero AND punch-out is earlier than scheduled-out
            const hasShort = isNonZeroTime(record.ZshortHrs) && (
                !punchOut || !scheduledOut ||
                timeStringToSeconds(punchOut) < timeStringToSeconds(scheduledOut)
            );

            const hasBoth = hasDelay && hasShort;
            const mode = hasBoth ? "both" : hasDelay ? "delay" : "short";

            const incidentDateDisplay = this._formatIncidentDateDisplay(record.ZincDate);

            const state = {
                dialogTitle: hasBoth ? "Regularize Both" : MODE_TITLE[mode],
                scheduledIn: buildDateTimeDisplayString(incidentDateDisplay, scheduledIn),
                scheduledOut: buildDateTimeDisplayString(incidentDateDisplay, scheduledOut),
                punchIn: buildDateTimeDisplayString(incidentDateDisplay, punchIn),
                punchOut: buildDateTimeDisplayString(incidentDateDisplay, punchOut),
                delayHrs: this._formatHoursDisplay(record.ZdelayHrs),
                shortHrs: this._formatHoursDisplay(record.ZshortHrs),
                incidentDate: incidentDateDisplay,
                hasDelay,
                hasShort,
                showModeSelector: hasBoth,
                mode,

                // Delay gap: scheduled-in → (punch-in minus 1 sec)
                delayFrom: scheduledIn,
                delayTo: secondsToTimeString(timeStringToSeconds(punchIn) - 1),

                // Short gap: (punch-out plus 1 sec) → scheduled-out
                shortFrom: secondsToTimeString(timeStringToSeconds(punchOut) + 1),
                shortTo: scheduledOut,

                reason: ""
            };

            Object.assign(state, resolveSectionVisibility(mode, hasDelay, hasShort));

            this.getView().getModel("regularize").setData(state);
        },

        onRegularizeModeChange(oEvent) {
            const regularizeModel = this.getView().getModel("regularize");
            const modeIndex = oEvent.getParameter("selectedIndex");
            const modes = ["delay", "short", "both"];
            const selectedMode = modes[modeIndex] || "both";

            const hasDelay = regularizeModel.getProperty("/hasDelay");
            const hasShort = regularizeModel.getProperty("/hasShort");

            regularizeModel.setProperty("/mode", selectedMode);
            regularizeModel.setProperty("/dialogTitle", MODE_TITLE[selectedMode] || "Regularize Attendance");

            const visibility = resolveSectionVisibility(selectedMode, hasDelay, hasShort);
            regularizeModel.setProperty("/showDelay", visibility.showDelay);
            regularizeModel.setProperty("/showShort", visibility.showShort);
        },

        onRegularizeSubmit() {
            const regularizeModel = this.getView().getModel("regularize");
            const state = regularizeModel.getData();
            const reason = (state.reason || "").trim();

            // ── Validate ──────────────────────────────────────────────────────
            if (!reason) {
                MessageBox.warning("Please enter a reason before submitting.");
                return;
            }

            if (state.showDelay) {
                if (!state.delayFrom || !state.delayTo) {
                    MessageBox.warning("Please fill in both Delay From and To times.");
                    return;
                }
                if (timeStringToSeconds(state.delayTo) <= timeStringToSeconds(state.delayFrom)) {
                    MessageBox.warning("Delay 'To Time' must be later than 'From Time'.");
                    return;
                }
            }

            if (state.showShort) {
                if (!state.shortFrom || !state.shortTo) {
                    MessageBox.warning("Please fill in both Short Hours From and To times.");
                    return;
                }
                if (timeStringToSeconds(state.shortTo) <= timeStringToSeconds(state.shortFrom)) {
                    MessageBox.warning("Short Hours 'To Time' must be later than 'From Time'.");
                    return;
                }
            }

            const record = this.getView().getModel("detailData").getProperty("/record");
            if (!record?.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Regularization.");
                return;
            }

            // ── Derive corrected punch/schedule times by mode ─────────────────
            let correctedSchIn = toTimeString(record.ZschTimeIn);
            let correctedPunchIn = toTimeString(record.Zpunchintime);
            let correctedPunchOut = toTimeString(record.Zpunchouttime);
            let correctedSchOut = toTimeString(record.ZschTimeOut);

            if (state.showDelay && !state.showShort) {
                // DelayFlag = "1": from = ZschTimeIn, to = Zpunchintime
                correctedSchIn = state.delayFrom;
                correctedPunchIn = state.delayTo;

            } else if (state.showShort && !state.showDelay) {
                // DelayFlag = "2": from = Zpunchouttime, to = ZschTimeOut
                correctedPunchOut = state.shortFrom;
                correctedSchOut = state.shortTo;

            } else if (state.showDelay && state.showShort) {
                // DelayFlag = "3": FM called twice (delay + short)
                correctedSchIn = state.delayFrom;
                correctedPunchIn = state.delayTo;
                correctedPunchOut = state.shortFrom;
                correctedSchOut = state.shortTo;
            }

            const delayFlag = state.showDelay && state.showShort ? "3"
                : state.showDelay ? "1"
                    : "2";

            const oDataModel = this.getOwnerComponent().getModel()
                || this.getView().getModel("mainService");
            if (!oDataModel) {
                MessageBox.warning("No active OData service connected.");
                return;
            }

            const itmPayload = ODataUtils.buildITMPayload(record, {
                Zaction: "A",
                Zlinemanagerremarks: reason,
                Zpunchintime: ODataUtils.formatTimeForPayload(correctedPunchIn),
                Zpunchouttime: ODataUtils.formatTimeForPayload(correctedPunchOut),
                Zstatus: "4"
            });

            sap.ui.core.BusyIndicator.show(0);

            // Step 1: PUT punch_regularizeSet
            ODataUtils.submitPunchRegularize(oDataModel, record, {
                ZschTimeIn: correctedSchIn,
                Zpunchintime: correctedPunchIn,
                Zpunchouttime: correctedPunchOut,
                ZschTimeOut: correctedSchOut,
                DelayFlag: delayFlag
            })
                .then(() => {
                    // Step 2: POST ITM_STRSet
                    oDataModel.create("/ITM_STRSet", itmPayload, {
                        success: () => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("Regularization submitted successfully.");
                            this._closeDialog("regularize");
                            this.onNavBack();
                        },
                        error: (error) => {
                            sap.ui.core.BusyIndicator.hide();
                            ODataUtils.handleODataError(error, "Error submitting Regularization");
                        }
                    });
                })
                .catch((punchError) => {
                    sap.ui.core.BusyIndicator.hide();
                    console.error("Punch regularize PUT failed; ITM_STRSet create skipped:", punchError);
                });
        },

        onRegularizeCancel() {
            this._closeDialog("regularize");
        },

        // ── Report To HC Dialog ───────────────────────────────────────────────

        onReportToHCPress() {
            this.getView().getModel("regularize").setData(
                Object.assign(this._buildEmptyRegularizeState(), { reason: "" })
            );
            this._openDialog("reportToHC", "zhrsanctions.view.fragments.ReportToHCDialog");
        },

        onReportToHCSubmit() {
            const reason = (this.getView().getModel("regularize").getProperty("/reason") || "").trim();
            if (!reason) {
                MessageBox.warning("Please enter a reason before submitting.");
                return;
            }

            const record = this.getView().getModel("detailData").getProperty("/record");
            if (!record?.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Report To HC.");
                return;
            }

            const payload = ODataUtils.buildITMPayload(record, {
                Zaction: "C",
                Zlinemanagerremarks: reason
            });

            this._submitToITMSet(payload, "Report to HC submitted successfully.", () => {
                this._closeDialog("reportToHC");
                this.onNavBack();
            }, "Error submitting Report to HC");
        },

        onReportToHCCancel() {
            this._closeDialog("reportToHC");
        },

        // ── Payroll Deduction ─────────────────────────────────────────────────

        onPayrollDeductionPress() {
            const record = this.getView().getModel("detailData").getProperty("/record");
            if (!record?.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Payroll Deduction.");
                return;
            }

            const payload = ODataUtils.buildITMPayload(record, {
                Zaction: "B",
                Zstatus: "4"
            });
            this._submitToITMSet(
                payload,
                "Payroll Deduction submitted successfully.",
                () => this.onNavBack(),
                "Error submitting Payroll Deduction"
            );
        },

        // ── Generic Dialog Helpers ────────────────────────────────────────────

        /**
         * Fragment cache keys → fragment names mapping.
         */
        _FRAGMENT_MAP: {
            regularize: "zhrsanctions.view.fragments.RegularizeDialog",
            reportToHC: "zhrsanctions.view.fragments.ReportToHCDialog"
        },

        /**
         * Load (if needed) and open a fragment dialog.
         * Dialogs are cached on the controller as `_dialog_<key>`.
         */
        _openDialog(dialogKey, fragmentName) {
            const cacheKey = `_dialog_${dialogKey}`;

            if (this[cacheKey]) {
                this[cacheKey].open();
                return;
            }

            Fragment.load({
                id: this.getView().getId(),
                name: fragmentName,
                controller: this
            }).then(dialog => {
                this[cacheKey] = dialog;
                this.getView().addDependent(dialog);
                dialog.setModel(this.getView().getModel("detailData"), "detailData");
                dialog.setModel(this.getView().getModel("regularize"), "regularize");
                dialog.open();
            });
        },

        _closeDialog(dialogKey) {
            const dialog = this[`_dialog_${dialogKey}`];
            if (dialog) { dialog.close(); }
        },

        // ── Shared OData Create ───────────────────────────────────────────────

        /**
         * POST to ITM_STRSet with a given payload.
         *
         * @param {object}   payload       - full ITM_STR entity payload
         * @param {string}   successMsg    - toast shown on success
         * @param {Function} onSuccess     - callback invoked after success toast
         * @param {string}   errorTitle    - MessageBox title on error
         */
        _submitToITMSet(payload, successMsg, onSuccess, errorTitle) {
            const oDataModel = this.getOwnerComponent().getModel()
                || this.getView().getModel("mainService");

            if (!oDataModel) {
                MessageBox.warning(
                    "No active OData service connected. Payload logged to console:\n"
                    + JSON.stringify(payload, null, 2)
                );
                return;
            }

            sap.ui.core.BusyIndicator.show(0);
            oDataModel.create("/ITM_STRSet", payload, {
                success: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(successMsg);
                    onSuccess();
                },
                error: (error) => {
                    sap.ui.core.BusyIndicator.hide();
                    ODataUtils.handleODataError(error, errorTitle);
                }
            });
        },

        // ── Private Formatters ────────────────────────────────────────────────

        /**
         * Format an OData DateTime value → "dd-MM-yyyy" display string.
         */
        _formatIncidentDateDisplay(dateValue) {
            if (!dateValue) { return ""; }

            let date;
            if (typeof dateValue === "string" && dateValue.startsWith("/Date(")) {
                date = new Date(parseInt(dateValue.replace(/[^0-9]/g, ""), 10));
            } else if (dateValue instanceof Date) {
                date = dateValue;
            } else {
                return String(dateValue);
            }

            if (isNaN(date.getTime())) { return ""; }

            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        },

        /**
         * Convert ZdelayHrs / ZshortHrs to a "H:mm" display string.
         * Backend may send "00:15", a number (minutes), or an Edm.Time object.
         */
        _formatHoursDisplay(hoursValue) {
            if (!hoursValue && hoursValue !== 0) { return "0:00"; }

            if (typeof hoursValue === "string" && hoursValue.includes(":")) {
                return hoursValue.substring(0, 5);
            }

            if (typeof hoursValue === "number") {
                const h = Math.floor(hoursValue / 60);
                const m = hoursValue % 60;
                return `${h}:${String(m).padStart(2, "0")}`;
            }

            // Edm.Time object
            const timeStr = toTimeString(hoursValue);
            return timeStr ? timeStr.substring(0, 5) : "0:00";
        },

        /**
         * Build an empty regularize model state object.
         */
        _buildEmptyRegularizeState() {
            return {
                dialogTitle: "Regularize Attendance",
                scheduledIn: "",
                scheduledOut: "",
                punchIn: "",
                punchOut: "",
                delayHrs: "",
                shortHrs: "",
                incidentDate: "",
                hasDelay: false,
                hasShort: false,
                showModeSelector: false,
                mode: "both",
                showDelay: false,
                showShort: false,
                delayFrom: "",
                delayTo: "",
                shortFrom: "",
                shortTo: "",
                reason: ""
            };
        }
    });
});
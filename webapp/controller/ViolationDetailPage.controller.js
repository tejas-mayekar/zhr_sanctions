sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController, Fragment, JSONModel, MessageToast, MessageBox, ODataUtils) => {
    "use strict";

    /**
     * Return true when an OData time field contains a non-zero value.
     */
    function isNonZeroTime(edmTime) {
        if (!edmTime) { return false; }
        const s = BaseController.prototype.toTimeString.call({ formatEdmTime: ODataUtils.formatEdmTime }, edmTime);
        return s !== "" && s !== "00:00:00";
    }

    /**
     * Build a display string from the incident date and the selected time value.
     */
    function buildDateTimeDisplayString(dateStr, timeStr) {
        if (!dateStr || !timeStr) { return timeStr || ""; }
        return `${dateStr} ${timeStr}`;
    }

    /**
     * Map the selected regularization mode to the matching section visibility.
     */
    function resolveSectionVisibility(mode, hasDelay, hasShort) {
        return {
            showDelay: mode === "both" ? hasDelay : mode === "delay",
            showShort: mode === "both" ? hasShort : mode === "short"
        };
    }

    /**
     * Derive the dialog title from the selected regularization mode.
     */
    const MODE_TITLE = {
        delay: "Regularize Delay",
        short: "Regularize Short Hours",
        both: "Regularize Both"
    };

    return BaseController.extend("zhrsanctions.controller.ViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel(this._buildEmptyRegularizeState()), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteViolationDetailPage")
                .attachPatternMatched(this._onRouteMatched, this);
            this._pendingFiles = [];
        },


        _onRouteMatched(oEvent) {
            const actionRefNo = decodeURIComponent(oEvent.getParameter("arguments").actionRefNo || "");
            const detailModel = this.getOwnerComponent().getModel("detailData");
            const existingRec = detailModel?.getData().record;

            // Data still in memory (normal nav) — use it
            if (existingRec && (existingRec.ZACTION_REF_NO === actionRefNo || existingRec.ZactionRefNo === actionRefNo)) {
                this.getView().setModel(detailModel, "detailData");
                this._pendingFiles = [];
                this.loadMediaFiles(existingRec);
                return;
            }

            // Reload / deep-link — data gone, fetch fresh
            const oDataModel = this.getOwnerComponent().getModel();
            sap.ui.core.BusyIndicator.show(0);

            ODataUtils.fetchODataEntity(oDataModel, `/HDR_STRSet(ZACTION_REF_NO='${actionRefNo}',ZempId='${ODataUtils.getCurrentUserId()}')`)
                .then((record) => {
                    const freshModel = new JSONModel({ record: record || {}, source: "current" });
                    this.getOwnerComponent().setModel(freshModel, "detailData");
                    this.getView().setModel(freshModel, "detailData");
                    this._pendingFiles = [];
                    this.loadMediaFiles(record);
                })
                .catch((err) => {
                    console.error("ViolationDetailPage: reload fetch failed:", err);
                    MessageBox.error("Could not reload violation record.");
                })
                .finally(() => sap.ui.core.BusyIndicator.hide());
        },
        onFileChange(oEvent) {
            const files = oEvent.getParameter("files");
            this._pendingFiles = files ? Array.from(files) : [];
        },
        onMediaFilePress(oEvent) {
            const ctx = oEvent.getSource().getBindingContext("media");
            if (!ctx) { return; }
            this.downloadMediaFile(ctx.getObject());
        },
        onRegularizePress() {
            const record = this.getView().getModel("detailData").getProperty("/record");
            this._populateRegularizeModel(record);
            this._openDialog("regularize", "zhrsanctions.view.fragments.RegularizeDialog");
        },
        /**
         * Build the regularize model from the current violation record.
         * It determines which sections are relevant and pre-fills the suggested times.
         */
        _populateRegularizeModel(record) {
            const scheduledIn = this.toTimeString(record.ZschTimeIn);
            const scheduledOut = this.toTimeString(record.ZschTimeOut);
            const punchIn = this.toTimeString(record.Zpunchintime);
            const punchOut = this.toTimeString(record.Zpunchouttime);
            const unautDays = parseInt(record.ZunautDays, 10) || 0;
            const hasUnauth = unautDays > 0;
            const scheduledInSec = this.timeStringToSeconds(scheduledIn);
            let scheduledOutSec = this.timeStringToSeconds(scheduledOut);
            const isOvernight = scheduledIn && scheduledOut && scheduledOutSec < scheduledInSec;
            if (isOvernight) { scheduledOutSec += 86400; }
            const punchInSec = isOvernight ? this.normalizeOvernightSeconds(scheduledInSec, this.timeStringToSeconds(punchIn)) : this.timeStringToSeconds(punchIn);
            const punchOutSec = isOvernight ? this.normalizeOvernightSeconds(scheduledInSec, this.timeStringToSeconds(punchOut)) : this.timeStringToSeconds(punchOut);

            const hasDelay = isNonZeroTime(record.ZdelayHrs) && (
                !punchIn || !scheduledIn || punchInSec > scheduledInSec
            );

            const hasShort = isNonZeroTime(record.ZshortHrs) && (
                !punchOut || !scheduledOut || punchOutSec < scheduledOutSec
            );

            const hasBoth = hasDelay && hasShort;
            const mode = hasBoth ? "both" : hasDelay ? "delay" : "short";

            const incidentDateDisplay = this._formatIncidentDateDisplay(record.ZincDate);

            const state = {
                dialogTitle: hasUnauth ? "Regularize Unauthorized Absence" : (hasBoth ? "Regularize Both" : MODE_TITLE[mode]),
                scheduledIn: buildDateTimeDisplayString(incidentDateDisplay, scheduledIn),
                scheduledOut: buildDateTimeDisplayString(incidentDateDisplay, scheduledOut),
                punchIn: buildDateTimeDisplayString(incidentDateDisplay, punchIn),
                punchOut: buildDateTimeDisplayString(incidentDateDisplay, punchOut),
                delayHrs: this._formatHoursDisplay(record.ZdelayHrs),
                shortHrs: this._formatHoursDisplay(record.ZshortHrs),
                incidentDate: incidentDateDisplay,
                hasDelay: hasUnauth ? false : hasDelay,
                hasShort: hasUnauth ? false : hasShort,
                showModeSelector: hasUnauth ? false : hasBoth,
                mode: hasUnauth ? "unauth" : mode,

                showUnauth: hasUnauth,
                unauthPunchIn: scheduledIn,
                unauthPunchOut: scheduledOut,

                delayFrom: scheduledIn,
                delayTo: this.secondsToTimeString(this.timeStringToSeconds(punchIn) - 1),
                shortFrom: this.secondsToTimeString(this.timeStringToSeconds(punchOut) + 1),
                shortTo: scheduledOut,

                reason: "",
                lmreason: ""
            };

            Object.assign(state, hasUnauth
                ? { showDelay: false, showShort: false }
                : resolveSectionVisibility(mode, hasDelay, hasShort));

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
        _getScheduleOutDate(incDate, isNightShift) {
            if (!isNightShift) { return incDate; }

            let date;
            if (incDate instanceof Date) {
                date = new Date(incDate.getTime());
            } else if (typeof incDate === "string" && incDate.startsWith("/Date(")) {
                date = new Date(parseInt(incDate.replace(/[^0-9]/g, ""), 10));
            } else if (typeof incDate === "string") {
                date = new Date(incDate);
            } else {
                return incDate; // unknown shape — leave as-is
            }

            if (isNaN(date.getTime())) { return incDate; }

            date.setDate(date.getDate() + 1);
            // Preserve the same shape it came in as
            return (typeof incDate === "string" && incDate.startsWith("/Date("))
                ? `/Date(${date.getTime()})/`
                : date;
        },
        onRegularizeSubmit() {
            const regularizeModel = this.getView().getModel("regularize");
            const state = regularizeModel.getData();
            const reason = (state.reason || "").trim();
            const lmreason = (state.lmreason || "").trim();
            if (!reason) {
                MessageBox.warning("Please enter a reason before submitting.");
                return;
            }

            const record = this.getView().getModel("detailData").getProperty("/record");
            if (!record?.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Regularization.");
                return;
            }

            const schInRaw = this.toTimeString(record.ZschTimeIn);
            const schOutRaw = this.toTimeString(record.ZschTimeOut);
            const isNightShift = !!schInRaw && !!schOutRaw
                && this.timeStringToSeconds(schInRaw) > this.timeStringToSeconds(schOutRaw);

            const toSecondsWithWrap = (fromStr, toStr) => {
                let toSec = this.timeStringToSeconds(toStr);
                const fromSec = this.timeStringToSeconds(fromStr);
                if (isNightShift && toSec <= fromSec) {
                    toSec += 86400;
                }
                return toSec;
            };

            if (state.showDelay) {
                if (!state.delayFrom || !state.delayTo) {
                    MessageBox.warning("Please fill in both Delay From and To times.");
                    return;
                }
                if (toSecondsWithWrap(state.delayFrom, state.delayTo) <= this.timeStringToSeconds(state.delayFrom)) {
                    MessageBox.warning("Delay 'To Time' must be later than 'From Time'.");
                    return;
                }
            }

            if (state.showShort) {
                if (!state.shortFrom || !state.shortTo) {
                    MessageBox.warning("Please fill in both Short Hours From and To times.");
                    return;
                }
                if (toSecondsWithWrap(state.shortFrom, state.shortTo) <= this.timeStringToSeconds(state.shortFrom)) {
                    MessageBox.warning("Short Hours 'To Time' must be later than 'From Time'.");
                    return;
                }
            }
            if (state.showUnauth) {
                if (!state.unauthPunchIn || !state.unauthPunchOut) {
                    MessageBox.warning("Please fill in both Punch In and Punch Out times.");
                    return;
                }
            }
            if (state.reason === "Other" && !(lmreason || "").trim()) {
                MessageBox.warning("Please specify a reason when 'Other' is selected.");
                return;
            }

            let correctedSchIn = schInRaw;
            let correctedPunchIn = this.toTimeString(record.Zpunchintime);
            let correctedPunchOut = this.toTimeString(record.Zpunchouttime);
            let correctedSchOut = schOutRaw;
            if (state.showUnauth) {
                correctedSchIn = state.unauthPunchIn;
                correctedPunchIn = state.unauthPunchIn;
                correctedPunchOut = state.unauthPunchOut;
                correctedSchOut = state.unauthPunchOut;
            } else if (state.showDelay && !state.showShort) {
                correctedSchIn = state.delayFrom;
                correctedPunchIn = state.delayTo;

            } else if (state.showShort && !state.showDelay) {
                correctedPunchOut = state.shortFrom;
                correctedSchOut = state.shortTo;

            } else if (state.showDelay && state.showShort) {
                correctedSchIn = state.delayFrom;
                correctedPunchIn = state.delayTo;
                correctedPunchOut = state.shortFrom;
                correctedSchOut = state.shortTo;
            }

            if (this.timeStringToSeconds(correctedSchIn) > this.timeStringToSeconds(correctedSchOut)) {
                correctedSchOut = this.secondsToTimeString(
                    this.timeStringToSeconds(correctedSchOut) + 86400
                );
            }
            if (this.timeStringToSeconds(correctedPunchIn) > this.timeStringToSeconds(correctedPunchOut)) {
                correctedPunchOut = this.secondsToTimeString(
                    this.timeStringToSeconds(correctedPunchOut) + 86400
                );
            }

            const delayFlag = state.showUnauth ? "4"
                : state.showDelay && state.showShort ? "3"
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
                Zregularizereason: reason,
                Zlinemanagerremarks: lmreason,
                Zlinemanagername: ODataUtils.getCurrentUserName(),
                ZinitatedBy: ODataUtils.getCurrentUserId(),
                ZinitDate: new Date(),
                Zlinemanageractiondate: new Date(),
                Zpunchintime: ODataUtils.formatTimeForPayload(correctedPunchIn),
                Zpunchouttime: ODataUtils.formatTimeForPayload(correctedPunchOut),
                Zstatus: "4"
            });

            sap.ui.core.BusyIndicator.show(0);

            ODataUtils.submitPunchRegularize(oDataModel, record, {
                ZschTimeIn: correctedSchIn,
                Zpunchintime: correctedPunchIn,
                Zpunchouttime: correctedPunchOut,
                ZschTimeOut: correctedSchOut,
                DelayFlag: delayFlag,
                ZscheduleOutDate: this._getScheduleOutDate(record.ZincDate, isNightShift)
            })
                .then(() => {
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
            this.clearFileUploadState("reportToHCFileUploader");
            this._closeDialog("regularize");
        },

        onReportToHCPress() {
            this.clearFileUploadState("reportToHCFileUploader");
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
                Zlinemanagername: ODataUtils.getCurrentUserName(),
                ZinitatedBy: ODataUtils.getCurrentUserId(),
                Zlinemanageractiondate: new Date(),
                ZinitDate: new Date(),
                Zstatus: "1",
                Zlinemanagerremarks: reason
            });
            const zactionRefNo = record.ZACTION_REF_NO || record.ZactionRefNo;

            this._submitToITMSet(payload, "Report to HC submitted successfully.", () => {

                if (this._pendingFiles.length > 0) {
                    sap.ui.core.BusyIndicator.show();
                    this.UploadFiles(this._pendingFiles, zactionRefNo);
                }

                this._closeDialog("reportToHC");
                this.onNavBack();
            }, "Error submitting Report to HC");
        },
        UploadFiles(files, zactionRefNo) {
            const oDataModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            const sServiceUrl = oDataModel.sServiceUrl;
            const sCsrfToken = oDataModel.getSecurityToken ? oDataModel.getSecurityToken() : oDataModel.oHeaders["x-csrf-token"];

            files.forEach((file, index) => {
                const sUrl = `${sServiceUrl}/ZHR_SANC_MEDIAUPLOADSet`;

                const oReq = new XMLHttpRequest();
                oReq.open("POST", sUrl, true);
                oReq.setRequestHeader("Content-Type", file.type || "application/octet-stream");
                oReq.setRequestHeader("x-csrf-token", sCsrfToken);
                oReq.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                oReq.setRequestHeader("slug", encodeURIComponent(file.name) + ";" + encodeURIComponent(zactionRefNo) + ";" + encodeURIComponent(index));
                oReq.onload = () => {
                    sap.ui.core.BusyIndicator.hide();
                    if (oReq.status >= 200 && oReq.status < 300) {
                        MessageToast.show("File " + file.name + " uploaded successfully.");
                    } else {
                        MessageToast.show("Upload failed: " + file.name);
                        console.error(oReq.responseText);
                    }
                };
                oReq.onerror = () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Upload error: " + file.name);
                };
                oReq.send(file);
            });
        },
        onReportToHCCancel() {
            this.clearFileUploadState("reportToHCFileUploader");
            this._closeDialog("reportToHC");
        },

        onPayrollDeductionPress() {
            const record = this.getView().getModel("detailData").getProperty("/record");
            if (!record?.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Payroll Deduction.");
                return;
            }

            const payload = ODataUtils.buildITMPayload(record, {
                Zaction: "B",
                Zlinemanagername: ODataUtils.getCurrentUserName(),
                ZinitatedBy: ODataUtils.getCurrentUserId(),
                Zlinemanageractiondate: new Date(),
                ZinitDate: new Date(),
                Zstatus: "4"
            });
            this._submitToITMSet(
                payload,
                "Payroll Deduction submitted successfully.",
                () => this.onNavBack(),
                "Error submitting Payroll Deduction"
            );
        },

        /**
         * Map dialog keys to the underlying fragment names.
         */
        _FRAGMENT_MAP: {
            regularize: "zhrsanctions.view.fragments.RegularizeDialog",
            reportToHC: "zhrsanctions.view.fragments.ReportToHCDialog"
        },

        /**
         * Load and open a fragment dialog, reusing a cached instance when available.
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
            if (dialogKey === "reportToHC") {
                this.clearFileUploadState("reportToHCFileUploader");
            }
        },

        /**
         * Create an ITM_STR record with the provided payload.
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

        /**
         * Format an OData DateTime value for display.
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
         * Convert delay or short-hours values to a display-friendly time string.
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

            const timeStr = this.toTimeString(hoursValue);
            return timeStr ? timeStr.substring(0, 5) : "0:00";
        },

        /**
         * Build an empty regularize model state.
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
                reason: "",
                lmreason: ""
            };
        }
    });
});
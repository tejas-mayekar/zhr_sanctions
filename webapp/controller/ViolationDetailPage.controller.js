sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, History, Fragment, JSONModel, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.ViolationDetailPage", {

        onInit() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }

            // Regularize form model — reset each time the dialog opens
            this.getView().setModel(new JSONModel({
                punchIn: "",
                punchOut: "",
                reason: ""
            }), "regularize");

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteViolationDetailPage").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onNavBack() {
            const oHistory = History.getInstance();
            const sPrevHash = oHistory.getPreviousHash();

            if (sPrevHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        },

        // ── Edm.Time Formatter ────────────────────────────────────────────────
        //
        // OData v2 returns Edm.Time values as plain objects: { ms: 28800000 }
        // where `ms` is the number of milliseconds since midnight.
        // This helper converts that (or a raw number) into a "HH:mm:ss" string
        // safe to use both as a binding formatter and as a plain JS call.
        //
        // Accepted input shapes
        //   { ms: 28800000 }   → "08:00:00"   (standard ODataModel v2 object)
        //   28800000           → "08:00:00"   (raw number, just in case)
        //   "08:00:00"         → "08:00:00"   (already a string — returned as-is)
        //   null / undefined   → ""

        formatEdmTime(oTime) {
            if (oTime === null || oTime === undefined) {
                return "";
            }

            // Already a formatted string — pass through unchanged.
            if (typeof oTime === "string") {
                return oTime;
            }

            // Resolve the millisecond value from an object ({ ms: ... }) or a bare number.
            let iMs;
            if (typeof oTime === "object" && oTime.ms !== undefined) {
                iMs = oTime.ms;
            } else if (typeof oTime === "number") {
                iMs = oTime;
            } else {
                // Unknown shape — return an empty string rather than "[object Object]".
                return "";
            }

            const iSeconds = Math.floor(iMs / 1000);
            const hh = String(Math.floor(iSeconds / 3600)).padStart(2, "0");
            const mm = String(Math.floor((iSeconds % 3600) / 60)).padStart(2, "0");
            const ss = String(iSeconds % 60).padStart(2, "0");

            return `${hh}:${mm}:${ss}`;
        },
/**
 * Helper to convert TimePicker string "HH:mm:ss" to OData Edm.Time structure
 * @param {string} sTimeVal - Time string in format "HH:mm:ss" or "HH:mm"
 * @returns {object|null} - Edm.Time representation or null
 */
_formatTimeForPayload(sTimeVal) {
    if (!sTimeVal) {
        return null;
    }
    const aParts = sTimeVal.split(":");
    if (aParts.length >= 2) {
        const iHours = parseInt(aParts[0], 10);
        const iMinutes = parseInt(aParts[1], 10);
        const iSeconds = aParts[2] ? parseInt(aParts[2], 10) : 0;
        const iMs = ((iHours * 60 + iMinutes) * 60 + iSeconds) * 1000;
        return {
            ms: iMs,
            __edmType: "Edm.Time"
        };
    }
    return null;
},

        // ── Regularize Dialog ─────────────────────────────────────────────────

        /**
         * Opens the Regularize popup.
         * Pre-fills Punch In / Out from the record, formatting any raw Edm.Time
         * objects into "HH:mm:ss" strings so the TimePicker can accept them.
         */
        onRegularizePress() {
            const oRecord = this.getView().getModel("detailData").getProperty("/record");

            // Format the raw Edm.Time values before handing them to the dialog model.
            // If the values have already been resolved to strings (e.g. the record was
            // stored after a previous format pass), formatEdmTime returns them unchanged.
            this.getView().getModel("regularize").setData({
                punchIn: this.formatEdmTime(oRecord.Zpunchintime),
                punchOut: this.formatEdmTime(oRecord.Zpunchouttime),
                reason: ""
            });

            this._openRegularizeDialog();
        },

        _openRegularizeDialog() {
            if (!this._oRegularizeDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "zhrsanctions.view.fragments.RegularizeDialog",
                    controller: this
                }).then(oDialog => {
                    this._oRegularizeDialog = oDialog;
                    // Connect models so bindings inside the fragment resolve
                    this.getView().addDependent(oDialog);
                    oDialog.setModel(this.getView().getModel("detailData"), "detailData");
                    oDialog.setModel(this.getView().getModel("regularize"), "regularize");
                    oDialog.open();
                });
            } else {
                this._oRegularizeDialog.open();
            }
        },

        /**
         * Submit handler — validates required fields then builds the full ITM_STRSet
         * payload from the fetched record, overriding Zpunchintime / Zpunchouttime
         * with the dialog values and hardcoding Zaction to "Regularized".
         */
        onRegularizeSubmit() {
            const oRegModel = this.getView().getModel("regularize");
            const sPunchIn = oRegModel.getProperty("/punchIn");
            const sPunchOut = oRegModel.getProperty("/punchOut");
            const sReason = oRegModel.getProperty("/reason").trim();

            // ── Validation ──
            if (!sPunchIn || !sPunchOut || !sReason) {
                MessageBox.warning("Please fill in Punch In Time, Punch Out Time, and Reason before submitting.");
                return;
            }

            if (sPunchIn >= sPunchOut) {
                MessageBox.warning("Punch Out time must be later than Punch In time.");
                return;
            }

            // ── Build payload from fetched record ──
            const oRecord = this.getView().getModel("detailData").getProperty("/record");

            if (!oRecord || !oRecord.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Regularization.");
                return;
            }

            const parseByte = (val) => {
                const iVal = parseInt(val, 10);
                return isNaN(iVal) ? 0 : iVal;
            };

            const oPayload = {
                // Section 1: Employee Details
                ZempId: oRecord.ZempId || "",
                ZempName: oRecord.ZempName || "",
                ZempType: oRecord.ZempType || "",
                ZempTypeDesc: oRecord.ZempTypeDesc || "",
                ZempClass: oRecord.ZempClass || "",
                ZempClassDesc: oRecord.ZempClassDesc || "",
                Zcompany: oRecord.Zcompany || "",
                Znationality: oRecord.Znationality || "",
                Zhiredate: oRecord.ZhireDate || null,
                Zpaygrade: oRecord.ZpayGrade || null,
                Zposition: oRecord.Zposition || "",
                Zjobtitle: oRecord.ZjobTitle || "",
                Zjobclassification: oRecord.Zjobclassification || "",
                Zlocation: oRecord.Zlocation || "",
                Zlocationgroup: oRecord.ZlocGroup || "",
                Zworkschedule: oRecord.Zworkschedule || "",
                ZlatestNode: oRecord.ZlatestNode || "",
                ZstdWeekHrs: parseByte(oRecord.ZstdWeekHrs),
                ZwrkDyWeek: parseByte(oRecord.ZwrkDyWeek),

                // Indicators
                Zn0: parseByte(oRecord.Zn0),
                Zn1: parseByte(oRecord.Zn1),
                Zn2: parseByte(oRecord.Zn2),
                Zn3: parseByte(oRecord.Zn3),
                Zn4: parseByte(oRecord.Zn4),
                Zn5: parseByte(oRecord.Zn5),
                Zn6: parseByte(oRecord.Zn6),
                Zn7: parseByte(oRecord.Zn7),

                // Section 2: Violation & Incident Details
                ZactionRefNo: oRecord.ZACTION_REF_NO || "",
                ZincDate: oRecord.ZincDate || null,
                ZincCategory: oRecord.ZincCategory || "",
                ZincType: oRecord.ZincType || "",
                Zaction: "Regularized",               // ← fixed action
                Zstatus: oRecord.Status || "",
                Zsanction: oRecord.Zsanction || "",
                Zremark: sReason,                     // ← dialog reason

                // Timeline
                ZincDisDate: oRecord.ZincDisDate || null,
                ZinitatedBy: oRecord.ZinitatedBy || "",
                ZinitDate: oRecord.ZinitDate || null,
                ZfirstIncDate: oRecord.ZfirstIncDate || null,
                Zawaitingactionfrom: oRecord.Zawaitingactionfrom || null,
                Zlastaction: oRecord.Zlastaction || null,

                // Times — punch in/out overridden with dialog values
                ZschTimeIn: oRecord.ZschTimeIn || null,
                ZschTimeOut: oRecord.ZschTimeOut || null,
                Zpunchintime: this._formatTimeForPayload(sPunchIn),               // ← dialog value
                Zpunchouttime: this._formatTimeForPayload(sPunchOut),             // ← dialog value
                ZdelayHrs: parseByte(oRecord.ZdelayHrs),
                ZshortHrs: parseByte(oRecord.ZshortHrs),
                Zrepeatcount: parseByte(oRecord.Zrepeatcount),
                Zsysyrepeatcount: parseByte(oRecord.Zsysyrepeatcount),

                // Section 3: Workflow Actions
                Zlinemanagername: oRecord.ZlmIdName || "",
                Zlinemanageraction: oRecord.Zlinemanageraction || "",
                Zlinemanageractiondate: oRecord.ZlmIdActionDate || null,
                Zlinemanagerremarks: oRecord.Zlinemanagerremarks || "",

                Zhcopsname: oRecord.Zhcopsname || "",
                Zhcopsaction: oRecord.Zhcopsaction || "",
                Zhcopsactiondate: oRecord.Zhcopsactiondate || null,
                Zhcopsremark: oRecord.Zhcopsremark || "",

                Zhcevpname: oRecord.Zhcevpname || "",
                Zhcevpaction: oRecord.Zhcevpaction || "",
                Zhcevpactiondate: oRecord.Zhcevpactiondate || null,
                Zhcevpremark: oRecord.Zhcevpremark || "",

                Zlegalmembername: oRecord.Zlegalmembername || "",
                Zlegalmemberaction: oRecord.Zlegalmemberaction || "",
                Zlegalmemberactiondate: oRecord.Zlegalmemberactiondate || null,
                Zlegalremark: oRecord.Zlegalremark || "",

                Zceoname: oRecord.Zceoname || "",
                Zceoaction: oRecord.Zceoaction || "",
                Zceoactiondate: oRecord.Zceoactiondate || null,
                Zceoactionremark: oRecord.Zceoactionremark || ""
            };

            console.log("Regularize payload:", oPayload);

            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            if (oModel) {
                sap.ui.core.BusyIndicator.show(0);
                oModel.create("/ITM_STRSet", oPayload, {
                    success: () => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Regularization submitted successfully.");
                        this._closeRegularizeDialog();
                        this.onNavBack();
                    },
                    error: (oErr) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageBox.error(
                            "Error submitting Regularization:\n" +
                            (oErr.message || oErr.statusText || "Submission failed.")
                        );
                    }
                });
            } else {
                MessageBox.warning(
                    "No active OData service connected. Payload logged to console:\n" +
                    JSON.stringify(oPayload, null, 2)
                );
            }
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

        /**
         * Submits a Payroll Deduction action for the currently displayed violation record.
         * The payload mirrors the structure used by FileViolation.controller.js onSave(),
         * with all field values sourced from the fetched detailData record.
         * The only difference is that Zaction is hardcoded to "Payroll Deduction".
         */
        onPayrollDeductionPress() {
            const oRecord = this.getView().getModel("detailData").getProperty("/record");

            if (!oRecord || !oRecord.ZACTION_REF_NO) {
                MessageBox.error("No violation record loaded. Cannot submit Payroll Deduction.");
                return;
            }

            const parseByte = (val) => {
                const iVal = parseInt(val, 10);
                return isNaN(iVal) ? 0 : iVal;
            };

            const oPayload = {
                // Section 1: Employee Details
                ZempId: oRecord.ZempId || "",
                ZempName: oRecord.ZempName || "",
                ZempType: oRecord.ZempType || "",
                ZempTypeDesc: oRecord.ZempTypeDesc || "",
                ZempClass: oRecord.ZempClass || "",
                ZempClassDesc: oRecord.ZempClassDesc || "",
                Zcompany: oRecord.Zcompany || "",
                Znationality: oRecord.Znationality || "",
                Zhiredate: oRecord.ZhireDate || null,
                Zpaygrade: oRecord.ZpayGrade || null,
                Zposition: oRecord.Zposition || "",
                Zjobtitle: oRecord.ZjobTitle || "",
                Zjobclassification: oRecord.Zjobclassification || "",
                Zlocation: oRecord.Zlocation || "",
                Zlocationgroup: oRecord.ZlocGroup || "",
                Zworkschedule: oRecord.Zworkschedule || "",
                ZlatestNode: oRecord.ZlatestNode || "",
                ZstdWeekHrs: parseByte(oRecord.ZstdWeekHrs),
                ZwrkDyWeek: parseByte(oRecord.ZwrkDyWeek),

                // Indicators
                Zn0: parseByte(oRecord.Zn0),
                Zn1: parseByte(oRecord.Zn1),
                Zn2: parseByte(oRecord.Zn2),
                Zn3: parseByte(oRecord.Zn3),
                Zn4: parseByte(oRecord.Zn4),
                Zn5: parseByte(oRecord.Zn5),
                Zn6: parseByte(oRecord.Zn6),
                Zn7: parseByte(oRecord.Zn7),

                // Section 2: Violation & Incident Details
                ZactionRefNo: oRecord.ZACTION_REF_NO || "",
                ZincDate: oRecord.ZincDate || null,
                ZincCategory: oRecord.ZincCategory || "",
                ZincType: oRecord.ZincType || "",
                Zaction: "Payroll Deduction",           // ← fixed action
                Zstatus: oRecord.Status || "",
                Zsanction: oRecord.Zsanction || "",
                Zremark: oRecord.Zremark || "",

                // Timeline
                ZincDisDate: oRecord.ZincDisDate || null,
                ZinitatedBy: oRecord.ZinitatedBy || "",
                ZinitDate: oRecord.ZinitDate || null,
                ZfirstIncDate: oRecord.ZfirstIncDate || null,
                Zawaitingactionfrom: oRecord.Zawaitingactionfrom || null,
                Zlastaction: oRecord.Zlastaction || null,

                // Times (raw Edm.Time objects passed through as-is)
                ZschTimeIn: oRecord.ZschTimeIn || null,
                ZschTimeOut: oRecord.ZschTimeOut || null,
                Zpunchintime: oRecord.Zpunchintime || null,
                Zpunchouttime: oRecord.Zpunchouttime || null,
                ZdelayHrs: parseByte(oRecord.ZdelayHrs),
                ZshortHrs: parseByte(oRecord.ZshortHrs),
                Zrepeatcount: parseByte(oRecord.Zrepeatcount),
                Zsysyrepeatcount: parseByte(oRecord.Zsysyrepeatcount),

                // Section 3: Workflow Actions
                Zlinemanagername: oRecord.ZlmIdName || "",
                Zlinemanageraction: oRecord.Zlinemanageraction || "",
                Zlinemanageractiondate: oRecord.ZlmIdActionDate || null,
                Zlinemanagerremarks: oRecord.Zlinemanagerremarks || "",

                Zhcopsname: oRecord.Zhcopsname || "",
                Zhcopsaction: oRecord.Zhcopsaction || "",
                Zhcopsactiondate: oRecord.Zhcopsactiondate || null,
                Zhcopsremark: oRecord.Zhcopsremark || "",

                Zhcevpname: oRecord.Zhcevpname || "",
                Zhcevpaction: oRecord.Zhcevpaction || "",
                Zhcevpactiondate: oRecord.Zhcevpactiondate || null,
                Zhcevpremark: oRecord.Zhcevpremark || "",

                Zlegalmembername: oRecord.Zlegalmembername || "",
                Zlegalmemberaction: oRecord.Zlegalmemberaction || "",
                Zlegalmemberactiondate: oRecord.Zlegalmemberactiondate || null,
                Zlegalremark: oRecord.Zlegalremark || "",

                Zceoname: oRecord.Zceoname || "",
                Zceoaction: oRecord.Zceoaction || "",
                Zceoactiondate: oRecord.Zceoactiondate || null,
                Zceoactionremark: oRecord.Zceoactionremark || ""
            };

            console.log("Payroll Deduction payload:", oPayload);

            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            if (oModel) {
                sap.ui.core.BusyIndicator.show(0);
                oModel.create("/ITM_STRSet", oPayload, {
                    success: () => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Payroll Deduction submitted successfully.");
                        this.onNavBack();
                    },
                    error: (oErr) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageBox.error(
                            "Error submitting Payroll Deduction:\n" +
                            (oErr.message || oErr.statusText || "Submission failed.")
                        );
                    }
                });
            } else {
                MessageBox.warning(
                    "No active OData service connected. Payload logged to console:\n" +
                    JSON.stringify(oPayload, null, 2)
                );
            }
        }

    });
});
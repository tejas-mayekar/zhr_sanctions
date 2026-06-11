sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, History, Fragment, JSONModel, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.FileViolation", {

        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteFileViolation").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("create");
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

        // ── Actions ───────────────────────────────────────────────────────────

        onCancel() {
            this.onNavBack();
        },

        onSave() {
            const parseByte = (sVal) => {
                const iVal = parseInt(sVal, 10);
                return isNaN(iVal) ? 0 : iVal;
            };

            const oPayload = {
                // Section 1: Employee Details
                ZempId: this.byId("inputZempId").getValue(),
                ZempName: this.byId("inputZempName").getValue(),
                ZempType: this.byId("inputZempType").getValue(),
                ZempTypeDesc: this.byId("inputZempTypeDesc").getValue(),
                ZempClass: this.byId("inputZempClass").getValue(),
                ZempClassDesc: this.byId("inputZempClassDesc").getValue(),
                Zcompany: this.byId("inputZcompany").getValue(),
                Znationality: this.byId("inputZnationality").getValue(),
                Zhiredate: this.byId("dpZhiredate").getDateValue(),
                Zpaygrade: this.byId("inputZpaygrade").getValue(),
                Zposition: this.byId("inputZposition").getValue(),
                Zjobtitle: this.byId("inputZjobtitle").getValue(),
                Zjobclassification: this.byId("inputZjobclassification").getValue(),
                Zlocation: this.byId("inputZlocation").getValue(),
                Zlocationgroup: this.byId("inputZlocationgroup").getValue(),
                Zworkschedule: this.byId("inputZworkschedule").getValue(),
                ZlatestNode: this.byId("inputZlatestNode").getValue(),
                ZstdWeekHrs: parseByte(this.byId("inputZstdWeekHrs").getValue()),
                ZwrkDyWeek: parseByte(this.byId("inputZwrkDyWeek").getValue()),

                // Indicators
                Zn0: parseByte(this.byId("inputZn0").getValue()),
                Zn1: parseByte(this.byId("inputZn1").getValue()),
                Zn2: parseByte(this.byId("inputZn2").getValue()),
                Zn3: parseByte(this.byId("inputZn3").getValue()),
                Zn4: parseByte(this.byId("inputZn4").getValue()),
                Zn5: parseByte(this.byId("inputZn5").getValue()),
                Zn6: parseByte(this.byId("inputZn6").getValue()),
                Zn7: parseByte(this.byId("inputZn7").getValue()),

                // Section 2: Violation & Incident Details
                // ZactionRefNo: this.byId("inputZactionRefNo").getValue(),
                ZincDate: this.byId("dpZincDate").getDateValue(),
                ZincCategory: this.byId("inputZincCategory").getValue(),
                ZincType: this.byId("inputZincType").getValue(),
                Zaction: this.byId("inputZaction").getValue(),
                Zstatus: this.byId("inputZstatus").getValue(),
                Zsanction: this.byId("inputZsanction").getValue(),
                Zremark: this.byId("inputZremark").getValue(),

                // Timeline
                ZincDisDate: this.byId("dpZincDisDate").getDateValue(),
                ZinitatedBy: this.byId("inputZinitatedBy").getValue(),
                ZinitDate: this.byId("dpZinitDate").getDateValue(),
                ZfirstIncDate: this.byId("dpZfirstIncDate").getDateValue(),
                Zawaitingactionfrom: this.byId("dpZawaitingactionfrom").getDateValue(),
                Zlastaction: this.byId("dpZlastaction").getDateValue(),

                // Times
                ZschTimeIn: this._formatTime(this.byId("tpZschTimeIn").getValue()),
                ZschTimeOut: this._formatTime(this.byId("tpZschTimeOut").getValue()),
                Zpunchintime: this._formatTime(this.byId("tpZpunchintime").getValue()),
                Zpunchouttime: this._formatTime(this.byId("tpZpunchouttime").getValue()),
                ZdelayHrs: parseByte(this.byId("inputZdelayHrs").getValue()),
                ZshortHrs: parseByte(this.byId("inputZshortHrs").getValue()),
                Zrepeatcount: parseByte(this.byId("inputZrepeatcount").getValue()),
                Zsysyrepeatcount: parseByte(this.byId("inputZsysyrepeatcount").getValue()),

                // Section 3: Workflow Actions
                Zlinemanagername: this.byId("inputZlinemanagername").getValue(),
                Zlinemanageraction: this.byId("inputZlinemanageraction").getValue(),
                Zlinemanageractiondate: this.byId("dpZlinemanageractiondate").getDateValue(),
                Zlinemanagerremarks: this.byId("inputZlinemanagerremarks").getValue(),

                Zhcopsname: this.byId("inputZhcopsname").getValue(),
                Zhcopsaction: this.byId("inputZhcopsaction").getValue(),
                Zhcopsactiondate: this.byId("dpZhcopsactiondate").getDateValue(),
                Zhcopsremark: this.byId("inputZhcopsremark").getValue(),

                Zhcevpname: this.byId("inputZhcevpname").getValue(),
                Zhcevpaction: this.byId("inputZhcevpaction").getValue(),
                Zhcevpactiondate: this.byId("dpZhcevpactiondate").getDateValue(),
                Zhcevpremark: this.byId("inputZhcevpremark").getValue(),

                Zlegalmembername: this.byId("inputZlegalmembername").getValue(),
                Zlegalmemberaction: this.byId("inputZlegalmemberaction").getValue(),
                Zlegalmemberactiondate: this.byId("dpZlegalmemberactiondate").getDateValue(),
                Zlegalremark: this.byId("inputZlegalremark").getValue(),

                Zceoname: this.byId("inputZceoname").getValue(),
                Zceoaction: this.byId("inputZceoaction").getValue(),
                Zceoactiondate: this.byId("dpZceoactiondate").getDateValue(),
                Zceoactionremark: this.byId("inputZceoactionremark").getValue()
            };

            console.log("Retrieved FileViolation payload data:", oPayload);

            // Mandatory Key Validation
            if (!oPayload.ZempId || !oPayload.ZincDate) {
                sap.m.MessageBox.error("Please fill in all mandatory key fields:\n- Employee ID\n- Incident Date");
                return;
            }

            // Validate Action Ref No is not empty (since it's the unique key)
            if (!oPayload.ZactionRefNo || oPayload.ZactionRefNo.trim() === "") {
                sap.m.MessageBox.error("Action Reference Number is mandatory and must be unique.");
                return;
            }

            // Get default OData model
            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");

            if (oModel) {
                sap.ui.core.BusyIndicator.show(0);

                oModel.create("/ITM_STRSet", oPayload, {
                    success: (oData) => {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("Violation record created successfully.");
                        this.onNavBack();
                    },
                    error: (oErr) => {
                        sap.ui.core.BusyIndicator.hide();
                        this._handleODataError(oErr);
                    }
                });
            } else {
                sap.m.MessageBox.warning("No active OData service connected. Payload logged to console:\n" + JSON.stringify(oPayload, null, 2));
            }
        },

        /**
         * Handle OData errors with specific error messages
         */
        _handleODataError(oErr) {
            let sErrorMessage = "Error creating violation record.";
            let sDetails = "";

            try {
                // Extract the actual error message from the OData response
                if (oErr.responseText) {
                    const oErrorResponse = JSON.parse(oErr.responseText);
                    const oError = oErrorResponse.error || oErrorResponse;

                    if (oError.message && typeof oError.message === "object") {
                        sErrorMessage = oError.message.value || oError.message;
                    } else if (oError.message) {
                        sErrorMessage = oError.message;
                    }

                    // Check for specific error codes
                    // if (oError.code && oError.code.includes("/IWBEP/CM_MGW_RT/022")) {
                    //     sErrorMessage = "Action Reference Number already exists. Please use a unique Action Ref No.";
                    //     sDetails = "This violation record with the same Action Reference Number is already in the system.";
                    // } else 
                    if (oError.innererror && oError.innererror.errordetails) {
                        const errorDetails = oError.innererror.errordetails[0];
                        if (errorDetails && errorDetails.message) {
                            sErrorMessage = errorDetails.message;
                        }
                    }
                } else if (oErr.message) {
                    sErrorMessage = oErr.message;
                } else if (oErr.statusText) {
                    sErrorMessage = oErr.statusText;
                }
            } catch (e) {
                console.error("Error parsing error response:", e);
                sErrorMessage = oErr.statusText || "An unexpected error occurred.";
            }

            // Display comprehensive error dialog
            const sFullMessage = sDetails ? `${sErrorMessage}\n\n${sDetails}` : sErrorMessage;
            sap.m.MessageBox.error(sFullMessage, {
                title: "Save Error",
                onClose: (sAction) => {
                    // Optional: Highlight the field that caused the error
                    if (sErrorMessage.includes("Action Reference Number")) {
                        const oActionRefField = this.byId("inputZactionRefNo");
                        if (oActionRefField) {
                            oActionRefField.setValueState("Error");
                            oActionRefField.setValueStateText("This Action Ref No already exists");
                        }
                    }
                }
            });

            console.error("OData Error Details:", oErr);
        }
        ,

        /**
         * Helper to convert TimePicker string "HH:mm:ss" to OData Edm.Time structure
         * @param {string} sTimeVal - Time string
         * @returns {object|null} - Edm.Time representation
         */
        _formatTime(sTimeVal) {
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
        }

    });
});
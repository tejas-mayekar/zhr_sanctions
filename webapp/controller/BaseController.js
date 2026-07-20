sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "zhrsanctions/utils/ODataUtils",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, History, ODataUtils, DateFormat, JSONModel, Filter, FilterOperator) => {
    "use strict";

    const ZSTATUS_MAP = {
        "1": "In Progress",
        "2": "Sent Back to HR",
        "3": "Sent Back to LM",
        "4": "Completed",
        "5": "Sent to EVP",
        "6": "Sent to CEO",
    };
    const ZACTION_MAP = {
        "A": "Regularized",
        "B": "Payroll Deduction",
        "C": "Report To HC"
    };

    return Controller.extend("zhrsanctions.controller.BaseController", {

        formatEdmTime(edmTime) {
            return ODataUtils.formatEdmTime(edmTime);
        },

        toTimeString(edmTime) {
            return this.formatEdmTime(edmTime) || "";
        },

        timeStringToSeconds(timeStr) {
            if (!timeStr) { return 0; }
            const [hh, mm, ss = "0"] = String(timeStr).split(":");
            return (parseInt(hh, 10) || 0) * 3600
                + (parseInt(mm, 10) || 0) * 60
                + (parseInt(ss, 10) || 0);
        },

        secondsToTimeString(totalSeconds) {
            if (totalSeconds < 0) { totalSeconds = 0; }
            const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
            const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
            const ss = String(totalSeconds % 60).padStart(2, "0");
            return `${hh}:${mm}:${ss}`;
        },

        hasAttendanceTimeDifference(record) {
            if (!record) { return false; }
            const schIn = this.toTimeString(record.ZschTimeIn);
            const schOut = this.toTimeString(record.ZschTimeOut);
            const pIn = this.toTimeString(record.Zpunchintime);
            const pOut = this.toTimeString(record.Zpunchouttime);
            const delay = schIn && pIn && this.timeStringToSeconds(pIn) > this.timeStringToSeconds(schIn);
            const short = schOut && pOut && this.timeStringToSeconds(pOut) < this.timeStringToSeconds(schOut);
            return delay || short;
        },

        formatVisibility(value) {
            return !!value;
        },

        formatZstatus(status) {
            if (status === null || status === undefined || status === "") { return ""; }
            const key = String(status).trim();
            return ZSTATUS_MAP[key] || status;
        },

        formatZaction(action) {
            if (action === null || action === undefined || action === "") { return ""; }
            const key = String(action).trim();
            return ZACTION_MAP[key] || action;
        },

        displaydateFormatter(value) {
            if (!value) return "";
            const oDateFormat = DateFormat.getDateInstance({ pattern: "dd-MM-yyyy" });
            return oDateFormat.format(new Date(value));
        },

        formatRemarkColor(text) {
            if (!text) { return ""; }
            const t = String(text).toUpperCase();
            let bg = "transparent";
            if (t.includes("CEO COMMENTS")) {
                bg = "#c00";
            } else if (t.includes("EVP COMMENTS")) {
                bg = "#0070c0";
            } else if (t.includes("HC COMMENTS")) {
                bg = "#9b7dbe";
            } else if (t.includes("LINE MANAGER COMMENTS")) {
                bg = "#31c699";
            }
            return `<span style="background-color:${bg}; padding:2px 6px; color:${bg === "transparent" ? "#000" : "#fff"}; border-radius:3px;">${text}</span>`;
        },

        /**
         * Load media items for the active violation and bind them to the view model.
         */
        loadMediaFiles(violationRec, modelName = "media") {
            if (!violationRec) { return Promise.resolve(); }
            const actionRefNo = violationRec.ZactionRefNo || violationRec.ZACTION_REF_NO;
            if (!actionRefNo) { return Promise.resolve(); }

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            return new Promise((resolve, reject) => {
                oDataModel.read("/ZHR_GET_MEDIASet", {
                    filters: [new Filter("ZactionRefNo", FilterOperator.EQ, actionRefNo)],
                    success: (data) => {
                        const media = { results: data.results || [] };
                        const view = this.getView();
                        if (!view) {
                            resolve(media);
                            return;
                        }
                        const model = view.getModel(modelName);
                        if (!model) {
                            view.setModel(new JSONModel(media), modelName);
                        } else {
                            model.setData(media);
                        }
                        resolve(media);
                    },
                    error: (err) => {
                        console.error("ZHR_GET_MEDIASet fetch failed:", err);
                        reject(err);
                    }
                });
            });
        },

        clearFileUploadState(uploaderId) {
            if (this._pendingFiles) {
                this._pendingFiles = [];
            }

            if (uploaderId) {
                const uploader = this.byId(uploaderId);
                if (uploader && typeof uploader.clear === "function") {
                    uploader.clear();
                }
            }
        },

        downloadMediaFile(item) {
            if (!item) { return; }

            const oDataModel = this.getOwnerComponent().getModel();
            const sServiceUrl = oDataModel.sServiceUrl;
            const key = `ZactionRefNo='${item.ZactionRefNo}',ZitemNo='${item.ZitemNo}',Filename='${item.Filename}'`;
            const sUrl = `${sServiceUrl}/ZHR_SANC_MEDIAUPLOADSet(${key})/$value`;

            sap.ui.core.BusyIndicator.show(0);
            const oReq = new XMLHttpRequest();
            oReq.open("GET", sUrl, true);
            oReq.responseType = "blob";
            oReq.onload = () => {
                sap.ui.core.BusyIndicator.hide();
                if (oReq.status >= 200 && oReq.status < 300) {
                    const blob = oReq.response;
                    const link = document.createElement("a");
                    link.href = window.URL.createObjectURL(blob);
                    link.download = item.Filename;
                    link.click();
                    window.URL.revokeObjectURL(link.href);
                } else {
                    sap.m.MessageBox.error("Failed to download file: " + item.Filename);
                }
            };
            oReq.onerror = () => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("Error downloading file: " + item.Filename);
            };
            oReq.send();
        },

        loadRemarks(violationRec, dialog) {
            if (!violationRec) { return Promise.resolve(); }
            const actionRefNo = violationRec.ZactionRefNo || violationRec.ZACTION_REF_NO;
            if (!actionRefNo) { return Promise.resolve(); }

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            return new Promise((resolve, reject) => {
                oDataModel.read("/GET_REMARKSSet", {
                    filters: [new Filter("ZactionRefNo", FilterOperator.EQ, actionRefNo)],
                    success: (data) => {
                        const remarks = { results: data.results || [] };
                        const view = this.getView();
                        if (view) {
                            const model = view.getModel("remarks");
                            if (!model) {
                                view.setModel(new JSONModel(remarks), "remarks");
                            } else {
                                model.setData(remarks);
                            }
                        }
                        if (dialog) {
                            dialog.open();
                        }
                        resolve(remarks);
                    },
                    error: (err) => {
                        console.error("RemarksSet fetch failed:", err);
                        reject(err);
                    }
                });
            });
        },

        onNavBack() {
            const previousHash = History.getInstance().getPreviousHash();

            if (previousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        }
    });
});
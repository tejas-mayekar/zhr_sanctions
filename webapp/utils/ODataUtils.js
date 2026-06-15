sap.ui.define([], () => {
    "use strict";

    const ODataUtils = {

        // ── Error Handler ─────────────────────────────────────────────────────

        handleODataError(oErr, sTitle) {
            let sErrorMessage = sTitle || "An error occurred.";

            try {
                if (oErr.responseText) {
                    const oErrorResponse = JSON.parse(oErr.responseText);
                    const oError = oErrorResponse.error || oErrorResponse;

                    if (oError.message && typeof oError.message === "object") {
                        sErrorMessage = oError.message.value || sErrorMessage;
                    } else if (oError.message) {
                        sErrorMessage = oError.message;
                    }

                    if (oError.innererror && oError.innererror.errordetails) {
                        const oDetail = oError.innererror.errordetails[0];
                        if (oDetail && oDetail.message) {
                            sErrorMessage = oDetail.message;
                        }
                    }
                } else if (oErr.message) {
                    sErrorMessage = oErr.message;
                } else if (oErr.statusText) {
                    sErrorMessage = oErr.statusText;
                }
            } catch (e) {
                console.error("ODataUtils: error parsing OData error response:", e);
                sErrorMessage = oErr.statusText || "An unexpected error occurred.";
            }

            console.error("ODataUtils.handleODataError:", oErr);
            sap.m.MessageBox.error(sErrorMessage, { title: sTitle || "Error" });
        },

        // ── OData Read ────────────────────────────────────────────────────────

        fetchOData(oModel, sEntityPath, aFilters) {
            if (!oModel) {
                return Promise.reject(new Error("ODataUtils.fetchOData: oModel is null or undefined."));
            }
            if (typeof oModel.read !== "function") {
                return Promise.reject(new Error("ODataUtils.fetchOData: oModel does not have a read() method."));
            }

            return new Promise((resolve, reject) => {
                oModel.read(sEntityPath, {
                    filters: aFilters || [],
                    success: (oData) => {
                        if (!oData || !oData.results) {
                            reject(new Error("ODataUtils.fetchOData: No results returned from " + sEntityPath));
                        } else {
                            resolve(oData.results);
                        }
                    },
                    error: (oError) => {
                        console.error("ODataUtils.fetchOData error:", {
                            entityPath: sEntityPath,
                            statusCode: oError.statusCode,
                            statusText: oError.statusText,
                            message: oError.message
                        });
                        reject(oError);
                    }
                });
            });
        },

        // ── Edm.Time Formatter ────────────────────────────────────────────────
        //
        // Accepts: { ms: 28800000 } | 28800000 | "08:00:00" | null | undefined
        // Returns: "HH:mm:ss" string

        formatEdmTime(oTime) {
            if (oTime === null || oTime === undefined) {
                return "";
            }
            if (typeof oTime === "string") {
                return oTime;
            }

            let iMs;
            if (typeof oTime === "object" && oTime.ms !== undefined) {
                iMs = oTime.ms;
            } else if (typeof oTime === "number") {
                iMs = oTime;
            } else {
                return "";
            }

            const iSeconds = Math.floor(iMs / 1000);
            const hh = String(Math.floor(iSeconds / 3600)).padStart(2, "0");
            const mm = String(Math.floor((iSeconds % 3600) / 60)).padStart(2, "0");
            const ss = String(iSeconds % 60).padStart(2, "0");

            return `${hh}:${mm}:${ss}`;
        },
        // ── Get User Id ──────────────────────────────────────────────────
        getuserId() {
            var oUser = sap.ushell.Container.getService("UserInfo").getUser();
            var sId = oUser.getId();   
            if(sId == "DACO_EAMV04"){
                return '200129'
            }else{
                return '200130'
            }
        },
        
        // ── Edm.Time Builder ──────────────────────────────────────────────────
        //
        // Converts "HH:mm:ss" or "HH:mm" string → { ms, __edmType } for OData payload.
        formatTimeForPayload(sTimeVal) {
            if (!sTimeVal) {
                return null;
            }
            const aParts = sTimeVal.split(":");
            if (aParts.length >= 2) {
                const iHours = parseInt(aParts[0], 10);
                const iMinutes = parseInt(aParts[1], 10);
                const iSeconds = aParts[2] ? parseInt(aParts[2], 10) : 0;
                const iMs = ((iHours * 60 + iMinutes) * 60 + iSeconds) * 1000;
                return { ms: iMs, __edmType: "Edm.Time" };
            }
            return null;
        },

        // ── Byte/Int Parser ───────────────────────────────────────────────────
        //
        // Safe parseInt for Edm.Byte fields — returns 0 on NaN.

        parseByte(val) {
            const iVal = parseInt(val, 10);
            return isNaN(iVal) ? 0 : iVal;
        },

        // ── ITM_STR Payload Builder ───────────────────────────────────────────
        //
        // Builds full ITM_STRSet payload from a detailData record.
        // oOverrides: any fields to override (e.g. Zaction, Zremark, Zpunchintime).

        buildITMPayload(oRecord, oOverrides) {
            const p = this.parseByte.bind(this);

            const oBase = {
                // Employee
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
                ZstdWeekHrs: p(oRecord.ZstdWeekHrs),
                ZwrkDyWeek: p(oRecord.ZwrkDyWeek),

                // Indicators
                Zn0: p(oRecord.Zn0),
                Zn1: p(oRecord.Zn1),
                Zn2: p(oRecord.Zn2),
                Zn3: p(oRecord.Zn3),
                Zn4: p(oRecord.Zn4),
                Zn5: p(oRecord.Zn5),
                Zn6: p(oRecord.Zn6),
                Zn7: p(oRecord.Zn7),

                // Violation
                ZactionRefNo: oRecord.ZACTION_REF_NO || "",
                ZincDate: oRecord.ZincDate || null,
                ZincCategory: oRecord.ZincCategory || "",
                ZincType: oRecord.ZincType || "",
                Zaction: oRecord.Zaction || "",
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

                // Times
                ZschTimeIn: oRecord.ZschTimeIn || null,
                ZschTimeOut: oRecord.ZschTimeOut || null,
                Zpunchintime: oRecord.Zpunchintime || null,
                Zpunchouttime: oRecord.Zpunchouttime || null,
                ZdelayHrs: p(oRecord.ZdelayHrs),
                ZshortHrs: p(oRecord.ZshortHrs),
                Zrepeatcount: p(oRecord.Zrepeatcount),
                Zsysyrepeatcount: p(oRecord.Zsysyrepeatcount),

                // Workflow
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

            return Object.assign(oBase, oOverrides || {});
        }
    };

    return ODataUtils;
});
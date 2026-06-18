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
            if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
                return "200129";
            }

            const sId = sap.ushell.Container.getService("UserInfo").getUser().getId();
            return sId === "DACO_EAMV04" ? "200129" : "200130";
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
                // ITM_STR uses 'Zhiredate', HDR_STR uses 'ZhireDate'
                Zhiredate: oRecord.Zhiredate || oRecord.ZhireDate || null,
                // ITM_STR uses 'Zpaygrade', HDR_STR uses 'ZpayGrade'
                Zpaygrade: oRecord.Zpaygrade || oRecord.ZpayGrade || null,
                Zposition: oRecord.Zposition || "",
                // ITM_STR uses 'Zjobtitle', HDR_STR uses 'ZjobTitle'
                Zjobtitle: oRecord.Zjobtitle || oRecord.ZjobTitle || "",
                Zjobclassification: oRecord.Zjobclassification || "",
                Zlocation: oRecord.Zlocation || "",
                // ITM_STR uses 'Zlocationgroup', HDR_STR uses 'ZlocGroup'
                Zlocationgroup: oRecord.Zlocationgroup || oRecord.ZlocGroup || "",
                Zworkschedule: oRecord.Zworkschedule || "",
                ZlatestNode: oRecord.ZlatestNode || "",
                ZstdWeekHrs: p(oRecord.ZstdWeekHrs),
                ZwrkDyWeek: p(oRecord.ZwrkDyWeek),

                // Indicators
                Zn0: p(oRecord.Zn0), Zn1: p(oRecord.Zn1),
                Zn2: p(oRecord.Zn2), Zn3: p(oRecord.Zn3),
                Zn4: p(oRecord.Zn4), Zn5: p(oRecord.Zn5),
                Zn6: p(oRecord.Zn6), Zn7: p(oRecord.Zn7),

                // Violation — resolve key from either casing
                ZactionRefNo: oRecord.ZACTION_REF_NO || oRecord.ZactionRefNo || "",
                ZincDate: oRecord.ZincDate || null,
                ZincCategory: oRecord.ZincCategory || "",
                ZincType: oRecord.ZincType || "",
                Zaction: oRecord.Zaction || "",
                // ITM_STR uses 'Zstatus', HDR_STR uses 'Status'
                Zstatus: oRecord.Zstatus || oRecord.Status || "",
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

                // Workflow — ITM_STR uses 'Zlinemanagername', HDR_STR uses 'ZlmIdName' for the ID
                ZlmIdName: oRecord.ZlmIdName || "",
                Zlinemanagername: oRecord.Zlinemanagername || "",
                Zlinemanageraction: oRecord.Zlinemanageraction || "",
                // ITM_STR uses 'Zlinemanageractiondate', HDR_STR uses 'ZlmIdActionDate'
                Zlinemanageractiondate: oRecord.Zlinemanageractiondate || oRecord.ZlmIdActionDate || null,
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
        },

        // ── Submit Take Action ────────────────────────────────────────────────
        //
        // Creates a new ITM_STRSet entry with action details.
        // oModel: OData model
        // oRecord: detail page record (from detailData model)
        // oOverrides: action input fields { ZincCategory, ZincType, reason, etc }

        submitTakeAction(oModel, oRecord, oOverrides) {
    if (!oModel) {
        return Promise.reject(new Error("ODataUtils.submitTakeAction: oModel is null or undefined."));
    }

    const sActionRefNo = oRecord.ZACTION_REF_NO || oRecord.ZactionRefNo;
    const sEmpId = oRecord.ZempId;
    let sIncDate = oRecord.ZincDate;

    if (!sActionRefNo || !sEmpId || !sIncDate) {
        return Promise.reject(new Error("ODataUtils.submitTakeAction: ZactionRefNo, ZempId and ZincDate are required."));
    }

    // Convert date to proper OData DateTime format: datetime'YYYY-MM-DDTHH:mm:ss'
    // WITHOUT wrapping in additional quotes
    let sDateFormatted = this._formatDatetimeForKey(sIncDate);

    // Build entity key path WITHOUT datetime wrapper (it's handled above)
    const sEntityPath = `/ITM_STRSet(ZactionRefNo='${sActionRefNo}',ZempId='${sEmpId}',ZincDate=${sDateFormatted})`;

    console.log("submitTakeAction: entity path =", sEntityPath);

    // Build payload but EXCLUDE key fields
    let oPayload = this.buildITMPayload(oRecord, oOverrides || {});
    
    // Remove key fields from payload to avoid conflicts
    delete oPayload.ZactionRefNo;
    delete oPayload.ZempId;
    delete oPayload.ZincDate;

    // Format all date/time fields properly
    oPayload = this._formatPayloadForOData(oPayload);

    console.log("submitTakeAction: payload =", JSON.stringify(oPayload));

    return new Promise((resolve, reject) => {
        oModel.update(sEntityPath, oPayload, {
            bMerge: false,
            success: (oResponse) => {
                console.log("ODataUtils.submitTakeAction: Success", oResponse);
                resolve(oResponse);
            },
            error: (oError) => {
                console.error("ODataUtils.submitTakeAction: Error", oError);
                this.handleODataError(oError, "Failed to submit action");
                reject(oError);
            }
        });
    });
},

// New helper for formatting DateTime key values
_formatDatetimeForKey(vDate) {
    if (!vDate) {
        return null;
    }

    let dDate;
    
    if (vDate instanceof Date) {
        dDate = vDate;
    } else if (typeof vDate === "string" && vDate.startsWith("/Date(")) {
        // OData ticks format: /Date(1747440000000)/ → convert to Date
        const iMs = parseInt(vDate.replace(/\/Date\((\d+)\)\//, "$1"), 10);
        dDate = new Date(iMs);
    } else if (typeof vDate === "string") {
        // Already a string, assume ISO format
        dDate = new Date(vDate);
    } else {
        return null;
    }

    // Format as: datetime'YYYY-MM-DDTHH:mm:ss' (no surrounding quotes!)
    const pad = (n) => String(n).padStart(2, "0");
    return `datetime'${dDate.getUTCFullYear()}-${pad(dDate.getUTCMonth() + 1)}-${pad(dDate.getUTCDate())}T${pad(dDate.getUTCHours())}:${pad(dDate.getUTCMinutes())}:${pad(dDate.getUTCSeconds())}'`;
},

_formatPayloadForOData(oPayload) {
    const oFormatted = { ...oPayload };

    // Date fields that need /Date(ms)/ format in payload
    const aDateFields = [
        "Zhiredate", "ZincDisDate", "ZinitDate", "ZfirstIncDate",
        "Zawaitingactionfrom", "Zlastaction", "Zlinemanageractiondate",
        "Zhcopsactiondate", "Zhcevpactiondate", "Zlegalmemberactiondate",
        "Zceoactiondate"
    ];

    aDateFields.forEach(sField => {
        if (oFormatted[sField]) {
            oFormatted[sField] = this._formatDateForPayload(oFormatted[sField]);
        }
    });

    // Time fields that need { ms: ..., __edmType: "Edm.Time" } format
    const aTimeFields = [
        "ZschTimeIn", "ZschTimeOut", "Zpunchintime", "Zpunchouttime"
    ];

    aTimeFields.forEach(sField => {
        if (oFormatted[sField]) {
            oFormatted[sField] = this.formatTimeForPayload(oFormatted[sField]);
        }
    });

    return oFormatted;
},

_formatDateForPayload(vDate) {
    if (!vDate) return null;

    let dDate;
    if (vDate instanceof Date) {
        dDate = vDate;
    } else if (typeof vDate === "string" && vDate.startsWith("/Date(")) {
        const iMs = parseInt(vDate.replace(/\/Date\((\d+)\)\//, "$1"), 10);
        dDate = new Date(iMs);
    } else if (typeof vDate === "string") {
        dDate = new Date(vDate);
    } else {
        return null;
    }

    // Return in OData format: /Date(milliseconds)/
    return `/Date(${dDate.getTime()})/`;
}



    };

    return ODataUtils;
});

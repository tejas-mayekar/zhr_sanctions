sap.ui.define([], () => {
    "use strict";

    const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];
    const DEV_USER_ID = "200030";

    // ITM_STR Edm.Byte fields — ONLY these four
    // ZdelayHrs, ZshortHrs, Zrepeatcount, Zsysyrepeatcount
    // Everything else (Zn0-Zn7, ZstdWeekHrs, ZwrkDyWeek) = Edm.String in updated metadata

    const DATE_FIELDS_IN_PAYLOAD = [
        "Zhiredate", "ZincDisDate", "ZinitDate", "ZfirstIncDate", "ZincDate",
        "Zawaitingactionfrom", "Zlastaction", "Zlinemanageractiondate",
        "Zhcopsactiondate", "Zhcevpactiondate", "Zlegalmemberactiondate",
        "Zceoactiondate"
    ];

    const TIME_FIELDS_IN_PAYLOAD = [
        "ZschTimeIn", "ZschTimeOut", "Zpunchintime", "Zpunchouttime"
    ];

    function parseByteField(value) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Trim SAP padded strings; "" for null/undefined
    function safeStr(value) {
        if (value === null || value === undefined) { return ""; }
        return String(value).trim();
    }

    function secondsToTimeString(totalSeconds) {
        if (totalSeconds < 0) { totalSeconds = 0; }
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const s = String(totalSeconds % 60).padStart(2, "0");
        return `${h}:${m}:${s}`;
    }

    function pad2(n) { return String(n).padStart(2, "0"); }

    const ODataUtils = {

        handleODataError(error, title) {
            let message = title || "An error occurred.";
            try {
                if (error.responseText) {
                    const parsed = JSON.parse(error.responseText);
                    const errorBody = parsed.error || parsed;
                    const innerErrors = errorBody.innererror?.errordetails;
                    if (innerErrors?.[0]?.message) {
                        message = innerErrors[0].message;
                    } else if (typeof errorBody.message === "object") {
                        message = errorBody.message.value || message;
                    } else if (errorBody.message) {
                        message = errorBody.message;
                    }
                } else {
                    message = error.message || error.statusText || message;
                }
            } catch (e) {
                message = error.statusText || "An unexpected error occurred.";
            }
            console.error("ODataUtils.handleODataError:", error);
            sap.m.MessageBox.error(message, { title: title || "Error" });
        },

        fetchOData(oDataModel, entitySetPath, filters) {
            if (!oDataModel) {
                return Promise.reject(new Error("ODataUtils.fetchOData: oDataModel is null or undefined."));
            }
            if (typeof oDataModel.read !== "function") {
                return Promise.reject(new Error("ODataUtils.fetchOData: oDataModel has no read() method."));
            }
            return new Promise((resolve, reject) => {
                oDataModel.read(entitySetPath, {
                    filters: filters || [],
                    success: (data) => {
                        if (!data?.results) {
                            reject(new Error(`ODataUtils.fetchOData: no results from ${entitySetPath}`));
                        } else {
                            resolve(data.results);
                        }
                    },
                    error: (error) => {
                        console.error("ODataUtils.fetchOData error:", { entitySetPath, statusCode: error.statusCode, statusText: error.statusText, message: error.message });
                        reject(error);
                    }
                });
            });
        },
        fetchODataEntity(oDataModel, entityPath) {
            if (!oDataModel) {
                return Promise.reject(new Error("ODataUtils.fetchODataEntity: oDataModel is null or undefined."));
            }
            if (typeof oDataModel.read !== "function") {
                return Promise.reject(new Error("ODataUtils.fetchODataEntity: oDataModel has no read() method."));
            }
            return new Promise((resolve, reject) => {
                oDataModel.read(entityPath, {
                    success: (data) => {
                        if (!data) {
                            reject(new Error(`ODataUtils.fetchODataEntity: no entity found at ${entityPath}`));
                        } else {
                            resolve(data);
                        }
                    },
                    error: (error) => {
                        console.error("ODataUtils.fetchODataEntity error:", { entityPath, statusCode: error.statusCode, statusText: error.statusText, message: error.message });
                        reject(error);
                    }
                });
            });
        },
        formatEdmTime(edmTime) {
            if (edmTime === null || edmTime === undefined) { return ""; }
            if (typeof edmTime === "string") { return edmTime; }
            let ms;
            if (typeof edmTime === "object" && edmTime.ms !== undefined) {
                ms = edmTime.ms;
            } else if (typeof edmTime === "number") {
                ms = edmTime;
            } else {
                return "";
            }
            return secondsToTimeString(Math.floor(ms / 1000));
        },

        getCurrentUserId() {
            if (LOCAL_HOSTNAMES.includes(window.location.hostname)) { return DEV_USER_ID; }
            return sap.ushell.Container.getService("UserInfo").getUser().getId();
        },

        /** @deprecated */
        getuserId() { return this.getCurrentUserId(); },
        getCurrentUserName() {
            if (LOCAL_HOSTNAMES.includes(window.location.hostname)) { return "Dev User"; }
            return sap.ushell.Container.getService("UserInfo").getUser().getFullName();
        },

        formatTimeForPayload(timeString) {
            if (!timeString) { return null; }
            const ampmMatch = timeString.match(/^(\d{1,2}):(\d{2}):?(\d{2})?\s*(AM|PM)$/i);
            let h, m, s;
            if (ampmMatch) {
                h = parseInt(ampmMatch[1], 10);
                m = parseInt(ampmMatch[2], 10);
                s = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
                const period = ampmMatch[4].toUpperCase();
                if (period === "PM" && h !== 12) { h += 12; }
                if (period === "AM" && h === 12) { h = 0; }
            } else {
                const parts = timeString.split(":");
                if (parts.length < 2) { return null; }
                h = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10);
                s = parts[2] ? parseInt(parts[2], 10) : 0;
            }
            return { ms: ((h * 60 + m) * 60 + s) * 1000, __edmType: "Edm.Time" };
        },

        formatDateTimeForPayload(dateValue) {
            if (!dateValue && dateValue !== 0) { return null; }
            if (typeof dateValue === "string" && dateValue.startsWith("/Date(")) { return dateValue; }
            let date;
            if (dateValue instanceof Date) {
                date = dateValue;
            } else if (typeof dateValue === "string") {
                date = new Date(dateValue);
            } else {
                return null;
            }
            return isNaN(date.getTime()) ? null : `/Date(${date.getTime()})/`;
        },
        formatTimeDurationForPayload(timeValue) {
            if (timeValue === null || timeValue === undefined || timeValue === "") { return null; }
            let ms;
            if (typeof timeValue === "object" && timeValue.ms !== undefined) {
                ms = timeValue.ms;
            } else if (typeof timeValue === "number") {
                ms = timeValue;
            } else if (typeof timeValue === "string") {
                if (/^P\d+DT\d+H\d+M\d+S$/.test(timeValue)) { return timeValue; }
                const ampmMatch = timeValue.match(/^(\d{1,2}):(\d{2}):?(\d{2})?\s*(AM|PM)$/i);
                let h, m, s;
                if (ampmMatch) {
                    h = parseInt(ampmMatch[1], 10);
                    m = parseInt(ampmMatch[2], 10) || 0;
                    s = ampmMatch[3] ? (parseInt(ampmMatch[3], 10) || 0) : 0;
                    const period = ampmMatch[4].toUpperCase();
                    if (period === "PM" && h !== 12) { h += 12; }
                    if (period === "AM" && h === 12) { h = 0; }
                } else {
                    const parts = timeValue.split(":");
                    if (parts.length < 2) { return null; }
                    h = parseInt(parts[0], 10) || 0;
                    m = parseInt(parts[1], 10) || 0;
                    s = parts[2] ? (parseInt(parts[2], 10) || 0) : 0;
                }
                ms = ((h * 60 + m) * 60 + s) * 1000;
            } else {
                return null;
            }
            const total = Math.floor(ms / 1000);
            const days = Math.floor(total / 86400);
            const h = Math.floor((total % 86400) / 3600);
            const m = Math.floor((total % 3600) / 60);
            const s = total % 60;
            return `P${pad2(days)}DT${pad2(h)}H${pad2(m)}M${pad2(s)}S`;
        },

        formatDateTimeForEntityKey(dateValue) {
            if (!dateValue && dateValue !== 0) { return null; }
            let date;
            if (dateValue instanceof Date) {
                date = dateValue;
            } else if (typeof dateValue === "string" && dateValue.startsWith("/Date(")) {
                date = new Date(parseInt(dateValue.replace(/[^0-9]/g, ""), 10));
            } else if (typeof dateValue === "string") {
                date = new Date(dateValue);
            } else {
                return null;
            }
            if (isNaN(date.getTime())) { return null; }
            return [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-")
                + "T"
                + [pad2(date.getHours()), pad2(date.getMinutes()), pad2(date.getSeconds())].join(":");
        },

        /** @deprecated */
        formatDateTimeForKey(dateValue) { return this.formatDateTimeForEntityKey(dateValue); },

        parseByte: parseByteField,

        /**
         * Build ITM_STRSet payload.
         *
         * Edm.Byte  (p): ZdelayHrs, ZshortHrs, Zrepeatcount, Zsysyrepeatcount
         * Edm.String (s): ALL others incl. Zn0-Zn7, ZstdWeekHrs, ZwrkDyWeek
         *                 (confirmed in updated metadata 2025)
         */
        buildITMPayload(violationRecord, overrides) {
            const p = parseByteField;
            const s = safeStr;
            const r = violationRecord;

            const base = {
                // ── Employee ──────────────────────────────────────────────
                ZempId: s(r.ZempId),
                ZempName: s(r.ZempName),
                ZempType: s(r.ZempType),
                ZempTypeDesc: s(r.ZempTypeDesc),
                ZempClass: s(r.ZempClass),
                ZempClassDesc: s(r.ZempClassDesc),
                Zcompany: s(r.Zcompany),
                Znationality: s(r.Znationality),
                Zhiredate: r.Zhiredate || r.ZhireDate || null,
                Zpaygrade: s(r.Zpaygrade || r.ZpayGrade),
                ZunautDays: s(r.ZunautDays),
                // ── Position / Location ───────────────────────────────────
                Zposition: s(r.Zposition),
                Zjobtitle: s(r.Zjobtitle || r.ZjobTitle),
                Zjobclassification: s(r.Zjobclassification || r.ZjobClass),
                Zlocation: s(r.Zlocation),
                Zlocationgroup: s(r.Zlocationgroup || r.ZlocGroup),
                Zworkschedule: s(r.Zworkschedule),
                ZlatestNode: s(r.ZlatestNode),

                // Edm.String in updated metadata
                ZstdWeekHrs: s(r.ZstdWeekHrs),
                ZwrkDyWeek: s(r.ZwrkDyWeek),

                // ── Org Indicators — Edm.String (updated metadata) ────────
                Zn0: s(r.Zn0),
                Zn1: s(r.Zn1),
                Zn2: s(r.Zn2),
                Zn3: s(r.Zn3),
                Zn4: s(r.Zn4),
                Zn5: s(r.Zn5),
                Zn6: s(r.Zn6),
                Zn7: s(r.Zn7),

                // ── Violation ─────────────────────────────────────────────
                ZactionRefNo: s(r.ZactionRefNo || r.ZACTION_REF_NO),
                ZincDate: r.ZincDate || null,
                ZincCategory: s(r.ZincCategory),
                ZincType: s(r.ZincType),
                Zaction: s(r.Zaction),
                Zstatus: s(r.Zstatus || r.Status),   // HDR_STR: Zstatus; old code: r.Status (wrong)
                Zsanction: s(r.Zsanction),
                Zremark: s(r.Zremark),

                // ── Timeline ──────────────────────────────────────────────
                ZincDisDate: r.ZincDisDate || null,
                ZinitatedBy: s(r.ZinitatedBy),
                ZinitDate: r.ZinitDate || null,
                ZfirstIncDate: r.ZfirstIncDate || null,
                Zawaitingactionfrom: r.Zawaitingactionfrom || null,
                Zlastaction: r.Zlastaction || null,

                // ── Shift Times (Edm.Time) ────────────────────────────────
                ZschTimeIn: r.ZschTimeIn || null,
                ZschTimeOut: r.ZschTimeOut || null,
                Zpunchintime: r.Zpunchintime || null,
                Zpunchouttime: r.Zpunchouttime || null,

                // ── Edm.Byte — only these four remain as integers ─────────
                ZdelayHrs: s(r.ZdelayHrs),
                ZshortHrs: s(r.ZshortHrs),
                Zrepeatcount: p(r.Zrepeatcount),
                Zsysyrepeatcount: p(r.Zsysyrepeatcount),

                // ── Workflow: Line Manager ────────────────────────────────
                ZlmIdName: s(r.ZlmIdName),
                Zlinemanagername: s(r.Zlinemanagername),
                Zlinemanageraction: s(r.Zlinemanageraction),
                Zlinemanageractiondate: r.Zlinemanageractiondate || r.ZlmIdActionDate || null,
                Zlinemanagerremarks: s(r.Zlinemanagerremarks),

                // ── Workflow: HC Ops ──────────────────────────────────────
                Zhcopsname: s(r.Zhcopsname),
                Zhcopsaction: s(r.Zhcopsaction),
                Zhcopsactiondate: r.Zhcopsactiondate || null,
                Zhcopsremark: s(r.Zhcopsremark),

                // ── Workflow: HC EVP ──────────────────────────────────────
                Zhcevpname: s(r.Zhcevpname),
                Zhcevpaction: s(r.Zhcevpaction),
                Zhcevpactiondate: r.Zhcevpactiondate || null,
                Zhcevpremark: s(r.Zhcevpremark),

                // ── Workflow: Legal ───────────────────────────────────────
                Zlegalmembername: s(r.Zlegalmembername),
                Zlegalmemberaction: s(r.Zlegalmemberaction),
                Zlegalmemberactiondate: r.Zlegalmemberactiondate || null,
                Zlegalremark: s(r.Zlegalremark),

                // ── Workflow: CEO ─────────────────────────────────────────
                Zceoname: s(r.Zceoname),
                Zceoaction: s(r.Zceoaction),
                Zceoactiondate: r.Zceoactiondate || null,
                Zceoactionremark: s(r.Zceoactionremark)
            };

            return Object.assign(base, overrides || {});
        },

        buildPunchRegularizePayload(violationRecord, overrides) {
            const o = overrides || {};
            const r = violationRecord;
            return {
                ZempId: safeStr(r.ZempId),
                ZactionRefNo: safeStr(r.ZACTION_REF_NO || r.ZactionRefNo),
                ZincDate: this.formatDateTimeForPayload(r.ZincDate),
                ZschTimeIn: this.formatTimeDurationForPayload(o.ZschTimeIn || r.ZschTimeIn),
                Zpunchintime: this.formatTimeDurationForPayload(o.Zpunchintime || r.Zpunchintime),
                Zpunchouttime: this.formatTimeDurationForPayload(o.Zpunchouttime || r.Zpunchouttime),
                ZschTimeOut: this.formatTimeDurationForPayload(o.ZschTimeOut || r.ZschTimeOut),
                DelayFlag: (o.DelayFlag !== undefined && o.DelayFlag !== null)
                    ? String(o.DelayFlag) : "0"
            };
        },

        normalizePayloadForOData(payload) {
            const n = { ...payload };
            DATE_FIELDS_IN_PAYLOAD.forEach(f => { n[f] = this.formatDateTimeForPayload(n[f]); });
            TIME_FIELDS_IN_PAYLOAD.forEach(f => { n[f] = this.formatTimeDurationForPayload(n[f]); });
            return n;
        },

        /** @deprecated */
        _formatPayloadForOData(payload) { return this.normalizePayloadForOData(payload); },

        submitHCAction(oDataModel, violationRecord, overrides) {
            if (!oDataModel) {
                return Promise.reject(new Error("ODataUtils.submitHCAction: oDataModel is null."));
            }
            if (!violationRecord?.ZempId) {
                return Promise.reject(new Error("ODataUtils.submitHCAction: ZempId missing."));
            }
            if (!violationRecord.ZactionRefNo) {
                return Promise.reject(new Error("ODataUtils.submitHCAction: ZactionRefNo required."));
            }
            const payload = this.buildITMPayload(violationRecord, overrides || {});
            const normalized = this.normalizePayloadForOData(payload);
            const keyDate = this.formatDateTimeForEntityKey(violationRecord.ZincDate);
            const entityPath = `/ITM_STRSet(ZactionRefNo='${violationRecord.ZactionRefNo}',ZempId='${violationRecord.ZempId}',ZincDate=datetime'${keyDate}')`;
            oDataModel.setUseBatch(false);
            return new Promise((resolve, reject) => {
                oDataModel.update(entityPath, normalized, {
                    success: (r) => { console.log("submitHCAction: success", r); resolve(r); },
                    error: (e) => { console.error("submitHCAction: error", e); this.handleODataError(e, "Failed to submit action"); reject(e); }
                });
            });
        },

        /** @deprecated */
        submitTakeAction(oDataModel, violationRecord, overrides) {
            return this.submitHCAction(oDataModel, violationRecord, overrides);
        },

        submitPunchRegularize(oDataModel, violationRecord, overrides) {
            if (!oDataModel) {
                return Promise.reject(new Error("ODataUtils.submitPunchRegularize: oDataModel is null."));
            }
            if (!violationRecord?.ZempId) {
                return Promise.reject(new Error("ODataUtils.submitPunchRegularize: ZempId missing."));
            }
            const actionRefNo = violationRecord.ZACTION_REF_NO || violationRecord.ZactionRefNo;
            if (!actionRefNo) {
                return Promise.reject(new Error("ODataUtils.submitPunchRegularize: ZactionRefNo required."));
            }
            const payload = this.buildPunchRegularizePayload(violationRecord, overrides || {});
            const keyDate = this.formatDateTimeForEntityKey(violationRecord.ZincDate);
            const delayFlag = payload.DelayFlag;
            const entityPath = `/punch_regularizeSet(ZempId='${violationRecord.ZempId}',ZactionRefNo='${actionRefNo}',ZincDate=datetime'${keyDate}',DelayFlag='${delayFlag}')`;
            oDataModel.setUseBatch(false);
            return new Promise((resolve, reject) => {
                oDataModel.update(entityPath, payload, {
                    bMerge: false,
                    success: (r) => { console.log("submitPunchRegularize: success", r); resolve(r); },
                    error: (e) => { console.error("submitPunchRegularize: error", e); this.handleODataError(e, "Failed to submit regularization"); reject(e); }
                });
            });
        }
    };

    return ODataUtils;
});
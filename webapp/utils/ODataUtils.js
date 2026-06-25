sap.ui.define([], () => {
    "use strict";

    // ─── Constants ────────────────────────────────────────────────────────────

    const LOCAL_HOSTNAMES   = ["localhost", "127.0.0.1"];
    const DEV_USER_ID       = "200129";
    const ALT_USER_FALLBACK = "200130";
    const DEV_SAP_USER      = "DACO_EAMV04";

    const DATE_FIELDS_IN_PAYLOAD = [
        "Zhiredate", "ZincDisDate", "ZinitDate", "ZfirstIncDate", "ZincDate",
        "Zawaitingactionfrom", "Zlastaction", "Zlinemanageractiondate",
        "Zhcopsactiondate", "Zhcevpactiondate", "Zlegalmemberactiondate",
        "Zceoactiondate"
    ];

    const TIME_FIELDS_IN_PAYLOAD = [
        "ZschTimeIn", "ZschTimeOut", "Zpunchintime", "Zpunchouttime"
    ];

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * Parse integer; return 0 on NaN. Used for Edm.Byte fields.
     */
    function parseByteField(value) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Convert total seconds to zero-padded "HH:mm:ss".
     */
    function secondsToTimeString(totalSeconds) {
        if (totalSeconds < 0) { totalSeconds = 0; }
        const hours   = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Zero-pad a number to 2 digits.
     */
    function pad2(n) {
        return String(n).padStart(2, "0");
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    const ODataUtils = {

        // ── Error Handling ────────────────────────────────────────────────────

        /**
         * Extract a human-readable error message from an OData error response
         * and show it in a MessageBox.
         */
        handleODataError(error, title) {
            let message = title || "An error occurred.";

            try {
                if (error.responseText) {
                    const parsed      = JSON.parse(error.responseText);
                    const errorBody   = parsed.error || parsed;
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
            } catch (parseError) {
                console.error("ODataUtils: failed to parse error response:", parseError);
                message = error.statusText || "An unexpected error occurred.";
            }

            console.error("ODataUtils.handleODataError:", error);
            sap.m.MessageBox.error(message, { title: title || "Error" });
        },

        // ── OData Read ────────────────────────────────────────────────────────

        /**
         * Promise-based wrapper around ODataModel.read().
         * Resolves with results array; rejects with error object.
         */
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
                        console.error("ODataUtils.fetchOData error:", {
                            entitySetPath,
                            statusCode: error.statusCode,
                            statusText: error.statusText,
                            message:    error.message
                        });
                        reject(error);
                    }
                });
            });
        },

        // ── Edm.Time Formatting ───────────────────────────────────────────────

        /**
         * Convert OData Edm.Time to "HH:mm:ss" display string.
         * Accepts: { ms: number } | number (ms) | "HH:mm:ss" string | null | undefined
         */
        formatEdmTime(edmTime) {
            if (edmTime === null || edmTime === undefined) { return ""; }
            if (typeof edmTime === "string")              { return edmTime; }

            let milliseconds;
            if (typeof edmTime === "object" && edmTime.ms !== undefined) {
                milliseconds = edmTime.ms;
            } else if (typeof edmTime === "number") {
                milliseconds = edmTime;
            } else {
                return "";
            }

            const totalSeconds = Math.floor(milliseconds / 1000);
            return secondsToTimeString(totalSeconds);
        },

        // ── User Identity ─────────────────────────────────────────────────────

        /**
         * Return the current SAP user ID.
         * Falls back to a dev ID when running locally.
         */
        getCurrentUserId() {
            if (LOCAL_HOSTNAMES.includes(window.location.hostname)) {
                return DEV_USER_ID;
            }
            const sapUserId = sap.ushell.Container.getService("UserInfo").getUser().getId();
            return sapUserId;
        },

        /**
         * @deprecated Use getCurrentUserId() instead.
         */
        getuserId() {
            return this.getCurrentUserId();
        },

        // ── Payload Formatters ────────────────────────────────────────────────

        /**
         * Convert "HH:mm:ss" or "HH:mm" → { ms, __edmType } for OData Edm.Time fields.
         * Returns null for empty input.
         */
        formatTimeForPayload(timeString) {
            if (!timeString) { return null; }

            const parts = timeString.split(":");
            if (parts.length < 2) { return null; }

            const hours   = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);
            const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
            const ms      = ((hours * 60 + minutes) * 60 + seconds) * 1000;

            return { ms, __edmType: "Edm.Time" };
        },

        /**
         * Convert Date | ISO string | "/Date(ms)/" → "/Date(ms)/" string for OData payload.
         * Returns null for empty / invalid input.
         */
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

        /**
         * Convert Edm.Time value → ISO 8601 duration "P00DT08H30M00S" for PUT payloads.
         * Accepts: { ms } | number (ms) | "HH:mm:ss" string | ISO duration string | null
         */
        formatTimeDurationForPayload(timeValue) {
            if (timeValue === null || timeValue === undefined || timeValue === "") { return null; }

            let milliseconds;

            if (typeof timeValue === "object" && timeValue.ms !== undefined) {
                milliseconds = timeValue.ms;
            } else if (typeof timeValue === "number") {
                milliseconds = timeValue;
            } else if (typeof timeValue === "string") {
                // Already a duration string like "P00DT08H30M00S"
                if (/^P\d+DT\d+H\d+M\d+S$/.test(timeValue)) { return timeValue; }

                const parts = timeValue.split(":");
                if (parts.length < 2) { return null; }

                const hours   = parseInt(parts[0], 10) || 0;
                const minutes = parseInt(parts[1], 10) || 0;
                const seconds = parts[2] ? (parseInt(parts[2], 10) || 0) : 0;
                milliseconds  = ((hours * 60 + minutes) * 60 + seconds) * 1000;
            } else {
                return null;
            }

            const totalSeconds = Math.floor(milliseconds / 1000);
            const days    = Math.floor(totalSeconds / 86400);
            const hours   = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return `P${pad2(days)}DT${pad2(hours)}H${pad2(minutes)}M${pad2(seconds)}S`;
        },

        /**
         * Format DateTime for use inside an OData entity key string.
         * Returns "yyyy-MM-ddTHH:mm:ss" or null.
         */
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

            return [
                date.getFullYear(),
                pad2(date.getMonth() + 1),
                pad2(date.getDate())
            ].join("-") + "T" + [
                pad2(date.getHours()),
                pad2(date.getMinutes()),
                pad2(date.getSeconds())
            ].join(":");
        },

        /**
         * @deprecated Use formatDateTimeForEntityKey() instead.
         */
        formatDateTimeForKey(dateValue) {
            return this.formatDateTimeForEntityKey(dateValue);
        },

        // ── Byte Field Parser ─────────────────────────────────────────────────

        /**
         * Safe parseInt for Edm.Byte fields — returns 0 on NaN.
         */
        parseByte: parseByteField,

        // ── Payload Builders ──────────────────────────────────────────────────

        /**
         * Build a full ITM_STRSet POST/PUT payload from a violation record.
         * @param {object} violationRecord - record from detailData model
         * @param {object} overrides       - fields to override (e.g. Zaction, Zremark)
         */
        buildITMPayload(violationRecord, overrides) {
            const p = parseByteField;
            const r = violationRecord;

            const basePayload = {
                // ── Employee ──────────────────────────────────────────────
                ZempId:          r.ZempId          || "",
                ZempName:        r.ZempName        || "",
                ZempType:        r.ZempType        || "",
                ZempTypeDesc:    r.ZempTypeDesc    || "",
                ZempClass:       r.ZempClass       || "",
                ZempClassDesc:   r.ZempClassDesc   || "",
                Zcompany:        r.Zcompany        || "",
                Znationality:    r.Znationality    || "",
                Zhiredate:       r.ZhireDate       || null,
                Zpaygrade:       r.ZpayGrade       || null,
                Zposition:       r.Zposition       || "",
                Zjobtitle:       r.ZjobTitle       || "",
                Zjobclassification: r.Zjobclassification || "",
                Zlocation:       r.Zlocation       || "",
                Zlocationgroup:  r.ZlocGroup       || "",
                Zworkschedule:   r.Zworkschedule   || "",
                ZlatestNode:     r.ZlatestNode     || "",
                ZstdWeekHrs:     p(r.ZstdWeekHrs),
                ZwrkDyWeek:      p(r.ZwrkDyWeek),

                // ── Org Indicators ────────────────────────────────────────
                Zn0: p(r.Zn0),
                Zn1: p(r.Zn1),
                Zn2: p(r.Zn2),
                Zn3: p(r.Zn3),
                Zn4: p(r.Zn4),
                Zn5: p(r.Zn5),
                Zn6: p(r.Zn6),
                Zn7: p(r.Zn7),

                // ── Violation ─────────────────────────────────────────────
                ZactionRefNo: r.ZACTION_REF_NO || "",
                ZincDate:     r.ZincDate       || null,
                ZincCategory: r.ZincCategory   || "",
                ZincType:     r.ZincType       || "",
                Zaction:      r.Zaction        || "",
                Zstatus:      r.Status         || "",
                Zsanction:    r.Zsanction      || "",
                Zremark:      r.Zremark        || "",

                // ── Timeline ──────────────────────────────────────────────
                ZincDisDate:       r.ZincDisDate       || null,
                ZinitatedBy:       r.ZinitatedBy       || "",
                ZinitDate:         r.ZinitDate         || null,
                ZfirstIncDate:     r.ZfirstIncDate     || null,
                Zawaitingactionfrom: r.Zawaitingactionfrom || null,
                Zlastaction:       r.Zlastaction       || null,

                // ── Shift Times ───────────────────────────────────────────
                ZschTimeIn:   r.ZschTimeIn   || null,
                ZschTimeOut:  r.ZschTimeOut  || null,
                Zpunchintime: r.Zpunchintime || null,
                Zpunchouttime:r.Zpunchouttime|| null,
                ZdelayHrs:    p(r.ZdelayHrs),
                ZshortHrs:    p(r.ZshortHrs),
                Zrepeatcount: p(r.Zrepeatcount),
                Zsysyrepeatcount: p(r.Zsysyrepeatcount),

                // ── Workflow: Line Manager ─────────────────────────────────
                ZlmIdName:            r.ZlmIdName            || "",
                Zlinemanageraction:   r.Zlinemanageraction   || "",
                Zlinemanageractiondate: r.ZlmIdActionDate    || null,
                Zlinemanagerremarks:  r.Zlinemanagerremarks  || "",

                // ── Workflow: HC Ops ──────────────────────────────────────
                Zhcopsname:     r.Zhcopsname     || "",
                Zhcopsaction:   r.Zhcopsaction   || "",
                Zhcopsactiondate: r.Zhcopsactiondate || null,
                Zhcopsremark:   r.Zhcopsremark   || "",

                // ── Workflow: HC EVP ──────────────────────────────────────
                Zhcevpname:     r.Zhcevpname     || "",
                Zhcevpaction:   r.Zhcevpaction   || "",
                Zhcevpactiondate: r.Zhcevpactiondate || null,
                Zhcevpremark:   r.Zhcevpremark   || "",

                // ── Workflow: Legal ───────────────────────────────────────
                Zlegalmembername:   r.Zlegalmembername   || "",
                Zlegalmemberaction: r.Zlegalmemberaction || "",
                Zlegalmemberactiondate: r.Zlegalmemberactiondate || null,
                Zlegalremark:       r.Zlegalremark       || "",

                // ── Workflow: CEO ─────────────────────────────────────────
                Zceoname:       r.Zceoname       || "",
                Zceoaction:     r.Zceoaction     || "",
                Zceoactiondate: r.Zceoactiondate || null,
                Zceoactionremark: r.Zceoactionremark || ""
            };

            return Object.assign(basePayload, overrides || {});
        },

        /**
         * Build payload for PUT to /punch_regularizeSet(...).
         * All time fields converted to ISO 8601 duration strings.
         */
        buildPunchRegularizePayload(violationRecord, overrides) {
            const o = overrides || {};
            const r = violationRecord;

            return {
                ZempId:       r.ZempId || "",
                ZactionRefNo: r.ZACTION_REF_NO || r.ZactionRefNo || "",
                ZincDate:     this.formatDateTimeForPayload(r.ZincDate),
                ZschTimeIn:   this.formatTimeDurationForPayload(o.ZschTimeIn   || r.ZschTimeIn),
                Zpunchintime: this.formatTimeDurationForPayload(o.Zpunchintime  || r.Zpunchintime),
                Zpunchouttime:this.formatTimeDurationForPayload(o.Zpunchouttime || r.Zpunchouttime),
                ZschTimeOut:  this.formatTimeDurationForPayload(o.ZschTimeOut   || r.ZschTimeOut),
                DelayFlag:    o.DelayFlag !== undefined && o.DelayFlag !== null
                                  ? String(o.DelayFlag)
                                  : "0"
            };
        },

        /**
         * Convert all date and time fields in a payload to OData-safe formats.
         * Used before PUT operations.
         */
        normalizePayloadForOData(payload) {
            const normalized = { ...payload };

            DATE_FIELDS_IN_PAYLOAD.forEach(field => {
                normalized[field] = this.formatDateTimeForPayload(normalized[field]);
            });

            TIME_FIELDS_IN_PAYLOAD.forEach(field => {
                normalized[field] = this.formatTimeDurationForPayload(normalized[field]);
            });

            return normalized;
        },

        /**
         * @deprecated Use normalizePayloadForOData() instead.
         */
        _formatPayloadForOData(payload) {
            return this.normalizePayloadForOData(payload);
        },

        // ── OData Write Operations ────────────────────────────────────────────

        /**
         * PUT to ITM_STRSet to record an HC action (Take Action / Take No Action).
         * Constructs the entity key from ZactionRefNo, ZempId, and ZincDate.
         */
        submitHCAction(oDataModel, violationRecord, overrides) {
            if (!oDataModel) {
                return Promise.reject(new Error("ODataUtils.submitHCAction: oDataModel is null."));
            }
            if (!violationRecord?.ZempId) {
                return Promise.reject(new Error("ODataUtils.submitHCAction: violationRecord or ZempId missing."));
            }
            if (!violationRecord.ZactionRefNo) {
                return Promise.reject(new Error("ODataUtils.submitHCAction: ZactionRefNo required."));
            }

            const payload       = this.buildITMPayload(violationRecord, overrides || {});
            const normalPayload = this.normalizePayloadForOData(payload);

            const incDateKey  = this.formatDateTimeForEntityKey(violationRecord.ZincDate);
            const entityPath  = `/ITM_STRSet(ZactionRefNo='${violationRecord.ZactionRefNo}',ZempId='${violationRecord.ZempId}',ZincDate=datetime'${incDateKey}')`;

            oDataModel.setUseBatch(false);

            return new Promise((resolve, reject) => {
                oDataModel.update(entityPath, normalPayload, {
                    success: (response) => {
                        console.log("ODataUtils.submitHCAction: success", response);
                        resolve(response);
                    },
                    error: (error) => {
                        console.error("ODataUtils.submitHCAction: error", error);
                        this.handleODataError(error, "Failed to submit action");
                        reject(error);
                    }
                });
            });
        },

        /**
         * @deprecated Use submitHCAction() instead.
         */
        submitTakeAction(oDataModel, violationRecord, overrides) {
            return this.submitHCAction(oDataModel, violationRecord, overrides);
        },

        /**
         * PUT to punch_regularizeSet to record corrected punch times.
         */
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

            const payload     = this.buildPunchRegularizePayload(violationRecord, overrides || {});
            const incDateKey  = this.formatDateTimeForEntityKey(violationRecord.ZincDate);
            const delayFlag   = payload.DelayFlag;

            const entityPath = `/punch_regularizeSet(ZempId='${violationRecord.ZempId}',ZactionRefNo='${actionRefNo}',ZincDate=datetime'${incDateKey}',DelayFlag='${delayFlag}')`;

            oDataModel.setUseBatch(false);

            return new Promise((resolve, reject) => {
                oDataModel.update(entityPath, payload, {
                    bMerge: false,
                    success: (response) => {
                        console.log("ODataUtils.submitPunchRegularize: success", response);
                        resolve(response);
                    },
                    error: (error) => {
                        console.error("ODataUtils.submitPunchRegularize: error", error);
                        this.handleODataError(error, "Failed to submit regularization");
                        reject(error);
                    }
                });
            });
        }
    };

    return ODataUtils;
});
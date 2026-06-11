sap.ui.define([], () => {
    "use strict";

    /**
     * ODataUtils — shared helpers for all controllers in zhrsanctions.
     *
     * Usage in any controller:
     *   sap.ui.define([
     *       ...,
     *       "zhrsanctions/utils/ODataUtils"
     *   ], (..., ODataUtils) => {
     *       ...
     *       // Read
     *       ODataUtils.fetchOData(oModel, "/HDR_STRSet", aFilters)
     *           .then(aResults => { ... })
     *           .catch(oErr => ODataUtils.handleODataError(oErr, "Load failed"));
     *
     *       // In an OData create/update error callback
     *       error: (oErr) => ODataUtils.handleODataError(oErr, "Save failed")
     *   });
     */
    const ODataUtils = {

        // ── Error Handler ─────────────────────────────────────────────────────
        //
        // Parses an OData v2 error response and shows a sap.m.MessageBox.
        //
        // Priority for the message text:
        //   1. innererror.errordetails[0].message  (most specific SAP ABAP message)
        //   2. error.message  (top-level OData error)
        //   3. oErr.message   (JS Error / network error)
        //   4. oErr.statusText
        //   5. Fallback generic string
        //
        // @param {object} oErr    – The error from the OData reject / error callback.
        // @param {string} [sTitle] – Dialog title. Doubles as the fallback message text.

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

        // ── OData Read (Promise wrapper) ───────────────────────────────────────
        //
        // Wraps ODataModel.read() in a Promise so callers can use async/await.
        //
        // @param {sap.ui.model.odata.v2.ODataModel} oModel       – An initialised ODataModel instance.
        // @param {string}                            sEntityPath  – Entity set path, e.g. "/HDR_STRSet".
        // @param {sap.ui.model.Filter[]}             [aFilters]   – Optional filter array.
        // @returns {Promise<object[]>}  Resolves with the results array.

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
        }
    };

    return ODataUtils;
});

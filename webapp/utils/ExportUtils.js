sap.ui.define([
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/m/MessageToast"
], (Spreadsheet, exportLibrary, MessageToast) => {
    "use strict";

    const EdmType = exportLibrary.EdmType;

    // Map our simple config flags to sap.ui.export EdmType.
    // Extend this if you introduce new data types (Boolean, Number, etc).
    function getEdmType(cfg) {
        if (cfg.isTime || cfg.isDate) {
            return EdmType.String; // already formatted to display strings before export
        }
        if (cfg.isNumber) {
            return EdmType.Number;
        }
        return EdmType.String;
    }

    const ExportUtils = {

        /**
         * Export the rows currently bound to a table (respecting active filters/sorters)
         * to an .xlsx file, using the same column config used to build the table.
         *
         * @param {sap.ui.table.Table|sap.m.Table} oTable - table whose binding provides the data
         * @param {Array} aConfig - column config array, e.g. CURRENT_COLUMNS / HISTORY_COLUMNS
         *                          each entry: { label, binding, visible, isTime, isDate, isNumber, width }
         * @param {string} [sFileName] - file name without extension (default: "export")
         * @param {function} [fnTimeFormatter] - optional formatter(oRawValue) => string,
         *                          used for columns flagged isTime (defaults to ODataUtils.formatEdmTime if not supplied)
         */
        exportTableToExcel(oTable, aConfig, sFileName, fnTimeFormatter) {
            if (!oTable) {
                MessageToast.show("Nothing to export: table not found.");
                return;
            }

            const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
            if (!oBinding) {
                MessageToast.show("Nothing to export: table has no data binding.");
                return;
            }

            // Pull all currently-filtered/sorted rows (not just what's rendered/scrolled into view)
            const aContexts = oBinding.getContexts(0, oBinding.getLength());
            const aData = aContexts.map(oContext => oContext.getObject());

            if (!aData.length) {
                MessageToast.show("No data available to export.");
                return;
            }

            const aVisibleCols = aConfig.filter(cfg => cfg.visible !== false);

            // Build sap.ui.export column definitions
            const aColumns = aVisibleCols.map(cfg => ({
                label: cfg.label,
                property: cfg.binding,
                type: getEdmType(cfg),
                width: cfg.exportWidth || undefined
            }));

            // Pre-format time/date fields into plain display strings so Excel shows
            // readable values instead of raw OData payload objects ({ms, __edmType}, /Date(...)/  etc).
            const aExportRows = aData.map(oRow => {
                const oFormattedRow = { ...oRow };
                aVisibleCols.forEach(cfg => {
                    if (cfg.isTime) {
                        oFormattedRow[cfg.binding] = fnTimeFormatter
                            ? fnTimeFormatter(oRow[cfg.binding])
                            : ExportUtils._defaultFormatEdmTime(oRow[cfg.binding]);
                    } else if (cfg.isDate) {
                        oFormattedRow[cfg.binding] = ExportUtils._defaultFormatEdmDate(oRow[cfg.binding]);
                    }
                });
                return oFormattedRow;
            });

            const oSettings = {
                workbook: {
                    columns: aColumns,
                    hierarchyLevel: undefined,
                    context: {
                        sheetName: (sFileName || "Export").substring(0, 31) // Excel sheet name limit
                    }
                },
                dataSource: aExportRows,
                fileName: `${sFileName || "export"}.xlsx`
            };

            const oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(() => {
                    MessageToast.show("Export completed.");
                })
                .catch((oError) => {
                    console.error("ExportUtils.exportTableToExcel: export failed", oError);
                    MessageToast.show("Export failed. See console for details.");
                })
                .finally(() => {
                    oSheet.destroy();
                });
        },

        // ── Fallback formatters (used only if caller doesn't pass fnTimeFormatter) ──
        // Mirrors ODataUtils.formatEdmTime so this file has no hard dependency on it.

        _defaultFormatEdmTime(oTime) {
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

        _defaultFormatEdmDate(vDate) {
            if (!vDate) {
                return "";
            }
            let dDate;
            if (vDate instanceof Date) {
                dDate = vDate;
            } else if (typeof vDate === "string" && vDate.startsWith("/Date(")) {
                const iMs = parseInt(vDate.replace(/[^0-9]/g, ""), 10);
                dDate = new Date(iMs);
            } else if (typeof vDate === "string") {
                dDate = new Date(vDate);
            } else {
                return "";
            }
            if (isNaN(dDate.getTime())) {
                return "";
            }
            const yyyy = dDate.getFullYear();
            const mm = String(dDate.getMonth() + 1).padStart(2, "0");
            const dd = String(dDate.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        }
    };

    return ExportUtils;
});
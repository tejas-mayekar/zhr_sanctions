sap.ui.define([
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/m/MessageToast"
], (Spreadsheet, exportLibrary, MessageToast) => {
    "use strict";

    const EdmType = exportLibrary.EdmType;

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * Map column config flags to sap.ui.export EdmType.
     */
    function resolveEdmType(columnConfig) {
        if (columnConfig.isTime || columnConfig.isDate) { return EdmType.String; }
        if (columnConfig.isNumber)                      { return EdmType.Number; }
        return EdmType.String;
    }

    /**
     * Convert an OData Edm.Time value to "HH:mm:ss" display string.
     * Mirrors ODataUtils.formatEdmTime to avoid a hard dependency.
     */
    function defaultFormatEdmTime(edmTime) {
        if (edmTime === null || edmTime === undefined) { return ""; }
        if (typeof edmTime === "string")               { return edmTime; }

        let ms;
        if (typeof edmTime === "object" && edmTime.ms !== undefined) {
            ms = edmTime.ms;
        } else if (typeof edmTime === "number") {
            ms = edmTime;
        } else {
            return "";
        }

        const totalSec = Math.floor(ms / 1000);
        const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const ss = String(totalSec % 60).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
    }

    /**
     * Convert an OData DateTime value to "yyyy-MM-dd" display string.
     */
    function defaultFormatEdmDate(dateValue) {
        if (!dateValue) { return ""; }

        let date;
        if (dateValue instanceof Date) {
            date = dateValue;
        } else if (typeof dateValue === "string" && dateValue.startsWith("/Date(")) {
            date = new Date(parseInt(dateValue.replace(/[^0-9]/g, ""), 10));
        } else if (typeof dateValue === "string") {
            date = new Date(dateValue);
        } else {
            return "";
        }

        if (isNaN(date.getTime())) { return ""; }

        const yyyy = date.getFullYear();
        const mm   = String(date.getMonth() + 1).padStart(2, "0");
        const dd   = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    const ExportUtils = {

        /**
         * Export currently bound (and filtered) table rows to an .xlsx file.
         *
         * @param {sap.ui.table.Table} table         - source table
         * @param {Array}              columnConfigs  - same config used to build the table
         * @param {string}             [fileName]     - base file name without extension
         * @param {Function}           [timeFormatter]- formatter(rawValue) → string for isTime cols
         */
        exportTableToExcel(table, columnConfigs, fileName, timeFormatter) {
            if (!table) {
                MessageToast.show("Nothing to export: table not found.");
                return;
            }

            const binding = table.getBinding("rows") || table.getBinding("items");
            if (!binding) {
                MessageToast.show("Nothing to export: table has no data binding.");
                return;
            }

            const allRows = binding
                .getContexts(0, binding.getLength())
                .map(ctx => ctx.getObject());

            if (!allRows.length) {
                MessageToast.show("No data available to export.");
                return;
            }

            const visibleColumns = columnConfigs.filter(col => col.visible !== false);

            // sap.ui.export column definitions
            const exportColumns = visibleColumns.map(col => ({
                label:    col.label,
                property: col.binding,
                type:     resolveEdmType(col),
                width:    col.exportWidth || undefined
            }));

            // Pre-format time/date fields so Excel gets readable strings
            const formattedRows = allRows.map(row => {
                const formattedRow = { ...row };

                visibleColumns.forEach(col => {
                    if (col.isTime) {
                        formattedRow[col.binding] = timeFormatter
                            ? timeFormatter(row[col.binding])
                            : defaultFormatEdmTime(row[col.binding]);
                    } else if (col.isDate) {
                        formattedRow[col.binding] = defaultFormatEdmDate(row[col.binding]);
                    }
                });

                return formattedRow;
            });

            const baseName    = fileName || "export";
            const sheetName   = baseName.substring(0, 31); // Excel sheet name limit

            const spreadsheet = new Spreadsheet({
                workbook: {
                    columns: exportColumns,
                    context: { sheetName }
                },
                dataSource: formattedRows,
                fileName:   `${baseName}.xlsx`
            });

            spreadsheet.build()
                .then(() => MessageToast.show("Export completed."))
                .catch(error => {
                    console.error("ExportUtils.exportTableToExcel: export failed", error);
                    MessageToast.show("Export failed. See console for details.");
                })
                .finally(() => spreadsheet.destroy());
        }
    };

    return ExportUtils;
});
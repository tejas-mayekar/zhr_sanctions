sap.ui.define([
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils"
], (Column, Label, Text, Filter, FilterOperator, ODataUtils) => {
    "use strict";

    const TableUtils = {

        /**
         * Dynamically add columns to a sap.ui.table.Table from a column config array.
         *
         * @param {sap.ui.table.Table} table          - target table
         * @param {Array}              columnConfigs   - array of column descriptor objects
         * @param {Function}           [timeFormatter] - optional formatter for isTime columns
         * @param {Function}           [dateFormatter] - optional formatter for isDate columns
         * @param {Function}           [statusFormatter] - optional formatter for isStatus columns
         */
        buildTableColumns(table, columnConfigs, timeFormatter, dateFormatter, statusFormatter) {
            const formatTime = timeFormatter || ODataUtils.formatEdmTime.bind(ODataUtils);

            columnConfigs
                .filter(col => col.visible)
                .forEach(col => {
                    let cellBindingInfo;

                    if (col.isTime) {
                        cellBindingInfo = { path: col.binding, formatter: formatTime };
                    } else if (col.isDate && dateFormatter) {
                        cellBindingInfo = { path: col.binding, formatter: dateFormatter };
                    } else if (col.isStatus && statusFormatter) {
                        cellBindingInfo = { path: col.binding, formatter: statusFormatter };
                    } else {
                        cellBindingInfo = `{${col.binding}}`;
                    }

                    table.addColumn(new Column({
                        label:          new Label({ text: col.label }),
                        template:       new Text({ text: cellBindingInfo, wrapping: false }),
                        sortProperty:   col.sortProperty,
                        filterProperty: col.filterProperty,
                        autoResizable:  true,
                        width:          col.width
                    }));
                });
        },

        applyTableSearch(table, columnConfigs, searchQuery) {
            const binding = table.getBinding("rows");
            if (!binding) { return; }

            const columnFilters = searchQuery
                ? columnConfigs
                    .filter(col => col.visible && col.filterProperty)
                    .map(col => new Filter(col.filterProperty, FilterOperator.Contains, searchQuery))
                : [];

            binding.filter(
                columnFilters.length
                    ? [new Filter({ filters: columnFilters, and: false })]
                    : []
            );
        }
    };

    return TableUtils;
});
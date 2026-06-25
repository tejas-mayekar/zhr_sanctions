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
         * @param {sap.ui.table.Table} table         - target table
         * @param {Array}              columnConfigs  - array of column descriptor objects
         * @param {Function}           [timeFormatter] - optional formatter for isTime columns
         */
        buildTableColumns(table, columnConfigs, timeFormatter) {
            const formatTime = timeFormatter || ODataUtils.formatEdmTime.bind(ODataUtils);

            columnConfigs
                .filter(col => col.visible)
                .forEach(col => {
                    const cellBindingInfo = col.isTime
                        ? { path: col.binding, formatter: formatTime }
                        : `{${col.binding}}`;

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

        /**
         * Apply an OR-filter across all visible filterable columns.
         * Clears filters when query is empty.
         *
         * @param {sap.ui.table.Table} table         - target table
         * @param {Array}              columnConfigs  - column descriptor array
         * @param {string}             searchQuery    - text to search
         */
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
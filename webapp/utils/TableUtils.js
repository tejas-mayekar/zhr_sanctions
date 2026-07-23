sap.ui.define([
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/TimePicker",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils"
], (Column, Label, Text, TimePicker, Filter, FilterOperator, ODataUtils) => {
    "use strict";

    const TableUtils = {

        buildTableColumns(table, columnConfigs, timeFormatter, dateFormatter, statusFormatter, actionFormatter, modelPrefix) {
            const formatTime = timeFormatter || ODataUtils.formatEdmTime.bind(ODataUtils);
            const prefix = modelPrefix ? `${modelPrefix}>` : "";

            columnConfigs
                .filter(col => col.visible)
                .forEach(col => {
                    let cellBindingInfo;

                    if (col.isTime) {
                        cellBindingInfo = { path: `${prefix}${col.binding}`, formatter: formatTime };
                    } else if (col.isDate && dateFormatter) {
                        cellBindingInfo = { path: `${prefix}${col.binding}`, formatter: dateFormatter };
                    } else if (col.isStatus && statusFormatter) {
                        cellBindingInfo = { path: `${prefix}${col.binding}`, formatter: statusFormatter };
                    } else if (col.isAction && actionFormatter) {
                        cellBindingInfo = { path: `${prefix}${col.binding}`, formatter: actionFormatter };
                    } else {
                        cellBindingInfo = `{${prefix}${col.binding}}`;
                    }

                    let template;
                    if (col.editableConfig) {
                        const ec = col.editableConfig; // { dependsOn, formatter, onChange, binding }
                        template = new TimePicker({
                            value: { path: `${prefix}${col.binding}`, formatter: formatTime },
                            valueFormat: "HH:mm:ss",
                            displayFormat: "HH:mm:ss",
                            editable: {
                                parts: [
                                    { path: `${prefix}${ec.dependsOn}` },
                                    { path: `${prefix}${col.binding}` }
                                ],
                                formatter: ec.formatter
                            },

                            change: ec.onChange
                        });
                    } else {
                        template = new Text({ text: cellBindingInfo, wrapping: false });
                    }

                    table.addColumn(new Column({
                        label: new Label({ text: col.label }),
                        template: template,
                        sortProperty: col.sortProperty,
                        filterProperty: col.filterProperty,
                        autoResizable: true,
                        width: col.width
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
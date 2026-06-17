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

        buildTableColumns(oTable, aConfig, fnTimeFormatter) {
            const fnFormat = fnTimeFormatter || ODataUtils.formatEdmTime.bind(ODataUtils);
            aConfig
                .filter(cfg => cfg.visible)
                .forEach(cfg => {
                    const oBindingInfo = cfg.isTime
                        ? { path: cfg.binding, formatter: fnFormat }
                        : `{${cfg.binding}}`;

                    oTable.addColumn(new Column({
                        label: new Label({ text: cfg.label }),
                        template: new Text({ text: oBindingInfo, wrapping: false }),
                        sortProperty: cfg.sortProperty,
                        filterProperty: cfg.filterProperty,
                        autoResizable: true,
                        width: cfg.width
                    }));
                });
        },

        applyTableSearch(oTable, aConfig, sQuery) {
            const oBinding = oTable.getBinding("rows");
            if (!oBinding) {
                return;
            }
            const aFilters = sQuery
                ? aConfig
                    .filter(cfg => cfg.visible && cfg.filterProperty)
                    .map(cfg => new Filter(cfg.filterProperty, FilterOperator.Contains, sQuery))
                : [];

            oBinding.filter(
                aFilters.length ? [new Filter({ filters: aFilters, and: false })] : []
            );
        }
    };

    return TableUtils;
});

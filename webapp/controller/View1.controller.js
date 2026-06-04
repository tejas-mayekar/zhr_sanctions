sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Column, Label, Text, JSONModel, Filter, FilterOperator) => {
    "use strict";

    // ─── Column configs per tab ───────────────────────────────────────────────

    const CURRENT_COLUMNS = [
        { label: "Action Ref No",  binding: "ZactionRefNo",  width: "11rem", sortProperty: "ZactionRefNo",  filterProperty: "ZactionRefNo",  visible: true  },
        { label: "Employee ID",    binding: "EmployeeId",    width: "9rem",  sortProperty: "EmployeeId",    filterProperty: "EmployeeId",    visible: true  },
        { label: "Violation Type", binding: "ViolationType", width: "14rem", sortProperty: "ViolationType", filterProperty: "ViolationType", visible: true  },
        { label: "Status",         binding: "Status",        width: "8rem",  sortProperty: "Status",        filterProperty: "Status",        visible: false },
        { label: "Date",           binding: "ActionDate",    width: "10rem", sortProperty: "ActionDate",    filterProperty: "ActionDate",    visible: true  },
    ];

    const HISTORY_COLUMNS = [
        { label: "Action Ref No",  binding: "ZactionRefNo",  width: "11rem", sortProperty: "ZactionRefNo",  filterProperty: "ZactionRefNo",  visible: true  },
        { label: "Employee ID",    binding: "EmployeeId",    width: "9rem",  sortProperty: "EmployeeId",    filterProperty: "EmployeeId",    visible: true  },
        { label: "Closed Date",    binding: "ClosedDate",    width: "10rem", sortProperty: "ClosedDate",    filterProperty: "ClosedDate",    visible: true  },
        { label: "Resolution",     binding: "Resolution",    width: "14rem", sortProperty: "Resolution",    filterProperty: "Resolution",    visible: true  },
        { label: "Resolved By",    binding: "ResolvedBy",    width: "10rem", sortProperty: "ResolvedBy",    filterProperty: "ResolvedBy",    visible: true  },
    ];

    // ─────────────────────────────────────────────────────────────────────────

    return Controller.extend("zhrsanctions.controller.View1", {

        onInit() {
            // UI state model
            const oModel = new JSONModel({ currentCount: 0, historyCount: 0 });
            this.getView().setModel(oModel);

            this._buildColumns("currentTable",  CURRENT_COLUMNS);
            this._buildColumns("historyTable",  HISTORY_COLUMNS);
        },

        // ── Column builder ────────────────────────────────────────────────────

        _buildColumns(sTableId, aConfig) {
            const oTable = this.byId(sTableId);

            aConfig
                .filter(cfg => cfg.visible)
                .forEach(cfg => {
                    oTable.addColumn(new Column({
                        label:          new Label({ text: cfg.label }),
                        template:       new Text({ text: `{${cfg.binding}}`, wrapping: false }),
                        sortProperty:   cfg.sortProperty,
                        filterProperty: cfg.filterProperty,
                        autoResizable:  true,
                        width:          cfg.width
                    }));
                });
        },

        // ── Search ────────────────────────────────────────────────────────────

        onSearchCurrent(oEvent) {
            this._applySearch("currentTable", CURRENT_COLUMNS, oEvent.getParameter("newValue"));
        },

        onSearchHistory(oEvent) {
            this._applySearch("historyTable", HISTORY_COLUMNS, oEvent.getParameter("newValue"));
        },

        _applySearch(sTableId, aConfig, sQuery) {
            const oBinding = this.byId(sTableId).getBinding("rows");
            if (!oBinding) return;

            const aFilters = sQuery
                ? aConfig
                    .filter(cfg => cfg.visible && cfg.filterProperty)
                    .map(cfg => new Filter(cfg.filterProperty, FilterOperator.Contains, sQuery))
                : [];

            // OR across all visible columns
            oBinding.filter(
                aFilters.length ? [new Filter({ filters: aFilters, and: false })] : []
            );
        },

        // ── Refresh ───────────────────────────────────────────────────────────

        onRefreshCurrent() {
            this.byId("currentTable").getBinding("rows")?.refresh(true);
        },

        onRefreshHistory() {
            this.byId("historyTable").getBinding("rows")?.refresh(true);
        }

    });
});
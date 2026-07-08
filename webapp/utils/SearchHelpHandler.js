sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "zhrsanctions/utils/ODataUtils"
], (Filter, FilterOperator, JSONModel, SelectDialog, StandardListItem, ODataUtils) => {
    "use strict";

    // ─── Field Configurations ─────────────────────────────────────────────────

    /**
     * Maps input field IDs to their OData search-help configuration.
     * Extend here to add more value-help fields.
     */
    const FIELD_CONFIG = {
        inputZempId: {
            modelName: "mainService",
            entitySetPath: "EMP_SEARCHHELPSet",
            keyField: "ZempId",
            descField: "ZempName",
            title: "Employee Search Help",
            defaultFilters: [
                new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getCurrentUserId())
            ]
        },
        dIpZincType: {
            modelName: "mainService",
            entitySetPath: "VIOALATION_SEARCHHELPSet",
            keyField: "Zviolationtype",
            descField: "Zviolationdesc",
            title: "Violation Search Help",
            defaultFilters: []
        }
    };

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * Format a Date or "/Date(ms)/" string → "yyyy-M-dTHH:mm:ss" for OData keys.
     */
    function formatDateForODataKey(dateValue) {
        const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}-${month}-${day}T00:00:00`;
    }

    /**
     * Build the dialog cache key used to store it on the controller.
     */
    function dialogCacheKey(inputId) {
        return `_valueHelpDialog_${inputId}`;
    }

    // ─── Module ───────────────────────────────────────────────────────────────

    const SearchHelpHandler = {

        // ── Data Fetching ─────────────────────────────────────────────────────

        /**
         * Read an OData entity set and return the results as a Promise.
         *
         * @param {sap.ui.core.mvc.Controller} controller
         * @param {string} modelName   - named model on the view (or "" for default)
         * @param {string} entitySetPath
         * @param {Array}  filters
         */
        fetchEntitySet(controller, modelName, entitySetPath, filters) {
            const model = modelName
                ? controller.getView().getModel(modelName)
                : controller.getView().getModel();

            if (!entitySetPath) {
                return Promise.reject("entitySetPath is undefined");
            }

            const normalizedPath = entitySetPath.startsWith("/")
                ? entitySetPath
                : `/${entitySetPath}`;

            return new Promise((resolve, reject) => {
                model.read(normalizedPath, {
                    filters: filters || [],
                    success: data => resolve(data.results),
                    error: err => reject(err)
                });
            });
        },

        // ── Repeat-Count Lookup ───────────────────────────────────────────────

        /**
         * After a violation type is selected (HC flow), look up prior repeat count
         * and earliest incident date for this employee + category + type.
         * Populates regularize>/Zrepeatcount and regularize>/ZfirstIncDate.
         */
        loadRepeatInfo(controller, employeeId, category, incidentType, incidentDate, actionRefNo) {
            if (!employeeId || !category || !incidentType || !incidentDate) { return; }

            const model = controller.getView().getModel("mainService");
            const formattedDate = formatDateForODataKey(incidentDate);
            const entityPath = `/FIST_INC_DATESet(ZempId='${employeeId}',ZincCategory='${category}',ZincType='${incidentType}',ZincDate=datetime'${formattedDate}',ZactionRefNo='${actionRefNo}')`;

            model.read(entityPath, {
                success: (data) => {
                    const regularizeModel = controller.getView().getModel("regularize");
                    if (!regularizeModel) { return; }
                    regularizeModel.setProperty("/Zrepeatcount", data.Zrepeatcount);
                    regularizeModel.setProperty("/Zsysrepeatcount", data.Zsysrepeatcount);
                    regularizeModel.setProperty("/ZfirstIncDate", data.ZfirstInciDate);
                    regularizeModel.setProperty("/isVisible", true);
                },
                error: (error) => {
                    const regularizeModel = controller.getView().getModel("regularize");
                    regularizeModel.setProperty("/Zrepeatcount", 0);
                    regularizeModel.setProperty("/Zsysrepeatcount", 0);
                    regularizeModel.setProperty("/ZfirstIncDate", 0);
                    regularizeModel.setProperty("/isVisible", false);
                    console.error("SearchHelpHandler.loadRepeatInfo: failed", error);
                }
            });
        },

        // ── Dialog Lifecycle ──────────────────────────────────────────────────

        /**
         * Build and register a SelectDialog for the given input field.
         * Stored on the controller as `_valueHelpDialog_<inputId>`.
         */
        _createDialog(controller, view, inputId, fieldConfig, targetInput) {
            const handler = this;

            const dialog = new SelectDialog(`${view.getId()}--${inputId}Dialog`, {
                title: fieldConfig.title || "Select",
                rememberSelections: false,
                contentWidth: "50%",
                contentHeight: "60%",
                liveChange: oEvent => handler.onLiveSearch(oEvent),
                search: oEvent => handler.onLiveSearch(oEvent),   // Enter key delegates to live
                confirm: oEvent => handler.onConfirm(controller, oEvent),
                cancel: () => { }                              // dialog closes automatically
            });

            view.addDependent(dialog);

            // Private state on the dialog instance
            dialog._targetInput = targetInput;
            dialog._inputId = inputId;
            dialog._allData = [];
            dialog._extraParam = null;   // holds incidentDate / category depending on field

            // Local JSON model to back the dialog list items
            const dialogModel = new JSONModel([]);
            dialog.setModel(dialogModel, "valueHelpItems");

            dialog.bindAggregation("items", {
                path: "valueHelpItems>/",
                template: new StandardListItem({
                    title: `{valueHelpItems>${fieldConfig.keyField}}`,
                    description: `{valueHelpItems>${fieldConfig.descField}}`,
                    wrapping: true
                })
            });

            // ESC key closes dialog
            dialog.addEventDelegate({
                onkeydown: (oEvent) => {
                    if (oEvent.key === "Escape" || oEvent.keyCode === 27) {
                        dialog.close();
                        oEvent.preventDefault();
                    }
                }
            });

            return dialog;
        },

        // ── Open ──────────────────────────────────────────────────────────────

        /**
         * Open (or create then open) the value-help dialog for the triggering input.
         *
         * @param {sap.ui.core.mvc.Controller} controller
         * @param {sap.ui.base.Event}          triggerEvent   - valueHelpRequest event
         * @param {Date|string}                extraParam     - incident date (emp search) or
         *                                                      violation category (type search)
         */
        openValueHelpDialog(controller, triggerEvent, extraParam) {
            const sourceInput = triggerEvent.getSource();
            const inputId = sourceInput.getId().split("--").pop();
            const currentValue = ""//sourceInput.getValue();
            const view = controller.getView();
            const fieldConfig = FIELD_CONFIG[inputId];

            if (!fieldConfig) { return; }

            const cacheKey = dialogCacheKey(inputId);
            if (!controller[cacheKey]) {
                controller[cacheKey] = this._createDialog(
                    controller, view, inputId, fieldConfig, sourceInput
                );
            }

            const dialog = controller[cacheKey];

            // Reset state
            dialog._targetInput = sourceInput;
            dialog._inputId = inputId;
            dialog._extraParam = extraParam;
            dialog.getModel("valueHelpItems").setData([]);

            dialog.setBusy(true);
            dialog.open(currentValue);

            // Build filters: default + context-specific
            const filters = [...(fieldConfig.defaultFilters || [])];

            if (extraParam && inputId === "inputZempId") {
                filters.push(new Filter("ZincDate", FilterOperator.EQ, extraParam));
            }
            if (extraParam && inputId === "dIpZincType") {
                filters.push(new Filter("Zviolationcategory", FilterOperator.EQ, extraParam));
            }
            if (currentValue) {
                filters.push(new Filter({
                    filters: [
                        new Filter(fieldConfig.keyField, FilterOperator.Contains, currentValue),
                        new Filter(fieldConfig.descField, FilterOperator.Contains, currentValue)
                    ],
                    and: false
                }));
            }

            this.fetchEntitySet(controller, fieldConfig.modelName, fieldConfig.entitySetPath, filters)
                .then(data => {
                    dialog._allData = data;
                    dialog.getModel("valueHelpItems").setData(data);
                    dialog.setBusy(false);
                })
                .catch(error => {
                    dialog.setBusy(false);
                    const msg = "Failed to load data. Please try again."
                        + (error?.message ? `\n\nDetails: ${error.message}` : "")
                        + (error?.statusCode ? `\nStatus: ${error.statusCode}` : "");
                    sap.m.MessageBox.error(msg);
                });
        },

        // ── Live Search ───────────────────────────────────────────────────────

        /**
         * Client-side filter on already-loaded data as the user types.
         * Handles both liveChange and search (Enter) events.
         */
        onLiveSearch(oEvent) {
            const dialog = oEvent.getSource();
            const query = oEvent.getParameter("value") || "";
            const inputId = dialog._inputId;
            const fieldConfig = FIELD_CONFIG[inputId];

            if (!fieldConfig || !dialog._allData) { return; }

            const queryLower = query.toLowerCase();
            const filteredData = query
                ? dialog._allData.filter(item => {
                    const key = String(item[fieldConfig.keyField] || "").toLowerCase();
                    const desc = String(item[fieldConfig.descField] || "").toLowerCase();
                    const fullName = String(item.SupplierFullName || "").toLowerCase();
                    return key.includes(queryLower) || desc.includes(queryLower) || fullName.includes(queryLower);
                })
                : dialog._allData;

            dialog.getModel("valueHelpItems").setData(filteredData);
        },

        // ── Confirm (selection) ───────────────────────────────────────────────

        /**
         * Handle item selection: set value on source input, update models.
         */
        onConfirm(controller, oEvent) {
            const selectedItem = oEvent.getParameter("selectedItem");
            const dialog = oEvent.getSource();

            if (!selectedItem) { return; }

            const inputId = dialog._inputId;
            const fieldConfig = FIELD_CONFIG[inputId];
            if (!dialog._targetInput || !fieldConfig) { return; }

            const context = selectedItem.getBindingContext("valueHelpItems");
            const selectedData = context ? context.getObject() : {};
            const selectedKey = context
                ? context.getProperty(fieldConfig.keyField)
                : selectedItem.getTitle();

            // Write selected key back to input field
            dialog._targetInput.setValue(selectedKey);
            selectedData.initiatedDay = new Date();

            // NEW: violation-type desc → regularize model for display
            if (inputId === "dIpZincType") {
                const regularizeModel = controller.getView().getModel("regularize");
                if (regularizeModel) {
                    regularizeModel.setProperty(
                        "/ZincTypeDesc",
                        context ? context.getProperty(fieldConfig.descField) : selectedItem.getDescription()
                    );
                }
            }
            // Persist selected employee/violation data in SHData model
            const shDataModel = controller.getView().getModel("SHData");
            if (shDataModel) {
                shDataModel.setProperty("/selectedEmployeeData", selectedData);
            }

            // HC flow only: load repeat-count history when a violation TYPE is picked
            const isHCController = controller.getMetadata().getName() ===
                "zhrsanctions.controller.HCViolationDetailPage";

            if (inputId === "dIpZincType" && isHCController) {
                const category = dialog._extraParam; // Zviolationcategory passed as extraParam
                const detailModel = controller.getView().getModel("detailData");
                const employeeId = detailModel?.getProperty("/record/ZempId");
                const incidentDate = detailModel?.getProperty("/record/ZincDate");
                const actionRefNo = detailModel?.getProperty("/record/ZactionRefNo");

                this.loadRepeatInfo(controller, employeeId, category, selectedKey, incidentDate, actionRefNo);
            }

            dialog._targetInput.fireChange({ value: selectedKey });
        },

        // ── Legacy API aliases ────────────────────────────────────────────────

        /** @deprecated Use onLiveSearch */
        liveSearchValueHelpDialog(oEvent) { return this.onLiveSearch(oEvent); },
        /** @deprecated Use onLiveSearch */
        searchValueHelpDialog(oEvent) { return this.onLiveSearch(oEvent); },
        /** @deprecated Use onConfirm */
        closeValueHelpDialog(controller, oEvent) { return this.onConfirm(controller, oEvent); },
        /** @deprecated Use fetchEntitySet */
        fetchGLData(controller, modelName, entitySetPath, filters) {
            return this.fetchEntitySet(controller, modelName, entitySetPath, filters);
        }
    };

    return SearchHelpHandler;
});
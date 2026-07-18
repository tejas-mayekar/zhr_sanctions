sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "zhrsanctions/utils/ODataUtils"
], (Filter, FilterOperator, JSONModel, SelectDialog, StandardListItem, ODataUtils) => {
    "use strict";
    const FIELD_CONFIG = {
        inputZempId: {
            modelName: "mainService",
            entitySetPath: "GET_EMP_BY_LMSet",       // list source now
            detailEntitySetPath: "EMP_SEARCHHELPSet", // fetched on select
            keyField: "ZempId",
            descField: "ZempName",
            title: "Employee Search Help",
            defaultFilters: [
                new Filter("ZlmId", FilterOperator.EQ, ODataUtils.getCurrentUserId())
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
    function formatDateForODataKey(dateValue) {
        const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}-${month}-${day}T00:00:00`;
    }
    function dialogCacheKey(inputId) {
        return `_valueHelpDialog_${inputId}`;
    }

    const SearchHelpHandler = {
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
                    regularizeModel.setProperty("/insdescriptionstring", data.Zpenaltyinstancedesc);
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

            const filters = [...(fieldConfig.defaultFilters || [])];

            if (extraParam && inputId === "inputZempId") {
                // filters.push(new Filter("ZincDate", FilterOperator.EQ, extraParam));
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
            dialog._targetInput.setValue(selectedKey);
            selectedData.initiatedDay = new Date();
            if (inputId === "dIpZincType") {
                const regularizeModel = controller.getView().getModel("regularize");
                if (regularizeModel) {
                    regularizeModel.setProperty(
                        "/ZincTypeDesc",
                        context ? context.getProperty(fieldConfig.descField) : selectedItem.getDescription()
                    );
                }
            }
            if (inputId === "inputZempId" && fieldConfig.detailEntitySetPath) {
                const detailFilters = [
                    new Filter(fieldConfig.keyField, FilterOperator.EQ, selectedKey),
                    new Filter("ZincDate", FilterOperator.EQ, dialog._extraParam)
                ];
                
                // filters.push(new Filter("ZincDate", FilterOperator.EQ, extraParam));
                this.fetchEntitySet(controller, fieldConfig.modelName, fieldConfig.detailEntitySetPath, detailFilters)
                    .then(results => {
                        const fullData = results?.[0] || selectedData;
                        fullData.initiatedDay = new Date();
                        const shDataModel = controller.getView().getModel("SHData");
                        if (shDataModel) {
                            shDataModel.setProperty("/selectedEmployeeData", fullData);
                        }
                    })
                    .catch(err => {
                        console.error("SearchHelpHandler.onConfirm: detail fetch failed", err);
                        const shDataModel = controller.getView().getModel("SHData");
                        if (shDataModel) {
                            shDataModel.setProperty("/selectedEmployeeData", selectedData);
                        }
                    });
            } else {
                // Persist selected employee/violation data in SHData model (other fields, e.g. violation type)
                const shDataModel = controller.getView().getModel("SHData");
                if (shDataModel) {
                    shDataModel.setProperty("/selectedEmployeeData", selectedData);
                }
            }
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
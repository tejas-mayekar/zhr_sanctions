sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "zhrsanctions/utils/ODataUtils",
], function (Filter, FilterOperator, JSONModel, SelectDialog, StandardListItem, ODataUtils) {
    "use strict";

    return {
        _config: {
            "inputZempId": {
                modelName: "mainService",
                entitySetPath: "EMP_SEARCHHELPSet",
                fieldName: "ZempId",
                descriptionName: "ZempName",
                title: "Employee Search Help",
                filters: [
                    new Filter("ZlmIdName", FilterOperator.EQ, ODataUtils.getuserId())
                ]
            },
            "dIpZincType": {
                modelName: "mainService",
                entitySetPath: "VIOALATION_SEARCHHELPSet",
                fieldName: "Zviolationtype",
                descriptionName: "Zviolationdesc",
                title: "Violation Search Help",
                filters: [
                ]
            },
        },

        fetchGLData: function (oController, modelname, entitySetPath, filters) {
            var oModel = modelname
                ? oController.getView().getModel(modelname)
                : oController.getView().getModel();

            return new Promise(function (resolve, reject) {
                // Validate
                if (!entitySetPath) {
                    reject("entitySetPath is undefined");
                    return;
                }

                // Normalize – MUST begin with '/'
                if (!entitySetPath.startsWith("/")) {
                    entitySetPath = "/" + entitySetPath;
                }

                oModel.read(entitySetPath, {
                    filters: filters || [],
                    success: function (oData) {
                        resolve(oData.results);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        },
        /**
         * After a violation type is selected, look up how many prior ITM_STR
         * records exist for this employee + category + type, and the earliest
         * incident date among them. Used to populate Zrepeatcount / ZfirstIncDate.
         */
        _updateRepeatInfo: function (oController, sZempId, sCategory, sType, sIncDate) {
            if (!sZempId || !sCategory || !sType || !sIncDate) {
                return;
            }

            var oModel = oController.getView().getModel("mainService");

            // Format the date for OData
            var sFormattedDate = this._formatDateForOData(sIncDate);

            // Construct the entity key path
            var sPath = "/FIST_INC_DATESet(ZempId='" + sZempId + "',ZincCategory='" + sCategory +
                "',ZincType='" + sType + "',ZincDate=datetime'" + sFormattedDate + "')";

            oModel.read(sPath, {
                success: function (oData) {
                    var oRegModel = oController.getView().getModel("regularize");
                    if (!oRegModel) {
                        return;
                    }

                    oRegModel.setProperty("/Zrepeatcount", oData.Zrepeatcount);
                    oRegModel.setProperty("/ZfirstIncDate", oData.ZfirstInciDate);
                    oRegModel.setProperty("/isVisible", true);
                },
                error: function (oError) {
                    console.error("SearchHelpHandler._updateRepeatInfo: failed", oError);
                }
            });
        },

        _formatDateForOData: function (vDate) {
            var dDate = vDate;

            if (typeof vDate === "string") {
                dDate = new Date(vDate);
            }

            var iYear = dDate.getFullYear();
            var iMonth = dDate.getMonth() + 1;
            var iDay = dDate.getDate();

            return iYear + "-" + iMonth + "-" + iDay + "T00:00:00";
        }
        ,
        /**
         * Create the Value Help Dialog programmatically (internal fragment)
         */
        _createValueHelpDialog: function (oController, oView, sInputId, oFieldConfig, oInput) {
            var that = this;

            // Create SelectDialog programmatically
            var oDialog = new SelectDialog(oView.getId() + "--" + sInputId + "Dialog", {
                title: oFieldConfig.title || "Select",
                rememberSelections: false,
                contentWidth: "50%",
                contentHeight: "60%",
                liveChange: function (oEvent) {
                    that.liveSearchValueHelpDialog(oEvent);
                },
                search: function (oEvent) {
                    that.searchValueHelpDialog(oEvent);
                },
                confirm: function (oEvent) {
                    that.closeValueHelpDialog(oController, oEvent);
                },
                cancel: function () {
                    // Dialog closes automatically on cancel
                }
            });

            // Add to view
            oView.addDependent(oDialog);

            // Store references
            oDialog._input = oInput;
            oDialog._inputId = sInputId;

            // Create a local JSON model for dialog items
            var oDialogModel = new JSONModel([]);
            oDialog.setModel(oDialogModel, "valueHelpItems");

            // Bind items to local JSON model
            oDialog.bindAggregation("items", {
                path: "valueHelpItems>/",
                template: new StandardListItem({
                    title: `{valueHelpItems>${oFieldConfig.fieldName}}`,
                    description: `{valueHelpItems>${oFieldConfig.descriptionName}}`
                })
            });

            // Add ESC key support
            oDialog.addEventDelegate({
                onkeydown: function (oEvent) {
                    if (oEvent.key === "Escape" || oEvent.keyCode === 27) {
                        oDialog.close();
                        oEvent.preventDefault();
                    }
                }
            });

            return oDialog;
        },

        /**
         * Open the Value Help Dialog
         */
        /**
 * Open the Value Help Dialog
 */
        openValueHelpDialog: function (oController, oEvent, oIncidentDate) {
            var oInput = oEvent.getSource();
            var sInputId = oInput.getId().split("--").pop();
            var sInputValue = oInput.getValue();
            var oView = oController.getView();
            var oFieldConfig = this._config[sInputId];

            if (!oFieldConfig) {
                return;
            }

            var that = this;

            // Create dialog if it doesn't exist
            if (!oController["_valueHelpDialog_" + sInputId]) {
                oController["_valueHelpDialog_" + sInputId] = this._createValueHelpDialog(
                    oController,
                    oView,
                    sInputId,
                    oFieldConfig,
                    oInput
                );
            }

            var oDialog = oController["_valueHelpDialog_" + sInputId];

            // Clear previous selections
            if (oDialog.getSelectedItems) {
                oDialog.getSelectedItems().forEach(function (item) {
                    oDialog.removeSelectedItem(item);
                });
            }

            // Store references
            oDialog._input = oInput;
            oDialog._inputId = sInputId;
            oDialog._incidentDate = oIncidentDate; // Store the incident date

            // Clear previous data
            var oDialogModel = oDialog.getModel("valueHelpItems");
            oDialogModel.setData([]);

            // Open dialog with loading state
            oDialog.setBusy(true);
            oDialog.open(sInputValue);

            // Prepare filters
            var aFilters = oFieldConfig.filters ? [...oFieldConfig.filters] : [];

            // **Add incident date filter if provided**
            if (oIncidentDate && sInputId === "inputZempId") {
                aFilters.push(new Filter("ZincDate", FilterOperator.EQ, oIncidentDate));
            }
            if (oIncidentDate && sInputId === "dIpZincType") {
                aFilters.push(new Filter("Zviolationcategory", FilterOperator.EQ, oIncidentDate));
            }

            // Add search text filter
            if (sInputValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter(oFieldConfig.fieldName, FilterOperator.Contains, sInputValue),
                        new Filter(oFieldConfig.descriptionName, FilterOperator.Contains, sInputValue)
                    ],
                    and: false
                }));
            }

            // Fetch data from API
            that.fetchGLData(
                oController,
                oFieldConfig.modelName,
                oFieldConfig.entitySetPath,
                aFilters
            ).then(function (aData) {
                // Store all data for client-side filtering
                oDialog._allData = aData;

                // Set data to dialog model
                oDialogModel.setData(aData);

                // Remove loading indicator
                oDialog.setBusy(false);
            }).catch(function (oError) {
                oDialog.setBusy(false);

                var sErrorMsg = "Failed to load employee data. Please try again.";
                if (oError && oError.message) {
                    sErrorMsg += "\n\nDetails: " + oError.message;
                }
                if (oError && oError.statusCode) {
                    sErrorMsg += "\nStatus: " + oError.statusCode;
                }

                sap.m.MessageBox.error(sErrorMsg);
            });
        },


        /**
         * Handle live search inside the Value Help Dialog (client-side filtering)
         */
        liveSearchValueHelpDialog: function (oEvent) {
            var oDialog = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var sInputId = oDialog._inputId;
            var oFieldConfig = this._config[sInputId];

            if (!oFieldConfig || !oDialog._allData) return;

            var aFilteredData = oDialog._allData;

            // Apply client-side filtering
            if (sValue) {
                var sValueLower = sValue.toLowerCase();
                aFilteredData = oDialog._allData.filter(function (item) {
                    var sName = (item[oFieldConfig.fieldName] || "").toString().toLowerCase();
                    var sDesc = (item[oFieldConfig.descriptionName] || "").toString().toLowerCase();

                    // Also check SupplierFullName if it exists (for vendor_input)
                    var sFullName = item.SupplierFullName ? item.SupplierFullName.toString().toLowerCase() : "";

                    return sName.includes(sValueLower) ||
                        sDesc.includes(sValueLower) ||
                        sFullName.includes(sValueLower);
                });
            }

            // Update dialog model with filtered data
            var oDialogModel = oDialog.getModel("valueHelpItems");
            oDialogModel.setData(aFilteredData);
        },

        /**
         * Handle search inside the Value Help Dialog (triggers on Enter key)
         */
        searchValueHelpDialog: function (oEvent) {
            // Delegate to liveSearch for consistency
            this.liveSearchValueHelpDialog(oEvent);
        },

        /**
         * Close the dialog and set the selected value in the input
         */
        closeValueHelpDialog: function (oController, oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oDialog = oEvent.getSource();

            if (!oSelectedItem) {
                return;
            }

            var sInputId = oDialog._inputId;
            var oFieldConfig = this._config[sInputId];

            if (!oDialog._input || !oFieldConfig) return;

            var oContext = oSelectedItem.getBindingContext("valueHelpItems");
            var sValue = oContext ? oContext.getProperty(oFieldConfig.fieldName) : oSelectedItem.getTitle();
            var oSelectedData = oContext ? oContext.getObject() : {};

            oDialog._input.setValue(sValue);
            oSelectedData.initiatedDay = new Date();

            // **Set to SHData model**
            var oSHDataModel = oController.getView().getModel("SHData");
            if (oSHDataModel) {
                oSHDataModel.setProperty("/selectedEmployeeData", oSelectedData);
            }
            // ── NEW: when a violation TYPE is picked, look up repeat history ──
            // Only relevant for the HC "Take Action" flow on HCViolationDetailPage —
            // FileViolation also reuses the "dIpZincType" input id but has no
            // detailData/regularize context for this lookup.
            if (sInputId === "dIpZincType" &&
                oController.getMetadata().getName() === "zhrsanctions.controller.HCViolationDetailPage") {

                var sCategory = oDialog._incidentDate; // holds Zviolationcategory for this field
                var oDetailModel = oController.getView().getModel("detailData");
                var sZempId = oDetailModel ? oDetailModel.getProperty("/record/ZempId") : null;
                var sZincDate = oDetailModel ? oDetailModel.getProperty("/record/ZincDate") : null;

                this._updateRepeatInfo(oController, sZempId, sCategory, sValue, sZincDate);
            }

            oDialog._input.fireChange({ value: sValue });
        }

    };
});
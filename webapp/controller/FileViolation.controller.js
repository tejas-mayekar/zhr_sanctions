sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/SearchHelpHandler"
], (BaseController, MessageToast, MessageBox, JSONModel, ODataUtils, ValueHelpHandler) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.FileViolation", {

        onInit() {
            console.log("=== FileViolation Controller Initialized ===");
            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteFileViolation")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            console.log("=== Route Matched: FileViolation ===");
            
            const oDetailModel = this.getOwnerComponent().getModel("create");
            console.log("Detail Model (create):", oDetailModel);
            
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
                console.log("✓ Set detailData model to view");
            }

            // Initialize SHData model for search help
            const oSHDataModel = new JSONModel({});
            this.getView().setModel(oSHDataModel, "SHData");
            console.log("✓ Initialized empty SHData model:", oSHDataModel.getData());
        },

        onValueHelpRequest: function (oEvent) {
            console.log("=== onValueHelpRequest Triggered ===");
            const oInput = oEvent.getSource();
            console.log("Input Source ID:", oInput.getId());
            console.log("Input Current Value:", oInput.getValue());
            
            ValueHelpHandler.openValueHelpDialog(this, oEvent);
        },

        onValueHelpLiveSearch: function (oEvent) {
            console.log("=== onValueHelpLiveSearch Triggered ===");
            const sSearchValue = oEvent.getParameter("value");
            console.log("Live Search Value:", sSearchValue);
            
            ValueHelpHandler.liveSearchValueHelpDialog(oEvent);
        },

        onValueHelpClose: function (oEvent) {
            console.log("=== onValueHelpClose Triggered ===");
            
            const oSelectedItem = oEvent.getParameter("selectedItem");
            console.log("Selected Item:", oSelectedItem);
            
            if (oSelectedItem) {
                const oContext = oSelectedItem.getBindingContext("valueHelpItems");
                if (oContext) {
                    const oSelectedData = oContext.getObject();
                    console.log("Selected Item Data:", oSelectedData);
                }
            }
            
            ValueHelpHandler.closeValueHelpDialog(this, oEvent);

            // Log SHData model after dialog closes
            setTimeout(() => {
                const oSHDataModel = this.getView().getModel("SHData");
                console.log("SHData Model After Close:", oSHDataModel?.getData());
                const oSelectedEmployeeData = oSHDataModel?.getProperty("/selectedEmployeeData");
                console.log("Selected Employee Data in Model:", oSelectedEmployeeData);
            }, 100);
        },

        getSelectedSearchHelpData: function () {
            console.log("=== getSelectedSearchHelpData Called ===");
            const oSHDataModel = this.getView().getModel("SHData");
            console.log("SHData Model:", oSHDataModel);
            
            if (!oSHDataModel) {
                console.warn("⚠ SHData model not found!");
                return null;
            }

            const oSelectedData = oSHDataModel.getProperty("/selectedEmployeeData");
            console.log("Retrieved Selected Employee Data:", oSelectedData);
            
            return oSelectedData;
        },

        onCancel() {
            console.log("=== onCancel Called ===");
            this.onNavBack();
        },

        onSave() {
            console.log("=== onSave Called ===");
            const p = ODataUtils.parseByte.bind(ODataUtils);

            // Get selected employee data
            const oSelectedEmployee = this.getSelectedSearchHelpData();
            console.log("Selected Employee from Search Help:", oSelectedEmployee);

            // Log all input field values
            console.log("=== Form Field Values ===");
            console.log("ZempId Input:", this.byId("inputZempId").getValue());
            console.log("ZempName Input:", this.byId("inputZempName").getValue());
            console.log("ZincDate Input:", this.byId("dpZincDate").getDateValue());

            const oPayload = {
                // Employee
                ZempId:             oSelectedEmployee?.ZempId || this.byId("inputZempId").getValue(),
                ZempName:           oSelectedEmployee?.ZempName || this.byId("inputZempName").getValue(),
                ZempType:           oSelectedEmployee?.ZempType || this.byId("inputZempType").getValue(),
                ZempTypeDesc:       oSelectedEmployee?.ZempTypeDesc || this.byId("inputZempTypeDesc").getValue(),
                ZempClass:          oSelectedEmployee?.ZempClass || this.byId("inputZempClass").getValue(),
                ZempClassDesc:      oSelectedEmployee?.ZempClassDesc || this.byId("inputZempClassDesc").getValue(),
                Zcompany:           oSelectedEmployee?.Zcompany || this.byId("inputZcompany").getValue(),
                Znationality:       oSelectedEmployee?.Znationality || this.byId("inputZnationality").getValue(),
                Zhiredate:          oSelectedEmployee?.Zhiredate || this.byId("dpZhiredate").getDateValue(),
                Zpaygrade:          oSelectedEmployee?.Zpaygrade || this.byId("inputZpaygrade").getValue(),
                Zposition:          oSelectedEmployee?.Zposition || this.byId("inputZposition").getValue(),
                Zjobtitle:          oSelectedEmployee?.Zjobtitle || this.byId("inputZjobtitle").getValue(),
                Zjobclassification: oSelectedEmployee?.Zjobclassification || this.byId("inputZjobclassification").getValue(),
                Zlocation:          oSelectedEmployee?.Zlocation || this.byId("inputZlocation").getValue(),
                Zlocationgroup:     oSelectedEmployee?.Zlocationgroup || this.byId("inputZlocationgroup").getValue(),
                Zworkschedule:      oSelectedEmployee?.Zworkschedule || this.byId("inputZworkschedule").getValue(),
                ZlatestNode:        oSelectedEmployee?.ZlatestNode || this.byId("inputZlatestNode").getValue(),
                ZstdWeekHrs:        p(oSelectedEmployee?.ZstdWeekHrs || this.byId("inputZstdWeekHrs").getValue()),
                ZwrkDyWeek:         p(oSelectedEmployee?.ZwrkDyWeek || this.byId("inputZwrkDyWeek").getValue()),

                // Indicators
                Zn0: p(this.byId("inputZn0").getValue()),
                Zn1: p(this.byId("inputZn1").getValue()),
                Zn2: p(this.byId("inputZn2").getValue()),
                Zn3: p(this.byId("inputZn3").getValue()),
                Zn4: p(this.byId("inputZn4").getValue()),
                Zn5: p(this.byId("inputZn5").getValue()),
                Zn6: p(this.byId("inputZn6").getValue()),
                Zn7: p(this.byId("inputZn7").getValue()),

                // Violation
                ZincDate:     this.byId("dpZincDate").getDateValue(),
                ZincCategory: this.byId("inputZincCategory").getValue(),
                ZincType:     this.byId("inputZincType").getValue(),
                Zaction:       "Report To HC",
                Zstatus:      this.byId("inputZstatus").getValue(),
                Zsanction:    this.byId("inputZsanction").getValue(),
                Zremark:      this.byId("inputZremark").getValue(),

                // Timeline
                ZincDisDate:         this.byId("dpZincDisDate").getDateValue(),
                ZinitatedBy:         this.byId("inputZinitatedBy").getValue(),
                ZinitDate:           this.byId("dpZinitDate").getDateValue(),
                ZfirstIncDate:       this.byId("dpZfirstIncDate").getDateValue(),
                Zawaitingactionfrom: this.byId("dpZawaitingactionfrom").getDateValue(),
                Zlastaction:         this.byId("dpZlastaction").getDateValue(),

                // Times
                ZschTimeIn:    ODataUtils.formatTimeForPayload(this.byId("tpZschTimeIn").getValue()),
                ZschTimeOut:   ODataUtils.formatTimeForPayload(this.byId("tpZschTimeOut").getValue()),
                Zpunchintime:  ODataUtils.formatTimeForPayload(this.byId("tpZpunchintime").getValue()),
                Zpunchouttime: ODataUtils.formatTimeForPayload(this.byId("tpZpunchouttime").getValue()),
                ZdelayHrs:         p(this.byId("inputZdelayHrs").getValue()),
                ZshortHrs:         p(this.byId("inputZshortHrs").getValue()),
                Zrepeatcount:      p(this.byId("inputZrepeatcount").getValue()),
                Zsysyrepeatcount:  p(this.byId("inputZsysyrepeatcount").getValue()),

                // Workflow
                Zlinemanagername:       this.byId("inputZlinemanagername").getValue(),
                ZlmIdName:              ODataUtils.getuserId(),
                Zlinemanageraction:     this.byId("inputZlinemanageraction").getValue(),
                Zlinemanageractiondate: this.byId("dpZlinemanageractiondate").getDateValue(),
                Zlinemanagerremarks:    this.byId("inputZlinemanagerremarks").getValue(),

                Zhcopsname:       this.byId("inputZhcopsname").getValue(),
                Zhcopsaction:     this.byId("inputZhcopsaction").getValue(),
                Zhcopsactiondate: this.byId("dpZhcopsactiondate").getDateValue(),
                Zhcopsremark:     this.byId("inputZhcopsremark").getValue(),

                Zhcevpname:       this.byId("inputZhcevpname").getValue(),
                Zhcevpaction:     this.byId("inputZhcevpaction").getValue(),
                Zhcevpactiondate: this.byId("dpZhcevpactiondate").getDateValue(),
                Zhcevpremark:     this.byId("inputZhcevpremark").getValue(),

                Zlegalmembername:       this.byId("inputZlegalmembername").getValue(),
                Zlegalmemberaction:     this.byId("inputZlegalmemberaction").getValue(),
                Zlegalmemberactiondate: this.byId("dpZlegalmemberactiondate").getDateValue(),
                Zlegalremark:           this.byId("inputZlegalremark").getValue(),

                Zceoname:         this.byId("inputZceoname").getValue(),
                Zceoaction:       this.byId("inputZceoaction").getValue(),
                Zceoactiondate:   this.byId("dpZceoactiondate").getDateValue(),
                Zceoactionremark: this.byId("inputZceoactionremark").getValue()
            };

            console.log("=== Complete Payload ===");
            console.log(JSON.stringify(oPayload, null, 2));

            if (!oPayload.ZempId || !oPayload.ZincDate) {
                console.warn("⚠ Validation failed - Missing mandatory fields");
                MessageBox.error("Please fill in all mandatory key fields:\n- Employee ID\n- Incident Date");
                return;
            }

            console.log("✓ Validation passed");

            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            if (!oModel) {
                console.error("✗ OData model not found");
                MessageBox.warning(
                    "No active OData service connected. Payload logged to console:\n" +
                    JSON.stringify(oPayload, null, 2)
                );
                return;
            }

            console.log("✓ OData Model found");
            console.log("=== Sending Create Request ===");

            sap.ui.core.BusyIndicator.show(0);
            oModel.create("/ITM_STRSet", oPayload, {
                success: () => {
                    sap.ui.core.BusyIndicator.hide();
                    console.log("✓ Record created successfully");
                    MessageToast.show("Violation record created successfully.");
                    this.onNavBack();
                },
                error: (oErr) => {
                    sap.ui.core.BusyIndicator.hide();
                    console.error("✗ Error creating record:", oErr);
                    ODataUtils.handleODataError(oErr, "Error creating violation record.");
                }
            });
        }
    });
});

sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/SearchHelpHandler"
], (BaseController, MessageToast, MessageBox, JSONModel, ODataUtils, SearchHelpHandler) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.FileViolation", {

        onInit() {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteFileViolation")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            this.getView().setModel(new JSONModel({}), "detailData");
            this.getView().setModel(new JSONModel({}), "SHData");
            this.getView().setModel(new JSONModel({
                Zrepeatcount: 0, ZfirstIncDate: null, isVisible: false
            }), "regularize");

            const createModel = this.getOwnerComponent().getModel("create");
            if (createModel) { this.getView().setModel(createModel, "detailData"); }

            this.byId("dpZincDate").setDateValue(null);
            this.byId("inputZempId").setValue("").setEditable(false);
            this.byId("inputZincCategory").setValue("");
            this.byId("inputZincType").setValue("");
            this.byId("inputZaction").setValue("");
            this.byId("inputZstatus").setValue("");
            this.byId("inputZsanction").setValue("");
            this.byId("inputZinitatedBy").setValue("");
            this.byId("inputZremark").setValue("");
            this.byId("inputZrepeatcount").setValue("");
            this.byId("inputZsysyrepeatcount").setValue("");
            this.byId("dpZincDisDate").setDateValue(null);
            this.byId("dpZfirstIncDate").setDateValue(null);
            this.byId("dpZawaitingactionfrom").setDateValue(null);
            this.byId("dpZlastaction").setDateValue(null);
            this.byId("fileUploader").clear();
        },


        onIncidentDateChange(oEvent) {
            const hasDate = !!oEvent.getSource().getDateValue();
            this.byId("inputZempId").setEditable(hasDate);
        },

        onValueHelpRequest(oEvent) {
            const incidentDate = this.byId("dpZincDate").getDateValue();
            if (!incidentDate) {
                MessageBox.warning("Please select Incident Date before choosing Employee ID.");
                this.byId("dpZincDate").focus();
                return;
            }
            SearchHelpHandler.openValueHelpDialog(this, oEvent, incidentDate);
        },

        onValueHelpLiveSearch(oEvent) {
            SearchHelpHandler.onLiveSearch(oEvent);
        },

        onValueHelpClose(oEvent) {
            SearchHelpHandler.onConfirm(this, oEvent);
        },

        onCancel() {
            this.onNavBack();
        },

        onSave() {
            // Edm.Byte only: ZdelayHrs, ZshortHrs, Zrepeatcount, Zsysyrepeatcount
            // Zn0-Zn7, ZstdWeekHrs, ZwrkDyWeek = Edm.String in updated metadata
            const p = ODataUtils.parseByte.bind(ODataUtils);
            const selectedEmployee = this._getSelectedEmployeeData();
            const emp = selectedEmployee || {};

            const payload = {
                // Employee
                ZempId: emp.ZempId || this.byId("inputZempId").getValue(),
                ZempName: emp.ZempName || this.byId("inputZempName").getValue(),
                ZempType: emp.ZempType || this.byId("inputZempType").getValue(),
                ZempTypeDesc: emp.ZempTypeDesc || this.byId("inputZempTypeDesc").getValue(),
                ZempClass: emp.ZempClass || this.byId("inputZempClass").getValue(),
                ZempClassDesc: emp.ZempClassDesc || this.byId("inputZempClassDesc").getValue(),
                Zcompany: emp.Zcompany || this.byId("inputZcompany").getValue(),
                Znationality: emp.Znationality || this.byId("inputZnationality").getValue(),
                Zhiredate: emp.Zhiredate || this.byId("dpZhiredate").getDateValue(),
                Zpaygrade: emp.Zpaygrade || this.byId("inputZpaygrade").getValue(),
                Zposition: emp.Zposition || this.byId("inputZposition").getValue(),
                Zjobtitle: emp.ZjobTitle || this.byId("inputZjobtitle").getValue(),
                Zjobclassification: emp.ZjobClass || this.byId("inputZjobclassification").getValue(),
                Zlocation: emp.Zlocation || this.byId("inputZlocation").getValue(),
                Zlocationgroup: emp.ZlocGroup || this.byId("inputZlocationgroup").getValue(),
                Zworkschedule: emp.Zworkschedule || this.byId("inputZworkschedule").getValue(),
                ZlatestNode: emp.ZlatestNode || this.byId("inputZlatestNode").getValue(),

                // Edm.String — pass as-is (no parseByte)
                ZstdWeekHrs: emp.ZstdWeekHrs || this.byId("inputZstdWeekHrs").getValue(),
                ZwrkDyWeek: emp.ZwrkDyWeek || this.byId("inputZwrkDyWeek").getValue(),

                // Org indicators — Edm.String in updated metadata
                Zn0: emp.Zn0 || this.byId("inputZn0").getValue(),
                Zn1: emp.Zn1 || this.byId("inputZn1").getValue(),
                Zn2: emp.Zn2 || this.byId("inputZn2").getValue(),
                Zn3: emp.Zn3 || this.byId("inputZn3").getValue(),
                Zn4: emp.Zn4 || this.byId("inputZn4").getValue(),
                Zn5: emp.Zn5 || this.byId("inputZn5").getValue(),
                Zn6: emp.Zn6 || this.byId("inputZn6").getValue(),
                Zn7: emp.Zn7 || this.byId("inputZn7").getValue(),

                // Violation
                ZincDate: this.byId("dpZincDate").getDateValue(),
                ZincCategory: this.byId("inputZincCategory").getValue(),
                ZincType: this.byId("inputZincType").getValue(),
                Zaction: "Report To HC",
                Zstatus: "PENDING",
                Zsanction: this.byId("inputZsanction").getValue(),
                Zremark: "",

                // Timeline
                ZincDisDate: this.byId("dpZincDisDate").getDateValue(),
                ZinitatedBy: this.byId("inputZinitatedBy").getValue(),
                ZinitDate: new Date(),
                ZfirstIncDate: this.byId("dpZfirstIncDate").getDateValue(),
                Zawaitingactionfrom: this.byId("dpZawaitingactionfrom").getDateValue(),
                Zlastaction: this.byId("dpZlastaction").getDateValue(),

                // Shift times
                ZschTimeIn: ODataUtils.formatTimeForPayload(this.byId("tpZschTimeIn").getValue()),
                ZschTimeOut: ODataUtils.formatTimeForPayload(this.byId("tpZschTimeOut").getValue()),
                Zpunchintime: ODataUtils.formatTimeForPayload(this.byId("tpZpunchintime").getValue()),
                Zpunchouttime: ODataUtils.formatTimeForPayload(this.byId("tpZpunchouttime").getValue()),

                // Edm.Byte — only these
                ZdelayHrs: p(this.byId("inputZdelayHrs").getValue()),
                ZshortHrs: p(this.byId("inputZshortHrs").getValue()),
                Zrepeatcount: p(this.byId("inputZrepeatcount").getValue()),
                Zsysyrepeatcount: p(this.byId("inputZsysyrepeatcount").getValue()),

                // Workflow: Line Manager
                Zlinemanagername: this.byId("inputZlinemanagername").getValue(),
                ZlmIdName: ODataUtils.getCurrentUserId(),
                Zlinemanageraction: this.byId("inputZlinemanageraction").getValue(),
                Zlinemanageractiondate: this.byId("dpZlinemanageractiondate").getDateValue(),
                Zlinemanagerremarks: this.byId("inputZremark").getValue(),

                // Workflow: HC Ops
                Zhcopsname: this.byId("inputZhcopsname").getValue(),
                Zhcopsaction: this.byId("inputZhcopsaction").getValue(),
                Zhcopsactiondate: this.byId("dpZhcopsactiondate").getDateValue(),
                Zhcopsremark: this.byId("inputZhcopsremark").getValue(),

                // Workflow: HC EVP
                Zhcevpname: this.byId("inputZhcevpname").getValue(),
                Zhcevpaction: this.byId("inputZhcevpaction").getValue(),
                Zhcevpactiondate: this.byId("dpZhcevpactiondate").getDateValue(),
                Zhcevpremark: this.byId("inputZhcevpremark").getValue(),

                // Workflow: Legal
                Zlegalmembername: this.byId("inputZlegalmembername").getValue(),
                Zlegalmemberaction: this.byId("inputZlegalmemberaction").getValue(),
                Zlegalmemberactiondate: this.byId("dpZlegalmemberactiondate").getDateValue(),
                Zlegalremark: this.byId("inputZlegalremark").getValue(),

                // Workflow: CEO
                Zceoname: this.byId("inputZceoname").getValue(),
                Zceoaction: this.byId("inputZceoaction").getValue(),
                Zceoactiondate: this.byId("dpZceoactiondate").getDateValue(),
                Zceoactionremark: this.byId("inputZceoactionremark").getValue()
            };

            if (!payload.ZempId || !payload.ZincDate) {
                MessageBox.error("Please fill in all mandatory key fields:\n- Employee ID\n- Incident Date");
                return;
            }

            const oDataModel = this.getOwnerComponent().getModel()
                || this.getView().getModel("mainService");

            if (!oDataModel) {
                MessageBox.warning(
                    "No active OData service connected. Payload logged to console:\n"
                    + JSON.stringify(payload, null, 2)
                );
                return;
            }

            sap.ui.core.BusyIndicator.show(0);
            oDataModel.create("/ITM_STRSet", payload, {
                success: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Violation record created successfully.");
                    this.onNavBack();
                },
                error: (error) => {
                    sap.ui.core.BusyIndicator.hide();
                    ODataUtils.handleODataError(error, "Error creating violation record.");
                }
            });
        },

        _getSelectedEmployeeData() {
            const shDataModel = this.getView().getModel("SHData");
            return shDataModel?.getProperty("/selectedEmployeeData") || null;
        }
    });
});
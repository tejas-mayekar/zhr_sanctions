sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils"
], (BaseController, MessageToast, MessageBox, ODataUtils) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.FileViolation", {

        onInit() {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteFileViolation")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("create");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
        },

        onCancel() {
            this.onNavBack();
        },

        onSave() {
            const p = ODataUtils.parseByte.bind(ODataUtils);

            const oPayload = {
                // Employee
                ZempId:             this.byId("inputZempId").getValue(),
                ZempName:           this.byId("inputZempName").getValue(),
                ZempType:           this.byId("inputZempType").getValue(),
                ZempTypeDesc:       this.byId("inputZempTypeDesc").getValue(),
                ZempClass:          this.byId("inputZempClass").getValue(),
                ZempClassDesc:      this.byId("inputZempClassDesc").getValue(),
                Zcompany:           this.byId("inputZcompany").getValue(),
                Znationality:       this.byId("inputZnationality").getValue(),
                Zhiredate:          this.byId("dpZhiredate").getDateValue(),
                Zpaygrade:          this.byId("inputZpaygrade").getValue(),
                Zposition:          this.byId("inputZposition").getValue(),
                Zjobtitle:          this.byId("inputZjobtitle").getValue(),
                Zjobclassification: this.byId("inputZjobclassification").getValue(),
                Zlocation:          this.byId("inputZlocation").getValue(),
                Zlocationgroup:     this.byId("inputZlocationgroup").getValue(),
                Zworkschedule:      this.byId("inputZworkschedule").getValue(),
                ZlatestNode:        this.byId("inputZlatestNode").getValue(),
                ZstdWeekHrs:        p(this.byId("inputZstdWeekHrs").getValue()),
                ZwrkDyWeek:         p(this.byId("inputZwrkDyWeek").getValue()),

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
                Zaction:      this.byId("inputZaction").getValue(),
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

            if (!oPayload.ZempId || !oPayload.ZincDate) {
                MessageBox.error("Please fill in all mandatory key fields:\n- Employee ID\n- Incident Date");
                return;
            }

            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            if (!oModel) {
                MessageBox.warning(
                    "No active OData service connected. Payload logged to console:\n" +
                    JSON.stringify(oPayload, null, 2)
                );
                return;
            }

            sap.ui.core.BusyIndicator.show(0);
            oModel.create("/ITM_STRSet", oPayload, {
                success: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Violation record created successfully.");
                    this.onNavBack();
                },
                error: (oErr) => {
                    sap.ui.core.BusyIndicator.hide();
                    ODataUtils.handleODataError(oErr, "Error creating violation record.");
                }
            });
        }
    });
});
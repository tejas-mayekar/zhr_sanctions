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
            this._pendingFiles = [];
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
            this.byId("inputZinitatedBy").setValue("");
            this.byId("inputZremark").setValue("");
            this.byId("inputZrepeatcount").setValue("");
            this.byId("inputZsysyrepeatcount").setValue("");
            this.byId("dpZincDisDate").setDateValue(null);
            this.byId("fileUploader").clear();
            this._pendingFiles = [];
        },


        onFileChange(oEvent) {
            const files = oEvent.getParameter("files");
            this._pendingFiles = files ? Array.from(files) : [];
        },
        onValueHelpRequest(oEvent) {
            const incidentDate = this.byId("dpZincDate").getDateValue();
            if (!incidentDate) {
                MessageBox.warning("Please select Incident Date before choosing Employee ID.");
                this.byId("dpZincDate").focus();
                return;
            }

            const incidentDateString = this._formatDateToString(incidentDate);
            SearchHelpHandler.openValueHelpDialog(this, oEvent, incidentDateString);
        },
        _formatDateToString(date) {
            if (!date) return null;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
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
        onIncidentDateChange(oEvent) {
            const oDatePicker = oEvent.getSource();
            const hasDate = !!oDatePicker.getDateValue();

            if (hasDate) {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (oDatePicker.getDateValue() > today) {
                    oDatePicker.setValueState("Error");
                    oDatePicker.setValueStateText("Incident Date cannot be in the future.");
                } else {
                    this.byId("inputZempId").setEditable(true);
                    oDatePicker.setValueState("None");
                }
            }
        },
        onSave() {
            const p = ODataUtils.parseByte.bind(ODataUtils);
            const selectedEmployee = this._getSelectedEmployeeData();
            const emp = selectedEmployee || {};
            const dateInput = this.byId("dpZincDate").getDateValue();
            const localincDate = new Date(
                dateInput.getFullYear(),
                dateInput.getMonth(),
                dateInput.getDate()
            );
            const datediscInput = this.byId("dpZincDisDate").getDateValue();
            const localincdiscDate = new Date(
                datediscInput.getFullYear(),
                datediscInput.getMonth(),
                datediscInput.getDate()
            );

            const payload = {
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
                Zlmemail: emp.ZlmEmail,

                ZempEmail: emp.ZempMail,
                ZstdWeekHrs: emp.ZstdWeekHrs || this.byId("inputZstdWeekHrs").getValue(),
                ZwrkDyWeek: emp.ZwrkDyWeek || this.byId("inputZwrkDyWeek").getValue(),
                Zn0: emp.Zn0 || this.byId("inputZn0").getValue(),
                Zn1: emp.Zn1 || this.byId("inputZn1").getValue(),
                Zn2: emp.Zn2 || this.byId("inputZn2").getValue(),
                Zn3: emp.Zn3 || this.byId("inputZn3").getValue(),
                Zn4: emp.Zn4 || this.byId("inputZn4").getValue(),
                Zn5: emp.Zn5 || this.byId("inputZn5").getValue(),
                Zn6: emp.Zn6 || this.byId("inputZn6").getValue(),
                Zn7: emp.Zn7 || this.byId("inputZn7").getValue(),

                ZincDate: localincDate,
                Zaction: "C",
                Zstatus: "1",
                Zremark: "",

                ZincDisDate: localincdiscDate,
                ZinitatedBy: ODataUtils.getCurrentUserId(),
                ZinitDate: new Date(),

                ZschTimeIn: ODataUtils.formatTimeForPayload(this.byId("tpZschTimeIn").getValue()),
                ZschTimeOut: ODataUtils.formatTimeForPayload(this.byId("tpZschTimeOut").getValue()),
                Zpunchintime: ODataUtils.formatTimeForPayload(this.byId("tpZpunchintime").getValue()),
                Zpunchouttime: ODataUtils.formatTimeForPayload(this.byId("tpZpunchouttime").getValue()),

                ZdelayHrs: this.byId("inputZdelayHrs").getValue(),
                ZshortHrs: this.byId("inputZshortHrs").getValue(),
                Zrepeatcount: p(this.byId("inputZrepeatcount").getValue()),
                Zsysyrepeatcount: p(this.byId("inputZsysyrepeatcount").getValue()),
                Zlinemanagername: ODataUtils.getCurrentUserName(),
                ZlmIdName: ODataUtils.getCurrentUserId(),
                Zlinemanageraction: this.byId("inputZlinemanageraction").getValue(),
                Zlinemanageractiondate: new Date(),
                Zlinemanagerremarks: this.byId("inputZremark").getValue(),

                Zhcopsname: this.byId("inputZhcopsname").getValue(),
                Zhcopsaction: this.byId("inputZhcopsaction").getValue(),
                Zhcopsactiondate: this.byId("dpZhcopsactiondate").getDateValue(),
                Zhcopsremark: this.byId("inputZhcopsremark").getValue(),

                Zhcevpname: this.byId("inputZhcevpname").getValue(),
                Zhcevpaction: this.byId("inputZhcevpaction").getValue(),
                Zhcevpactiondate: this.byId("dpZhcevpactiondate").getDateValue(),
                Zhcevpremark: this.byId("inputZhcevpremark").getValue(),

                Zlegalmembername: this.byId("inputZlegalmembername").getValue(),
                Zlegalmemberaction: this.byId("inputZlegalmemberaction").getValue(),
                Zlegalmemberactiondate: this.byId("dpZlegalmemberactiondate").getDateValue(),
                Zlegalremark: this.byId("inputZlegalremark").getValue(),

                Zceoname: this.byId("inputZceoname").getValue(),
                Zceoaction: this.byId("inputZceoaction").getValue(),
                Zceoactiondate: this.byId("dpZceoactiondate").getDateValue(),
                Zceoactionremark: this.byId("inputZceoactionremark").getValue()
            };

            if (!payload.ZempId || !payload.ZincDate) {
                MessageBox.error("Please fill in all mandatory key fields:\n- Employee ID\n- Incident Date");
                return;
            }

            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (payload.ZincDate > today) {
                MessageBox.error("Incident Date cannot be greater than the current date.");
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
                success: (data) => {
                    sap.ui.core.BusyIndicator.hide();
                    const zactionRefNo = data.ZactionRefNo;
                    MessageToast.show("Violation record created successfully.");

                    if (this._pendingFiles.length > 0) {
                        sap.ui.core.BusyIndicator.show();
                        this.UploadFiles(this._pendingFiles, zactionRefNo);
                    }
                },
                error: (error) => {
                    sap.ui.core.BusyIndicator.hide();
                    ODataUtils.handleODataError(error, "Error creating violation record.");
                }
            });
        },
        UploadFiles(files, zactionRefNo) {
            const oDataModel = this.getOwnerComponent().getModel() || this.getView().getModel("mainService");
            const sServiceUrl = oDataModel.sServiceUrl;
            const sCsrfToken = oDataModel.getSecurityToken ? oDataModel.getSecurityToken() : oDataModel.oHeaders["x-csrf-token"];

            files.forEach((file, index) => {
                const sUrl = `${sServiceUrl}/ZHR_SANC_MEDIAUPLOADSet`;

                const oReq = new XMLHttpRequest();
                oReq.open("POST", sUrl, true);
                oReq.setRequestHeader("Content-Type", file.type || "application/octet-stream");
                oReq.setRequestHeader("x-csrf-token", sCsrfToken);
                oReq.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                oReq.setRequestHeader("slug", encodeURIComponent(file.name) + ";" + encodeURIComponent(zactionRefNo) + ";" + encodeURIComponent(index));
                oReq.onload = () => {
                    if (oReq.status >= 200 && oReq.status < 300) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("File " + file.name + " uploaded successfully.");
                    } else {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Upload failed: " + file.name);
                        console.error(oReq.responseText);
                    }
                };
                oReq.onerror = () => {

                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Upload error: " + file.name);
                }
                oReq.send(file);
            });
        },
        _getSelectedEmployeeData() {
            const shDataModel = this.getView().getModel("SHData");
            return shDataModel?.getProperty("/selectedEmployeeData") || null;
        }
    });
});
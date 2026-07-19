sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zhrsanctions/utils/ODataUtils"
], (BaseController, JSONModel, Filter, FilterOperator, ODataUtils) => {
    "use strict";

    return BaseController.extend("zhrsanctions.controller.OldViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel({
                isEditOn: false
            }));
            this.getView().setModel(new JSONModel({
                punchIn: "", punchOut: "", reason: ""
            }), "regularize");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteOldViolationDetailpage")
                .attachPatternMatched(this._onRouteMatched, this);

            // Now this works because the default model exists
            this.getView()
                .getModel()
                .setProperty("/isEditOn", false);

        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
            this.getView().getModel("regularize").setData({
                punchIn: "", punchOut: "", reason: ""
            });

            const violationRec = oDetailModel?.getData().record;
            this._loadMediaFiles(violationRec);
        },

        _loadMediaFiles(violationRec) {
            if (!violationRec) { return; }
            const actionRefNo = violationRec.ZactionRefNo || violationRec.ZACTION_REF_NO;
            if (!actionRefNo) { return; }

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            oDataModel.read("/ZHR_GET_MEDIASet", {
                filters: [
                    new Filter("ZactionRefNo", FilterOperator.EQ, actionRefNo)
                ],
                success: (data) => {
                    const media = { results: data.results || [] };
                    if (!this.getView().getModel("media")) {
                        this.getView().setModel(new JSONModel(media), "media");
                    } else {
                        this.getView().getModel("media").setData(media);
                    }
                },
                error: (err) => {
                    console.error("ZHR_GET_MEDIASet fetch failed:", err);
                }
            });
        },

        onMediaFilePress(oEvent) {
            const ctx = oEvent.getSource().getBindingContext("media");
            if (!ctx) { return; }
            const item = ctx.getObject();

            const oDataModel = this.getOwnerComponent().getModel();
            const sServiceUrl = oDataModel.sServiceUrl;
            const key = `ZactionRefNo='${item.ZactionRefNo}',ZitemNo='${item.ZitemNo}',Filename='${item.Filename}'`;
            const sUrl = `${sServiceUrl}/ZHR_SANC_MEDIAUPLOADSet(${key})/$value`;

            sap.ui.core.BusyIndicator.show(0);
            const oReq = new XMLHttpRequest();
            oReq.open("GET", sUrl, true);
            oReq.responseType = "blob";
            oReq.onload = () => {
                sap.ui.core.BusyIndicator.hide();
                if (oReq.status >= 200 && oReq.status < 300) {
                    const blob = oReq.response;
                    const link = document.createElement("a");
                    link.href = window.URL.createObjectURL(blob);
                    link.download = item.Filename;
                    link.click();
                    window.URL.revokeObjectURL(link.href);
                } else {
                    sap.m.MessageBox.error("Failed to download file: " + item.Filename);
                }
            };
            oReq.onerror = () => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("Error downloading file: " + item.Filename);
            };
            oReq.send();
        },
        onViewRemarkPress() {
            if (!this._addRemark) {
                this._addRemark = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.AddRemarkDialog",
                    this
                );
                this.getView().addDependent(this._addRemark);
            }

            const oDataModel = this.getOwnerComponent().getModel();
            const violationRec = this.getView().getModel("detailData").getData().record;
            oDataModel.setUseBatch(false);
            oDataModel.read("/GET_REMARKSSet", {
                filters: [
                    new Filter("ZactionRefNo", FilterOperator.EQ, violationRec.ZactionRefNo || violationRec.ZACTION_REF_NO)
                ],
                success: (data) => {
                    const remarks = { results: data.results || [] };
                    if (!this.getView().getModel("remarks")) {
                        this.getView().setModel(new JSONModel(remarks), "remarks");
                    } else {
                        this.getView().getModel("remarks").setData(remarks);
                    }
                    this._addRemark.open();
                },
                error: (err) => {
                    console.error("RemarksSet fetch failed:", err);
                    sap.m.MessageBox.error("Failed to load remarks.");
                }
            });
        },

        formatRemarkColor(text) {
            if (!text) { return ""; }
            const t = text.toUpperCase();
            let bg = "transparent";
            if (t.includes("CEO COMMENTS")) {
                bg = "#c00";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else if (t.includes("EVP COMMENTS")) {
                bg = "#0070c0";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else if (t.includes("HC COMMENTS")) {
                bg = "#9b7dbe";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else if (t.includes("LINE MANAGER COMMENTS")) {
                bg = "#31c699";
                return `<span style="background-color:${bg}; padding:2px 6px; color:#fff; border-radius:3px;">${text}</span>`;
            } else {
                return `<span style="background-color:${bg}; padding:2px 6px; color:#000; border-radius:3px;">${text}</span>`;
            }
        },

        onViewRemarkCancel() {
            this._addRemark.close();
        }
        // onNavBack inherited from BaseController
    });
});
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, History, Fragment, JSONModel, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("zhrsanctions.controller.View2", {

        onInit() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }

            // Regularize form model — reset each time the dialog opens
            this.getView().setModel(new JSONModel({
                punchIn:  "",
                punchOut: "",
                reason:   ""
            }), "regularize");

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteView2").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oDetailModel = this.getOwnerComponent().getModel("detailData");
            if (oDetailModel) {
                this.getView().setModel(oDetailModel, "detailData");
            }
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onNavBack() {
            const oHistory  = History.getInstance();
            const sPrevHash = oHistory.getPreviousHash();

            if (sPrevHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
            }
        },

        // ── Regularize Dialog ─────────────────────────────────────────────────

        /**
         * Opens the Regularize popup.
         * Pre-fills Punch In / Out from the record if values exist.
         */
        onRegularizePress() {
            const oRecord = this.getView().getModel("detailData").getProperty("/record");

            // Reset / pre-fill the form model
            this.getView().getModel("regularize").setData({
                punchIn:  oRecord.Zpunchintime  || "",
                punchOut: oRecord.Zpunchouttime || "",
                reason:   ""
            });

            this._openRegularizeDialog();
        },

        _openRegularizeDialog() {
            if (!this._oRegularizeDialog) {
                Fragment.load({
                    id:         this.getView().getId(),
                    name:       "zhrsanctions.view.RegularizeDialog",
                    controller: this
                }).then(oDialog => {
                    this._oRegularizeDialog = oDialog;
                    // Connect models so bindings inside the fragment resolve
                    this.getView().addDependent(oDialog);
                    oDialog.setModel(this.getView().getModel("detailData"), "detailData");
                    oDialog.setModel(this.getView().getModel("regularize"),  "regularize");
                    oDialog.open();
                });
            } else {
                this._oRegularizeDialog.open();
            }
        },

        /**
         * Submit handler — validates required fields then sends the payload.
         */
        onRegularizeSubmit() {
            const oRegModel = this.getView().getModel("regularize");
            const sPunchIn  = oRegModel.getProperty("/punchIn");
            const sPunchOut = oRegModel.getProperty("/punchOut");
            const sReason   = oRegModel.getProperty("/reason").trim();

            // ── Validation ──
            if (!sPunchIn || !sPunchOut || !sReason) {
                MessageBox.warning("Please fill in Punch In Time, Punch Out Time, and Reason before submitting.");
                return;
            }

            if (sPunchIn >= sPunchOut) {
                MessageBox.warning("Punch Out time must be later than Punch In time.");
                return;
            }

            // ── Build payload ──
            const oRecord  = this.getView().getModel("detailData").getProperty("/record");
            const oPayload = {
                ZACTION_REF_NO: oRecord.ZACTION_REF_NO,
                ZempId:         oRecord.ZempId,
                ZincDate:       oRecord.ZincDate,
                Zpunchintime:   sPunchIn,
                Zpunchouttime:  sPunchOut,
                Zreason:        sReason
            };

            console.log("Regularize payload:", oPayload);

            // ── OData call (uncomment when service method is confirmed) ──
            // const oODataModel = this.getOwnerComponent().getModel();
            // oODataModel.create("/RegularizeSet", oPayload, {
            //     success: () => {
            //         MessageToast.show("Regularization submitted successfully.");
            //         this._closeRegularizeDialog();
            //     },
            //     error: (oErr) => {
            //         MessageBox.error("Submission failed. Please try again.\n" + oErr.message);
            //     }
            // });

            // Temporary success feedback until OData endpoint is wired
            MessageToast.show("Regularization submitted for " + oRecord.ZempName);
            this._closeRegularizeDialog();
        },

        onRegularizeCancel() {
            this._closeRegularizeDialog();
        },

        _closeRegularizeDialog() {
            if (this._oRegularizeDialog) {
                this._oRegularizeDialog.close();
            }
        }

    });
});
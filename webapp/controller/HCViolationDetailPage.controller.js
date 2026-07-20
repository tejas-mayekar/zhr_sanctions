sap.ui.define([
    "zhrsanctions/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "zhrsanctions/utils/ODataUtils",
    "zhrsanctions/utils/SearchHelpHandler",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController, JSONModel, MessageToast, MessageBox, ODataUtils, SearchHelpHandler) => {
    "use strict";

    const EMPTY_ACTION_STATE = {
        ZactionRefNo: "",
        ZincCategory: "",
        ZincType: "",
        ZfirstIncDate: "",
        ZincTypeDesc: "",
        Zrepeatcount: "",
        Zsysrepeatcount: "",
        ZincDate: "",
        isVisible: false,
        reason: "",
        insdescription: "",
        actionOptions: []
    };

    return BaseController.extend("zhrsanctions.controller.HCViolationDetailPage", {

        onInit() {
            this.getView().setModel(new JSONModel({ isEditOn: false }));

            this.getView().setModel(new JSONModel({ ...EMPTY_ACTION_STATE }), "regularize");
            this.getView().setModel(new JSONModel({ questions: [{ value: "" }] }), "questions");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteHCViolationDetailpage")
                .attachPatternMatched(this._onRouteMatched, this);
            this._pendingFiles = [];
        },

        _onRouteMatched() {
            const detailModel = this.getOwnerComponent().getModel("detailData");
            if (detailModel) {
                this.getView().setModel(detailModel, "detailData");
            }
            const violationRec = detailModel?.getData().record;
            this.loadMediaFiles(violationRec);
            const zstatus = detailModel?.getData().record?.Zstatus;
            const isOpen = zstatus === "1" || zstatus === "2";
            this.getView().getModel().setProperty("/isEditOn", isOpen);

            this.getView().getModel("regularize").setData({ ...EMPTY_ACTION_STATE });
            this._pendingFiles = [];
        },
        onFileChange(oEvent) {
            const files = oEvent.getParameter("files");
            this._pendingFiles = files ? Array.from(files) : [];
        },
        onMediaFilePress(oEvent) {
            const ctx = oEvent.getSource().getBindingContext("media");
            if (!ctx) { return; }
            this.downloadMediaFile(ctx.getObject());
        },
        /**
         * Read the currently selected violation category from the dropdown.
         * Side-effect: writes it into the regularize model.
         * Returns the selected key, or null if nothing is selected.
         */
        _getSelectedCategory() {
            const categorySelect = this.getView().byId("violation_type");
            if (!categorySelect) { return null; }

            const selectedKey = categorySelect.getSelectedKey();
            this.getView().getModel("regularize").setProperty("/ZincCategory", selectedKey);
            return selectedKey || null;
        },

        onTakeActionPress() {
            if (!this._takeActionDialog) {
                this._takeActionDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.TakeActionDialog",
                    this
                );
                this.getView().addDependent(this._takeActionDialog);
            }
            this.clearFileUploadState("hcfileUploader");
            const regularizeModel = this.getView().getModel("regularize");
            regularizeModel.setProperty("/Zrepeatcount", 0);
            regularizeModel.setProperty("/ZfirstIncDate", 0);
            regularizeModel.setProperty("/isVisible", false);
            regularizeModel.setProperty("/ZincTypeDesc", "");
            regularizeModel.setProperty("/ZincType", "");
            this._takeActionDialog.open();
        },

        onCloseTakeActionDialog() {
            this.clearFileUploadState("hcfileUploader");
            this._takeActionDialog.close();
        },
        onRepeatCountChange(oEvent) {
            const actionData = this.getView().getModel("regularize").getData();

            const oInput = oEvent.getSource();
            const newValue = parseInt(oInput.getValue()); // Parse as integer index

            // Validate the selected repeat count against the system value.
            if (actionData.Zrepeatcount < newValue) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Repeat count cannot be greater than system repeat count");
                return;
            } else {
                oInput.setValueState("None");
            }

            try {
                const insdescription = JSON.parse(actionData.insdescriptionstring);
                console.log("Full data:", insdescription);

                const selectedValue = insdescription.ins1[newValue];
                console.log(`Value at index ${newValue}:`, selectedValue);

                if (selectedValue !== undefined) {
                    actionData.insdescription = selectedValue;
                    this.getView().getModel("regularize").refresh();
                    console.log("Updated insdescription:", actionData.insdescription);
                } else {
                    console.warn(`Index ${newValue} is out of bounds. Array length: ${insdescription.ins1.length}`);
                }
            } catch (error) {
                console.error("Invalid JSON:", error.message);
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid data format");
            }
        },
        onSubmitTakeAction() {
            const actionData = this.getView().getModel("regularize").getData();
            const violationRec = this.getView().getModel("detailData").getData().record;

            if (!actionData.ZincCategory || !actionData.ZincType) {
                MessageBox.error("Please fill all required fields");
                return;
            }
            if (!actionData.Zsysrepeatcount || actionData.Zsysrepeatcount === "0") {
                MessageBox.error("System repeat count is required");
                return;
            }
            if (actionData.Zrepeatcount < actionData.Zsysrepeatcount) {
                MessageBox.error("Repeat count cannot be greater than system repeat count");
                return;
            }
            if (actionData.Zsysrepeatcount > 4) {
                MessageBox.error("Repeat count cannot be more than 4");
                return;
            }
            if (actionData.reason.trim() === "") {
                MessageBox.error("Please provide a reason for taking action");
                return;
            }

            if (this._pendingFiles.length > 0) {
                sap.ui.core.BusyIndicator.show();
                this.UploadFiles(this._pendingFiles, violationRec.ZactionRefNo, violationRec, actionData);
            } else {
                this._submitHCAction(violationRec, {
                    ZactionRefNo: violationRec.ZactionRefNo,
                    ZincCategory: actionData.ZincCategory,
                    ZincType: actionData.ZincType,
                    Zhcopsremark: actionData.reason,
                    Zhcevpactiondate: new Date(),
                    Zstatus: "5",
                    Zsysyrepeatcount: parseInt(actionData.Zsysrepeatcount),
                    ZlmIdName: ODataUtils.getCurrentUserId(),
                    Zhcopsname: ODataUtils.getCurrentUserName(),
                }, () => this._takeActionDialog.close());
            }

            this.clearFileUploadState("hcfileUploader");
        },

        onTakeNoActionPress() {
            const violationRec = this.getView().getModel("detailData").getData().record;

            if (this.hasAttendanceTimeDifference(violationRec) || (parseInt(violationRec.ZunautDays, 10) || 0) > 0) {
                this._populateRegularizeModel(violationRec);
                this._openRegularizeDialog();
                return;
            }

            if (!this._takeNoActionDialog) {
                this._takeNoActionDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.TakeNoActionDialog",
                    this
                );
                this.getView().addDependent(this._takeNoActionDialog);
            }
            this._takeNoActionDialog.open();
        },
        _populateRegularizeModel(record) {
            const schIn = this.toTimeString(record.ZschTimeIn);
            const schOut = this.toTimeString(record.ZschTimeOut);
            const pIn = this.toTimeString(record.Zpunchintime);
            const pOut = this.toTimeString(record.Zpunchouttime);
            const unautDays = parseInt(record.ZunautDays, 10) || 0;
            const hasUnauth = unautDays > 0;
            const hasDelay = schIn && pIn && this.timeStringToSeconds(pIn) > this.timeStringToSeconds(schIn);
            const hasShort = schOut && pOut && this.timeStringToSeconds(pOut) < this.timeStringToSeconds(schOut);
            const hasBoth = hasDelay && hasShort;
            const mode = hasBoth ? "both" : hasDelay ? "delay" : "short";

            const state = {
                dialogTitle: hasUnauth ? "Regularize Unauthorized Absence" : "Regularize Attendance",
                scheduledIn: schIn,
                scheduledOut: schOut,
                punchIn: pIn,
                punchOut: pOut,
                delayHrs: record.ZdelayHrs || "0:00",
                shortHrs: record.ZshortHrs || "0:00",
                hasDelay: hasUnauth ? false : hasDelay,
                hasShort: hasUnauth ? false : hasShort,
                showModeSelector: hasUnauth ? false : hasBoth,
                showDelay: hasUnauth ? false : (hasBoth ? hasDelay : mode === "delay"),
                showShort: hasUnauth ? false : (hasBoth ? hasShort : mode === "short"),
                showUnauth: hasUnauth,
                unauthPunchIn: schIn,
                unauthPunchOut: schOut,
                mode: hasUnauth ? "unauth" : mode,
                delayFrom: schIn,
                delayTo: this.secondsToTimeString(this.timeStringToSeconds(pIn) - 1),
                shortFrom: this.secondsToTimeString(this.timeStringToSeconds(pOut) + 1),
                shortTo: schOut,
                reason: ""
            };

            this.getView().getModel("regularize").setData(state);
        },
        onRegularizeSubmit() {
            const state = this.getView().getModel("regularize").getData();
            const reason = (state.reason || "").trim();
            if (!reason) {
                MessageBox.warning("Please enter a reason before submitting.");
                return;
            }

            const record = this.getView().getModel("detailData").getData().record;
            const delayFlag = state.showUnauth ? "4"
                : state.showDelay && state.showShort ? "3"
                    : state.showDelay ? "1" : "2";

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            sap.ui.core.BusyIndicator.show(0);

            ODataUtils.submitPunchRegularize(oDataModel, record, {
                ZschTimeIn: state.showUnauth ? state.unauthPunchIn : state.delayFrom,
                Zpunchintime: state.showUnauth ? state.unauthPunchIn : state.delayTo,
                Zpunchouttime: state.showUnauth ? state.unauthPunchOut : state.shortFrom,
                ZschTimeOut: state.showUnauth ? state.unauthPunchOut : state.shortTo,
                DelayFlag: delayFlag
            })
                .then(() => ODataUtils.submitHCAction(oDataModel, record, {
                    Zaction: "A",
                    Zhcopsremark: reason,
                    Zstatus: "4",
                    Zhcopsname: ODataUtils.getCurrentUserName(),
                }))
                .then(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Regularization submitted successfully.");
                    this._regularizeDialog.close();
                    this.getView().getModel("regularize").setData({ ...EMPTY_ACTION_STATE });
                    this.getView().getModel().setProperty("/isEditOn", false);
                })
                .catch((err) => {
                    sap.ui.core.BusyIndicator.hide();
                    console.error("HCViolationDetailPage: regularize submit failed:", err);
                });
        },

        onRegularizeCancel() {
            this._regularizeDialog.close();
        },
        _openRegularizeDialog() {
            if (!this._regularizeDialog) {
                this._regularizeDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.RegularizeDialog",
                    this
                );
                this.getView().addDependent(this._regularizeDialog);
            }
            this._regularizeDialog.open();
        },


        onCloseTakeNoActionDialog() {
            this.clearFileUploadState("hcfileUploader");
            this._takeNoActionDialog.close();
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

            const violationRec = this.getView().getModel("detailData").getData().record;
            this.loadRemarks(violationRec, this._addRemark).catch((err) => {
                console.error("RemarksSet fetch failed:", err);
                MessageBox.error("Failed to load remarks.");
            });
        },
        formatRemarkColor(text) {
            return this.getOwnerComponent().getControllerInstance ? this.getOwnerComponent().getControllerInstance().formatRemarkColor(text) : BaseController.prototype.formatRemarkColor.call(this, text);
        },
        onViewRemarkCancel() {
            this.clearFileUploadState("hcfileUploader");
            this._addRemark.close();
        },
        onSubmitTakeNoAction() {
            const actionData = this.getView().getModel("regularize").getData();
            const violationRec = this.getView().getModel("detailData").getData().record;
            function parseByteField(value) {
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? 0 : parsed;
            }
            if (actionData.reason.trim() === "") {
                MessageBox.error("Please provide a reason for taking action");
                return;
            }
            this._submitHCAction(violationRec, {
                ZactionRefNo: violationRec.ZactionRefNo,
                Zhcopsremark: actionData.reason,
                Zrepeatcount: parseByteField(actionData.Zrepeatcount),
                Zhcevpactiondate: new Date(),
                Zstatus: "4",
                ZlmIdName: ODataUtils.getCurrentUserId(),
                Zhcopsname: ODataUtils.getCurrentUserName(),
            }, () => this._takeNoActionDialog.close());
        },

        onValueHelpRequest(oEvent) {
            const category = this._getSelectedCategory();
            if (!category) {
                MessageBox.warning("Please select Incident Category before choosing Type.");
                this.byId("violation_type").focus();
                return;
            }
            SearchHelpHandler.openValueHelpDialog(this, oEvent, category);
        },

        onValueHelpLiveSearch(oEvent) {
            SearchHelpHandler.onLiveSearch(oEvent);
        },
        onPayrollDeductionPress() {
            const violationRec = this.getView().getModel("detailData").getData().record;
            if (!violationRec?.ZactionRefNo) {
                MessageBox.error("No violation record loaded. Cannot submit Payroll Deduction.");
                return;
            }

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            sap.ui.core.BusyIndicator.show(0);
            ODataUtils.submitHCAction(oDataModel, violationRec, {
                Zaction: "B",
                Zstatus: "4"
            })
                .then(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Payroll Deduction submitted successfully.");
                    this.onNavBack();
                })
                .catch((error) => {
                    sap.ui.core.BusyIndicator.hide();
                    console.error("HCViolationDetailPage: payroll deduction update failed:", error);
                });
        },
        onValueHelpClose() {
        },

        /**
         * Submit a HC action and close the dialog after a successful response.
         */
        _submitHCAction(violationRecord, overrides, closeDialog) {
            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);

            ODataUtils.submitHCAction(oDataModel, violationRecord, overrides)
                .then(() => {
                    MessageToast.show("Action submitted successfully");
                    closeDialog();
                    this.getView().getModel("regularize").setData({ ...EMPTY_ACTION_STATE });
                    this.getView().getModel().setProperty("/isEditOn", false);
                })
                .catch(error => {
                    console.error("HCViolationDetailPage: failed to submit action:", error);
                });
        },
        onAppealPress() {
            const violationRec = this.getView().getModel("detailData").getData().record;
            if (!violationRec?.ZactionRefNo) {
                MessageBox.error("No violation record loaded. Cannot appeal.");
                return;
            }

            MessageBox.confirm("Do you want to re-open this case?", {
                title: "Appeal Case",
                onClose: (action) => {
                    if (action !== MessageBox.Action.OK) { return; }
                    const oDataModel = this.getOwnerComponent().getModel();
                    oDataModel.setUseBatch(false);
                    sap.ui.core.BusyIndicator.show(0);
                    ODataUtils.submitHCAction(oDataModel, violationRec, {
                        Zaction: "C",
                        Zstatus: "1",
                        Zhcopsactiondate: new Date(),
                        Zhcopsname: ODataUtils.getCurrentUserName()
                    }).then(() => {
                        return new Promise((resolve, reject) => {
                            const sEntityPath = `/CASE_REOPENSet(ZactionRefNo='${violationRec.ZactionRefNo}',Reopen='X')`;
                            oDataModel.read(sEntityPath, {
                                success: (data) => {
                                    console.log("CASE_REOPEN entity fetched successfully:", data);
                                    resolve(data);
                                },
                                error: (err) => {
                                    console.error("CASE_REOPEN entity fetch failed:", err);
                                    reject(err);
                                }
                            });
                        });
                    }).then(() => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Case re-opened successfully.");
                        this.getView().getModel().setProperty("/isEditOn", true);
                        this.onNavBack();
                    }).catch((error) => {
                        sap.ui.core.BusyIndicator.hide();
                        console.error("HCViolationDetailPage: appeal failed:", error);
                    });
                }
            });
        },
        UploadFiles(files, zactionRefNo, violationRec, actionData) {
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
                this._submitHCAction(violationRec, {
                    ZactionRefNo: violationRec.ZactionRefNo,
                    ZincCategory: actionData.ZincCategory,
                    ZincType: actionData.ZincType,
                    Zhcopsremark: actionData.reason,
                    Zhcevpactiondate: new Date(),
                    Zstatus: "5",
                    Zsysyrepeatcount: parseInt(actionData.Zsysrepeatcount),
                    ZlmIdName: ODataUtils.getCurrentUserId(),
                    Zhcopsname: ODataUtils.getCurrentUserName(),
                }, () => this._takeActionDialog.close());
                this._pendingFiles = [];
            });
            this.clearFileUploadState("hcfileUploader");
        },
        onOpenQuestionsPress() {
            if (!this._addQuestionsDialog) {
                this._addQuestionsDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "zhrsanctions.view.fragments.AddQuestionsDialog",
                    this
                );
                this.getView().addDependent(this._addQuestionsDialog);
            }
            this.getView().getModel("questions").setData({
                questions: [{ question: "", answer: "" }]
            });
            this._addQuestionsDialog.open();
        },

        onAddQuestionPress() {
            const questionsModel = this.getView().getModel("questions");
            const questions = questionsModel.getProperty("/questions") || [];
            questions.push({ question: "", answer: "" });
            questionsModel.setProperty("/questions", questions);
        },

        onSaveQuestionsPress() {
            const questions = this.getView().getModel("questions").getProperty("/questions") || [];

            // Validate all fields are filled
            const hasEmptyFields = questions.some(q => !q.question?.trim() || !q.answer?.trim());

            if (hasEmptyFields) {
                sap.m.MessageBox.error("Please fill in all question and answer fields before saving.");
                return;
            }

            const formattedQuestions = questions.map(q => ({
                question: q.question?.trim(),
                answer: q.answer?.trim()
            }));

            console.log("Questions and Answers:", formattedQuestions);
            sap.m.MessageBox.success("Questions saved successfully!");
            this._addQuestionsDialog.close();
        },

        onCancelQuestionsPress() {
            this._addQuestionsDialog.close();
        }


    });
});
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/ui/model/json/JSONModel"
], function (Controller, Fragment, MessageToast, MessageBox, BusyIndicator, Filter, FilterOperator, SelectDialog, StandardListItem, JSONModel) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.EmployeeTimesheet", {
        
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("EmployeeTimesheet").attachPatternMatched(this._onRouteMatched, this);
        },

        _getI18nText: function (sKey, aArgs) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        _onRouteMatched: function () {
            var oTable = this.byId("timesheetTable");
            if (!oTable) return;
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh(true);
        },

        // =========================================================
        // FILTERING & VALUE HELPS
        // =========================================================

        onStatusValueHelp: function () {
            var oInput = this.byId("idStatusFilter");
            var oModel = this.getView().getModel();
            var that = this;

            BusyIndicator.show(0);

            oModel.read("/WorkingTime", {
                success: function (oData) {
                    BusyIndicator.hide();
                    var aResults = oData.results || [];
                    var aUniqueStatus = [];
                    var mStatusMap = {};

                    aUniqueStatus.push({
                        Key: "",
                        Title: that._getI18nText("txtAllStatus"),
                        Description: that._getI18nText("txtShowAll")
                    });

                    aResults.forEach(function (item) {
                        if (item.status && !mStatusMap[item.status]) {
                            mStatusMap[item.status] = true;
                            aUniqueStatus.push({
                                Key: item.status,
                                Title: item.status,
                                Description: that._getI18nText("txtStatusPrefix", [item.status])
                            });
                        }
                    });

                    var oValueHelpDialog = new SelectDialog({
                        title: that._getI18nText("titleSelectStatus"),
                        items: {
                            path: "/",
                            template: new StandardListItem({
                                title: "{Title}",
                                description: "{Description}",
                                type: "Active"
                            })
                        },
                        search: function (oEvent) {
                            var sValue = oEvent.getParameter("value");
                            var oFilter = new Filter("Title", FilterOperator.Contains, sValue);
                            oEvent.getSource().getBinding("items").filter([oFilter]);
                        },
                        confirm: function (oEvent) {
                            var oSelectedItem = oEvent.getParameter("selectedItem");
                            if (oSelectedItem) {
                                oInput.setValue(oSelectedItem.getTitle());
                                oInput.data("selectedKey", oSelectedItem.getBindingContext().getProperty("Key"));
                            }
                        }
                    });

                    oValueHelpDialog.setModel(new JSONModel(aUniqueStatus));
                    oValueHelpDialog.open();
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    console.error("Error loading /WorkingTime:", oError);
                    MessageBox.error(that._getI18nText("msgLoadStatusError"));
                }
            });
        },

        onSearch: function () {
            var aFilters = [];
            var dDate = this.byId("idWorkDateFilter").getDateValue();

            if (dDate) {
                var dFilterDate = new Date(Date.UTC(dDate.getFullYear(), dDate.getMonth(), dDate.getDate(), 12, 0, 0));
                aFilters.push(new Filter("WorkDate", FilterOperator.EQ, dFilterDate));
            }

            var oStatusInput = this.byId("idStatusFilter");
            var sStatusKey = oStatusInput.data("selectedKey");

            if (sStatusKey) {
                aFilters.push(new Filter("status", FilterOperator.EQ, sStatusKey));
            }

            var oBinding = this.byId("timesheetTable").getBinding("items");
            if (oBinding) oBinding.filter(aFilters);
        },

        onReset: function () {
            this.byId("idWorkDateFilter").setDateValue(null);
            var oStatusInput = this.byId("idStatusFilter");
            oStatusInput.setValue("");
            oStatusInput.data("selectedKey", "");

            var oBinding = this.byId("timesheetTable").getBinding("items");
            if (oBinding) oBinding.filter([]);
        },

        // =========================================================
        // UTILITIES & ACTIONS
        // =========================================================

        formatEdmTime: function (oTime) {
            if (!oTime || typeof oTime !== "object" || oTime.ms === undefined || oTime.ms === null) {
                return "--:--:--"; 
            }
            var iTotalSeconds = Math.floor(oTime.ms / 1000);
            var iHours = Math.floor(iTotalSeconds / 3600);
            var iMinutes = Math.floor((iTotalSeconds % 3600) / 60);
            var iSeconds = iTotalSeconds % 60;

            return String(iHours).padStart(2, "0") + ":" + String(iMinutes).padStart(2, "0") + ":" + String(iSeconds).padStart(2, "0");
        },

        onRequestTypeChange: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            this.byId("vbOTSection").setVisible(sKey === "OVERTIME");
        },

        onPressSubmitDispute: function () {
            var oView = this.getView();
            var oSelectedItem = this.byId("timesheetTable").getSelectedItem();

            if (!oSelectedItem) {
                MessageBox.error(this._getI18nText("msgSelectRowToDispute"));
                return;
            }

            var sFragmentName = "my.report.zmydisputes.view.DisputeDialog";

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: sFragmentName,
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onConfirmSubmit: function (oEvent) {
            var oDialog = oEvent.getSource().getParent();
            var oView = this.getView();
            var oModel = oView.getModel();
            var that = this;

            var sRequestType = oView.byId("selectRequestType").getSelectedKey();
            var sProposedIn = oView.byId("tpProposedIn").getValue();
            var sProposedOut = oView.byId("tpProposedOut").getValue();
            var fOTHours = parseFloat(oView.byId("inputOTHours").getValue()) || 0;
            var sEmployeeComment = oView.byId("inputReason").getValue();

            if (!sProposedIn || !sProposedOut || !sEmployeeComment) {
                MessageBox.warning(this._getI18nText("msgFillMandatory"));
                return;
            }
            if (sRequestType === "OVERTIME" && fOTHours <= 0) {
                MessageBox.warning(this._getI18nText("msgEnterOtHours"));
                return;
            }

            var oContext = this.byId("timesheetTable").getSelectedItem().getBindingContext();
            var sPernr = oContext.getProperty("Pernr");
            var oDate = oContext.getProperty("WorkDate");
            var sShiftId = oContext.getProperty("ShiftId");

            if (!sPernr || !oDate || !sShiftId) {
                MessageBox.error(this._getI18nText("msgCannotIdentifyRow"));
                return;
            }

            var formatTimeForODataV2 = function (sTime) {
                if (!sTime) return null;
                var aParts = sTime.split(":");
                var iMs = (parseInt(aParts[0], 10) * 3600 + parseInt(aParts[1], 10) * 60 + parseInt(aParts[2], 10)) * 1000;
                return { __edmType: "Edm.Time", ms: iMs };
            };

            BusyIndicator.show(0);

            oModel.callFunction("/createReport", {
                method: "POST",
                urlParameters: {
                    Pernr: sPernr,
                    WorkDate: oDate,
                    ShiftId: sShiftId,
                    request_type: sRequestType,
                    proposed_in: formatTimeForODataV2(sProposedIn),
                    proposed_out: formatTimeForODataV2(sProposedOut),
                    ot_hours: sRequestType === "OVERTIME" ? fOTHours : 0,
                    employee_comment: sEmployeeComment
                },
                success: function () {
                    BusyIndicator.hide();
                    MessageToast.show(that._getI18nText("msgDisputeSuccess"));
                    oDialog.close();

                    oView.byId("tpProposedIn").setValue("");
                    oView.byId("tpProposedOut").setValue("");
                    oView.byId("inputOTHours").setValue("");
                    oView.byId("inputReason").setValue("");
                    
                    var oBinding = that.byId("timesheetTable").getBinding("items");
                    if (oBinding) oBinding.refresh(true);
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    console.error("Error calling /createReport:", oError);
                    var sMsg = that._getI18nText("msgDisputeSubmitError");
                    try {
                        var oErrObj = JSON.parse(oError.responseText);
                        sMsg += " " + oErrObj.error.message.value;
                    } catch (e) {}
                    MessageBox.error(sMsg);
                }
            });
        },

        onCancelSubmit: function (oEvent) {
            oEvent.getSource().getParent().close();
        }
    });
});
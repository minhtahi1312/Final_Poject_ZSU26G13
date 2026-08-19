sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, BusyIndicator, Filter, FilterOperator, SelectDialog, StandardListItem, JSONModel) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.EmployeeDisputes", {
        
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("EmployeeDisputes").attachPatternMatched(this._onRouteMatched, this);
        },

        _getI18nText: function (sKey, aArgs) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        _onRouteMatched: function () {
    var oTable = this.byId("disputesTable");

    if (!oTable) {
        return;
    }

    var oBinding = oTable.getBinding("items");

    if (oBinding) {
        var oSorter = new sap.ui.model.Sorter(
            "WorkDate",
            true
        );

        oBinding.sort(oSorter);
        oBinding.refresh(true);
    }
},

        // =========================================================
        // FILTERING & VALUE HELPS
        // =========================================================

        onRequestTypeValueHelp: function () {
            var oInput = this.byId("idDispRequestTypeFilter");
            var oModel = this.getView().getModel();
            var that = this;

            BusyIndicator.show(0);

            oModel.read("/MyDisputes", {
                urlParameters: { "$select": "RequestType" },
                success: function (oData) {
                    BusyIndicator.hide();
                    var aResults = oData.results || [];
                    var aTypes = [];
                    var mTypeMap = {};

                    aTypes.push({
                        Key: "",
                        Title: that._getI18nText("txtAllReqTypes"),
                        Description: that._getI18nText("txtShowAll")
                    });

                    aResults.forEach(function (item) {
                        var sKey = item.RequestType;
                        if (sKey && !mTypeMap[sKey]) {
                            mTypeMap[sKey] = true;
                            aTypes.push({
                                Key: sKey,
                                Title: sKey,
                                Description: that._getI18nText("txtReqIdPrefix", [sKey])
                            });
                        }
                    });

                    if (!mTypeMap["LEAVE"]) {
                        aTypes.push({
                            Key: "LEAVE",
                            Title: "LEAVE",
                            Description: that._getI18nText("txtLeaveReq")
                        });
                    }

                    var oValueHelpDialog = new SelectDialog({
                        title: that._getI18nText("titleSelectReqType"),
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
                                var oContext = oSelectedItem.getBindingContext();
                                oInput.setValue(oSelectedItem.getTitle());
                                oInput.data("selectedKey", oContext.getProperty("Key"));
                            }
                        }
                    });

                    oValueHelpDialog.setModel(new JSONModel(aTypes));
                    oValueHelpDialog.open();
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    console.error("Error loading /MyDisputes:", oError);
                    MessageBox.error(that._getI18nText("msgLoadReqTypeError"));
                }
            });
        },

        onSearch: function () {
            var aFilters = [];
            var dDate = this.byId("idDispWorkDateFilter").getDateValue();

            if (dDate) {
                var dFilterDate = new Date(Date.UTC(dDate.getFullYear(), dDate.getMonth(), dDate.getDate(), 12, 0, 0));
                aFilters.push(new Filter("WorkDate", FilterOperator.EQ, dFilterDate));
            }

            var oRequestTypeInput = this.byId("idDispRequestTypeFilter");
            var sRequestTypeKey = oRequestTypeInput.data("selectedKey");

            if (sRequestTypeKey) {
                aFilters.push(new Filter("RequestType", FilterOperator.EQ, sRequestTypeKey));
            }

            var oBinding = this.byId("disputesTable").getBinding("items");
            if (oBinding) {
    oBinding.filter(aFilters);

    oBinding.sort(
        new sap.ui.model.Sorter(
            "WorkDate",
            true
        )
    );
}
        },

        onReset: function () {
            this.byId("idDispWorkDateFilter").setDateValue(null);
            var oRequestTypeInput = this.byId("idDispRequestTypeFilter");
            oRequestTypeInput.setValue("");
            oRequestTypeInput.data("selectedKey", "");

            var oBinding = this.byId("disputesTable").getBinding("items");
            if (oBinding) {
    oBinding.filter([]);

    oBinding.sort(
        new sap.ui.model.Sorter(
            "WorkDate",
            true
        )
    );
}
        },

        // =========================================================
        // UTILITIES & ACTIONS
        // =========================================================

        formatEdmTime: function (oTime) {
            if (!oTime || oTime.ms === undefined) return "";
            var totalSeconds = Math.floor(oTime.ms / 1000);
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = totalSeconds % 60;
            return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
        },

        onCancelDispute: function (oEvent) {
            var that = this;
            var oModel = this.getView().getModel();
            var oTable = this.byId("disputesTable");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                MessageToast.show(this._getI18nText("msgSelectRowToCancel"));
                return;
            }

            var oSelectedData = oSelectedItem.getBindingContext().getObject();
            var sDisputeId = oSelectedData.DisputeId;
            var sStatus = oSelectedData.DisputeStatus;

            if (sStatus === "APPROVED") {
                MessageBox.information(this._getI18nText("msgCannotCancelApproved"));
                return;
            }
            if (sStatus === "REJECTED") {
                MessageBox.information(this._getI18nText("msgCannotCancelRejected"));
                return;
            }
            if (sStatus === "CANCELLED") {
                MessageBox.information(this._getI18nText("msgCannotCancelCancelled"));
                return;
            }
            if (sStatus !== "PENDING") {
                MessageBox.information(this._getI18nText("msgCannotCancelProcessed"));
                return;
            }

            BusyIndicator.show(0);

            oModel.callFunction("/cancelReport", {
                method: "POST",
                urlParameters: { DisputeId: sDisputeId },
                success: function () {
    BusyIndicator.hide();

    MessageToast.show(
        that._getI18nText("msgCancelSuccess")
    );

    var oBinding = that.byId("disputesTable").getBinding("items");

    if (oBinding) {

        oBinding.sort(
            new sap.ui.model.Sorter(
                "WorkDate",
                true
            )
        );

        oBinding.refresh(true);
    }
},
                error: function (oError) {
                    BusyIndicator.hide();
                    console.error("Error calling /cancelReport:", oError);
                    MessageToast.show(that._getI18nText("msgCancelError"));
                }
            });
        }
    });
});
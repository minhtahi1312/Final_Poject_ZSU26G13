sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/TextArea",
    "sap/m/Label",
    "sap/m/VBox"
], function (Controller, JSONModel, BusyIndicator, MessageBox, Dialog, Button, Text, TextArea, Label, VBox) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.EmployeeCalendar", {
        
        onInit: function () {
            var oCustomModel = new JSONModel({
                currentDate: this._getStartOfWeek(new Date())
            });
            this.getView().setModel(oCustomModel, "$custom");
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("EmployeeCalendar").attachPatternMatched(this._onRouteMatched, this);
        },

        // =========================================================
        // HELPER FUNCTIONS
        // =========================================================

        _getI18nText: function (sKey, aArgs) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        _onRouteMatched: function () {
            this._loadCalendarData();
        },

        _getStartOfWeek: function (oDate) {
            var d = new Date(oDate);
            var day = d.getDay();
            var diff = day === 0 ? -6 : 1 - day;
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            return d;
        },

        // =========================================================
        // CALENDAR NAVIGATION
        // =========================================================

        onTodayPress: function () {
            var oCalendar = this.byId("planningCalendar");
            var dToday = this._getStartOfWeek(new Date());

            this.getView().getModel("$custom").setProperty("/currentDate", dToday);
            oCalendar.setStartDate(dToday);
        },

        onPreviousWeek: function () {
            var oCalendar = this.byId("planningCalendar");
            var oModel = this.getView().getModel("$custom");
            var d = new Date(oModel.getProperty("/currentDate"));

            d.setDate(d.getDate() - 7);
            oModel.setProperty("/currentDate", d);
            oCalendar.setStartDate(d);
        },

        onNextWeek: function () {
            var oCalendar = this.byId("planningCalendar");
            var oModel = this.getView().getModel("$custom");
            var d = new Date(oModel.getProperty("/currentDate"));
            
            d.setDate(d.getDate() + 7);
            oModel.setProperty("/currentDate", d);
            oCalendar.setStartDate(d);
        },

        // =========================================================
        // DATA LOADING
        // =========================================================

        _loadCalendarData: function () {
            var oView = this.getView();
            var oModel = oView.getModel();
            if (!oModel) return;

            BusyIndicator.show(0);
            var that = this;

            oModel.read("/MySchedule", {
                success: function (oData) {
                    BusyIndicator.hide();
                    var aResults = oData.results;
                    var oGroupedData = {};

                    aResults.forEach(function (item) {
                        var sPernr = item.Pernr;
                        if (!item.PlanDate) return;
                
                        var dRawDate = new Date(item.PlanDate);
                        var dPlanDate = new Date(dRawDate.getTime() + dRawDate.getTimezoneOffset() * 60000);

                        var iStartHour = 0, iStartMin = 0, iEndHour = 0, iEndMin = 0;
                        var sShiftName = item.ShiftId;
                        var sColorType = "Type10";

                        // Parse Edm.Time values
                        if (item.ShiftTimeIn && item.ShiftTimeIn.ms !== undefined) {
                            var iTotalSecondsIn = item.ShiftTimeIn.ms / 1000;
                            iStartHour = Math.floor(iTotalSecondsIn / 3600);
                            iStartMin = Math.floor((iTotalSecondsIn % 3600) / 60);
                        }

                        if (item.ShiftTimeOut && item.ShiftTimeOut.ms !== undefined) {
                            var iTotalSecondsOut = item.ShiftTimeOut.ms / 1000;
                            iEndHour = Math.floor(iTotalSecondsOut / 3600);
                            iEndMin = Math.floor((iTotalSecondsOut % 3600) / 60);
                        }

                        // Apply OT Suffix if applicable
                        if (item.IsOt) {
                            sShiftName += that._getI18nText("txtOtSuffix", [item.OtHours]);
                        } else {
                            sShiftName = item.ShiftId;
                        }

                        var dRealStart = new Date(dPlanDate);
                        dRealStart.setHours(iStartHour, iStartMin, 0, 0);

                        var dRealEnd = new Date(dPlanDate);
                        dRealEnd.setHours(iEndHour, iEndMin, 0, 0);

                        var dDisplayStart = new Date(dPlanDate);
                        dDisplayStart.setHours(0, 30, 0, 0);

                        var dDisplayEnd = new Date(dPlanDate);
                        dDisplayEnd.setHours(22, 30, 0, 0);

                        var oAppointment = {
                            ShiftId: item.ShiftId,
                            ShiftName: sShiftName,
                            Title: that._getI18nText("txtTitlePrefix", [item.ShiftId]),
                            Text: String(iStartHour).padStart(2, "0") + ":" + String(iStartMin).padStart(2, "0") + " - " +
                                  String(iEndHour).padStart(2, "0") + ":" + String(iEndMin).padStart(2, "0"),
                            ColorType: sColorType,
                            StartDate: dDisplayStart,
                            EndDate: dDisplayEnd,
                            RealStartDate: dRealStart,
                            RealEndDate: dRealEnd,
                            IsOt: item.IsOt,
                            OtHours: item.OtHours,
                            Pernr: item.Pernr,
                            EmployeeName: item.EmployeeName,
                            DeptId: item.DeptId
                        };

                        if (!oGroupedData[sPernr]) {
                            oGroupedData[sPernr] = {
                                Pernr: sPernr,
                                EmployeeName: item.EmployeeName,
                                DeptId: item.DeptId,
                                EmployeeText: that._getI18nText("txtEmpIdPrefix", [sPernr]),
                                Appointments: []
                            };
                        }
                        oGroupedData[sPernr].Appointments.push(oAppointment);
                    });

                    var oCalendarModel = new JSONModel({
                        CalendarRows: Object.values(oGroupedData)
                    });

                    oView.setModel(oCalendarModel, "calendarModel");
                    that.byId("planningCalendar").setStartDate(that.getView().getModel("$custom").getProperty("/currentDate"));
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    console.error("Error loading /MySchedule:", oError);
                    MessageBox.error(that._getI18nText("msgLoadPlanError"));
                }
            });
        },

        // =========================================================
        // DIALOGS & ACTIONS
        // =========================================================
        
        onAppointmentSelect: function (oEvent) {
            var oAppointment = oEvent.getParameter("appointment");
            if (!oAppointment) return;

            var oContext = oAppointment.getBindingContext("calendarModel");
            var oAppt = oContext.getObject();

            var dStart = oAppt.RealStartDate;
            var dEnd = oAppt.RealEndDate;

            var sLogDate = String(dStart.getDate()).padStart(2, "0") + "/" +
                           String(dStart.getMonth() + 1).padStart(2, "0") + "/" +
                           dStart.getFullYear();
                           
            var sLogStart = String(dStart.getHours()).padStart(2, "0") + ":" + String(dStart.getMinutes()).padStart(2, "0");
            var sLogEnd = String(dEnd.getHours()).padStart(2, "0") + ":" + String(dEnd.getMinutes()).padStart(2, "0");

            var sOtInfoText = oAppt.IsOt 
                ? this._getI18nText("txtOtYes") + (oAppt.OtHours ? " (" + oAppt.OtHours + "h)" : "")
                : this._getI18nText("txtOtNo");

            var oDetailData = {
                Title: oAppt.Title,
                ShiftName: oAppt.ShiftName,
                LogDate: sLogDate,
                TimeRange: this._getI18nText("txtTimeRange", [sLogStart, sLogEnd]),
                EmployeeInfo: this._getI18nText("txtEmpInfo", [oAppt.EmployeeName, oAppt.Pernr]),
                DeptId: oAppt.DeptId,
                IsOtText: sOtInfoText
            };

            this._openShiftDetailDialog(oAppt, oDetailData);
        },

        _openShiftDetailDialog: function (oAppt, oDetailData) {
            var dToday = new Date();
            dToday.setHours(0, 0, 0, 0);

            var dWorkDate = new Date(oAppt.StartDate);
            dWorkDate.setHours(0, 0, 0, 0);

            var bCanRequestLeave = dWorkDate >= dToday;
            var that = this;

            var oDialog = new Dialog({
                title: this._getI18nText("titleShiftDetail"),
                contentWidth: "450px",
                stretchOnPhone: true,
                content: [
                    new VBox({
                        width: "100%",
                        items: [
                            new Label({ text: this._getI18nText("lblShiftCode"), design: "Bold" }),
                            new Text({ text: oDetailData.Title }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblShiftName"), design: "Bold" }),
                            new Text({ text: oDetailData.ShiftName }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblWorkDate"), design: "Bold" }),
                            new Text({ text: oDetailData.LogDate }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblTime"), design: "Bold" }),
                            new Text({ text: oDetailData.TimeRange }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblEmployee"), design: "Bold" }),
                            new Text({ text: oDetailData.EmployeeInfo }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblDept"), design: "Bold" }),
                            new Text({ text: oDetailData.DeptId }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblOvertime"), design: "Bold" }),
                            new Text({ text: oDetailData.IsOtText })
                        ]
                    })
                ],
                beginButton: new Button({
                    text: this._getI18nText("btnRequestLeave"),
                    type: "Emphasized",
                    enabled: bCanRequestLeave,
                    press: function () {
                        oDialog.close();
                        that._openLeaveDialog(oAppt);
                    }
                }),
                endButton: new Button({
                    text: this._getI18nText("btnClose"),
                    press: function () { oDialog.close(); }
                }),
                afterClose: function () { oDialog.destroy(); }
            });

            oDialog.addStyleClass("sapUiContentPadding");
            oDialog.open();
        },

        _openLeaveDialog: function (oAppt) {
            var that = this;

            var oReason = new TextArea({
                width: "100%",
                rows: 4,
                maxLength: 255,
                growing: true,
                growingMaxLines: 6,
                placeholder: this._getI18nText("phLeaveReason")
            });

            var oDialog = new Dialog({
                title: this._getI18nText("titleLeaveRequest"),
                contentWidth: "450px",
                stretchOnPhone: true,
                content: [
                    new VBox({
                        width: "100%",
                        items: [
                            new Label({ text: this._getI18nText("lblEmployee"), design: "Bold" }),
                            new Text({ text: this._getI18nText("txtEmpInfo", [oAppt.EmployeeName, oAppt.Pernr]) }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblLeaveDate"), design: "Bold" }),
                            new Text({ text: oAppt.StartDate.toLocaleDateString("en-GB") }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblShiftName"), design: "Bold" }),
                            new Text({ text: oAppt.ShiftName }).addStyleClass("sapUiSmallMarginBottom"),
                            new Label({ text: this._getI18nText("lblLeaveReason"), required: true, design: "Bold" }),
                            oReason
                        ]
                    })
                ],
                beginButton: new Button({
                    text: this._getI18nText("btnSubmitLeave"),
                    type: "Emphasized",
                    press: function () {
                        var sReason = oReason.getValue().trim();
                        if (!sReason) {
                            MessageBox.warning(that._getI18nText("msgEnterReason"));
                            return;
                        }
                        that._submitLeaveRequest(oAppt, sReason);
                        oDialog.close();
                    }
                }),
                endButton: new Button({
                    text: this._getI18nText("btnCancel"),
                    press: function () { oDialog.close(); }
                }),
                afterClose: function () { oDialog.destroy(); }
            });

            oDialog.addStyleClass("sapUiContentPadding");
            oDialog.open();
        },

        _submitLeaveRequest: function (oAppt, sReason) {
            var oModel = this.getView().getModel();
            var dWorkDate = new Date(oAppt.StartDate);
            dWorkDate.setHours(12, 0, 0, 0); // Avoid timezone shift
            
            var oEntry = {
                PersonnelNumber: oAppt.Pernr,
                WorkDate: dWorkDate,
                ShiftId: oAppt.ShiftId,
                RequestType: "LEAVE",
                EmployeeComment: sReason,
                DisputeStatus: "PENDING"
            };

            BusyIndicator.show(0);
            var that = this;

            oModel.create("/MyDisputes", oEntry, {
                success: function () {
                    BusyIndicator.hide();
                    MessageBox.success(that._getI18nText("msgLeaveSuccess"), {
                        onClose: function () {
                            that._loadCalendarData();
                        }
                    });
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    console.error("Error creating /MyDisputes:", oError);
                    var sMessage = that._getI18nText("msgSubmitError");
                    try {
                        var oResponse = JSON.parse(oError.responseText);
                        sMessage = oResponse.error.message.value;
                    } catch (e) {}
                    MessageBox.error(sMessage);
                }
            });
        }
    });
});
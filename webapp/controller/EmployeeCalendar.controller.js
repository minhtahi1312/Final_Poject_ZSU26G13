sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/TextArea",
    "sap/m/Label",
    "sap/m/VBox",
  ],
  function (
    Controller,
    JSONModel,
    BusyIndicator,
    MessageBox,
    Dialog,
    Button,
    Text,
    TextArea,
    Label,
    VBox,
  ) {
    "use strict";

    return Controller.extend(
      "my.report.zmydisputes.controller.EmployeeCalendar",
      {
        onInit: function () {
          // Đặt ngày mốc mặc định ban đầu hiển thị trên bộ lịch cá nhân
          var oCustomModel = new JSONModel({
            currentDate: this._getStartOfWeek(new Date()),
          });
          this.getView().setModel(oCustomModel, "$custom");
          var oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("EmployeeCalendar")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        /*
         * Hàm tự động chạy khi Route "EmployeeCalendar" được khớp
         */
        _onRouteMatched: function () {
          this._loadCalendarData();
        },

        /**
         * Hàm đọc dữ liệu thực tế từ OData
         */
        _getStartOfWeek: function (oDate) {
          var d = new Date(oDate);
          var day = d.getDay();
          var diff = day === 0 ? -6 : 1 - day;
          d.setDate(d.getDate() + diff);
          d.setHours(0, 0, 0, 0);
          return d;
        },

        onTodayPress: function () {
          var oCalendar = this.byId("planningCalendar");

          var dToday = this._getStartOfWeek(new Date());

          this.getView()
            .getModel("$custom")
            .setProperty("/currentDate", dToday);

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

        _loadCalendarData: function () {
          var oView = this.getView();
          var oModel = oView.getModel();
          if (!oModel) {
            return;
          }
          BusyIndicator.show(0);
          var that = this;

          oModel.read("/MySchedule", {
            success: function (oData) {
              BusyIndicator.hide();
              var aResults = oData.results;
              var oGroupedData = {};
              aResults.forEach(function (item) {
                var sPernr = item.Pernr;
                if (!item.PlanDate) {
                  return;
                }
                // Xử lý múi giờ đồng bộ tránh lệch ngày hiển thị
                var dRawDate = new Date(item.PlanDate);
                var dPlanDate = new Date(
                  dRawDate.getTime() + dRawDate.getTimezoneOffset() * 60000,
                );

                var iStartHour = 0,
                  iStartMin = 0,
                  iEndHour = 0,
                  iEndMin = 0;
                var sShiftName = "Ca làm việc: " + item.ShiftId;
                var sColorType = "Type10";
                var iNextDayOffset = 0;

                // 1. Bóc tách Giờ vào (ShiftTimeIn) từ Edm.Time (ms) của SAP OData
                if (item.ShiftTimeIn && item.ShiftTimeIn.ms !== undefined) {
                  var iTotalSecondsIn = item.ShiftTimeIn.ms / 1000;
                  iStartHour = Math.floor(iTotalSecondsIn / 3600);
                  iStartMin = Math.floor((iTotalSecondsIn % 3600) / 60);
                }

                // 2. Bóc tách Giờ ra (ShiftTimeOut) từ Edm.Time (ms) của SAP OData
                if (item.ShiftTimeOut && item.ShiftTimeOut.ms !== undefined) {
                  var iTotalSecondsOut = item.ShiftTimeOut.ms / 1000;
                  iEndHour = Math.floor(iTotalSecondsOut / 3600);
                  iEndMin = Math.floor((iTotalSecondsOut % 3600) / 60);
                }
                if (item.IsOt) {
                  sShiftName += " (OT " + item.OtHours + "h)";
                }

                sShiftName = item.ShiftId;
                // Gán mốc thời gian động bốc từ SAP Database
                var dRealStart = new Date(dPlanDate);
                dRealStart.setHours(iStartHour, iStartMin, 0, 0);

                var dRealEnd = new Date(dPlanDate);
                dRealEnd.setHours(iEndHour, iEndMin, 0, 0);

                // Giờ dùng để vẽ Calendar
                var dDisplayStart = new Date(dPlanDate);
                dDisplayStart.setHours(0, 30, 0, 0);

                var dDisplayEnd = new Date(dPlanDate);
                dDisplayEnd.setHours(22, 30, 0, 0);

                var oAppointment = {
                  ShiftId: item.ShiftId,

                  ShiftName: sShiftName,

                  Title: "Ca: " + item.ShiftId,

                  Text:
                    iStartHour.toString().padStart(2, "0") +
                    ":" +
                    iStartMin.toString().padStart(2, "0") +
                    " - " +
                    iEndHour.toString().padStart(2, "0") +
                    ":" +
                    iEndMin.toString().padStart(2, "0"),

                  ColorType: sColorType,

                  // dùng để HIỂN THỊ trên lịch
                  StartDate: dDisplayStart,
                  EndDate: dDisplayEnd,

                  // giờ THẬT
                  RealStartDate: dRealStart,
                  RealEndDate: dRealEnd,

                  IsOt: item.IsOt,
                  OtHours: item.OtHours,
                  Pernr: item.Pernr,
                  EmployeeName: item.EmployeeName,
                  DeptId: item.DeptId,
                };

                if (!oGroupedData[sPernr]) {
                  oGroupedData[sPernr] = {
                    Pernr: sPernr,

                    EmployeeName: item.EmployeeName,

                    DeptId: item.DeptId,

                    EmployeeText: "MSNV: " + sPernr,

                    Appointments: [],
                  };
                }
                oGroupedData[sPernr].Appointments.push(oAppointment);
              });

              var oCalendarModel = new JSONModel({
                CalendarRows: Object.values(oGroupedData),
              });

              oView.setModel(oCalendarModel, "calendarModel");
              that
                .byId("planningCalendar")
                .setStartDate(
                  that
                    .getView()
                    .getModel("$custom")
                    .getProperty("/currentDate"),
                );
            },

            error: function (oError) {
              BusyIndicator.hide();
              MessageBox.error("Không thể tải dữ liệu từ tập thực thể OtPlan!");
            },
          });
        },

        /**
         * Hàm xử lý hiển thị thông tin chi tiết khi nhấn chọn ca làm việc
         */
        onAppointmentSelect: function (oEvent) {
          var oAppointment = oEvent.getParameter("appointment");
          if (!oAppointment) {
            return;
          }

          var oContext = oAppointment.getBindingContext("calendarModel");
          var oAppt = oContext.getObject();

          var dStart = oAppt.RealStartDate;
          var dEnd = oAppt.RealEndDate;

          var sLogDate =
            dStart.getDate().toString().padStart(2, "0") +
            "/" +
            (dStart.getMonth() + 1).toString().padStart(2, "0") +
            "/" +
            dStart.getFullYear();
          var sLogStart =
            dStart.getHours().toString().padStart(2, "0") +
            ":" +
            dStart.getMinutes().toString().padStart(2, "0");
          var sLogEnd =
            dEnd.getHours().toString().padStart(2, "0") +
            ":" +
            dEnd.getMinutes().toString().padStart(2, "0");

          var oModel = this.getView().getModel("calendarModel");

          // Lấy ShiftName trực tiếp từ Object dữ liệu gốc đã gán thay vì text tĩnh
          var oAppointmentContext =
            oAppointment.getBindingContext("calendarModel");
          var sDynamicShiftName = oModel.getProperty(
            oAppointmentContext.getPath() + "/ShiftName",
          );

          var sOtInfo = "";

          if (oAppointmentContext) {
            var oAppt = oModel.getProperty(oAppointmentContext.getPath());

            if (oAppt.IsOt) {
              sOtInfo = "\n\nTăng ca: Có";

              if (oAppt.OtHours) {
                sOtInfo += "\nSố giờ OT: " + oAppt.OtHours + " giờ";
              }
            } else {
              sOtInfo = "\n\nTăng ca: Không";
            }
          }

          var oDetailData = {
            Title: oAppointment.getTitle(),
            ShiftName: sDynamicShiftName,
            LogDate: sLogDate,
            TimeRange: "từ " + sLogStart + " đến " + sLogEnd,
            EmployeeInfo: oAppt.EmployeeName + " (MSNV: " + oAppt.Pernr + ")",
            DeptId: oAppt.DeptId,
            IsOtText: oAppt.IsOt
              ? "Có" + (oAppt.OtHours ? " (" + oAppt.OtHours + " giờ)" : "")
              : "Không",
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
            title: "Chi tiết ca làm việc",
            contentWidth: "450px",
            stretchOnPhone: true,
            content: [
              new VBox({
                width: "100%",
                items: [
                  new Label({ text: "Mã kíp ca", design: "Bold" }),
                  new Text({ text: oDetailData.Title }).addStyleClass(
                    "sapUiSmallMarginBottom",
                  ),

                  new Label({ text: "Tên ca", design: "Bold" }),
                  new Text({ text: oDetailData.ShiftName }).addStyleClass(
                    "sapUiSmallMarginBottom",
                  ),

                  new Label({ text: "Ngày làm việc", design: "Bold" }),
                  new Text({ text: oDetailData.LogDate }).addStyleClass(
                    "sapUiSmallMarginBottom",
                  ),

                  new Label({ text: "Thời gian", design: "Bold" }),
                  new Text({ text: oDetailData.TimeRange }).addStyleClass(
                    "sapUiSmallMarginBottom",
                  ),

                  new Label({ text: "Nhân viên", design: "Bold" }),
                  new Text({ text: oDetailData.EmployeeInfo }).addStyleClass(
                    "sapUiSmallMarginBottom",
                  ),

                  new Label({ text: "Phòng ban / Nhà máy", design: "Bold" }),
                  new Text({ text: oDetailData.DeptId }).addStyleClass(
                    "sapUiSmallMarginBottom",
                  ),

                  new Label({ text: "Tăng ca", design: "Bold" }),
                  new Text({ text: oDetailData.IsOtText }),
                ],
              }),
            ],
            beginButton: new Button({
              text: "Xin nghỉ phép",
              type: "Emphasized",
              enabled: bCanRequestLeave,
              press: function () {
                oDialog.close();
                that._openLeaveDialog(oAppt);
              },
            }),
            endButton: new Button({
              text: "Đóng",
              press: function () {
                oDialog.close();
              },
            }),
            afterClose: function () {
              oDialog.destroy();
            },
          });

          oDialog.addStyleClass("sapUiContentPadding");
          oDialog.open();
        },
        _openLeaveDialog: function (oAppt) {
          var that = this;

          // Ô nhập lý do nghỉ
          var oReason = new TextArea({
            width: "100%",
            rows: 4,
            maxLength: 255,
            growing: true,
            growingMaxLines: 6,
            placeholder:
              "Ví dụ: Nghỉ khám bệnh, việc gia đình, nghỉ phép cá nhân...",
          });

          var oDialog = new Dialog({
            title: "Đơn xin nghỉ phép",
            contentWidth: "450px",
            stretchOnPhone: true,
            content: [
              new VBox({
                width: "100%",
                items: [
                  new Label({ text: "Nhân viên", design: "Bold" }),
                  new Text({
                    text: oAppt.EmployeeName + " (" + oAppt.Pernr + ")",
                  }).addStyleClass("sapUiSmallMarginBottom"),

                  new Label({ text: "Ngày nghỉ", design: "Bold" }),
                  new Text({
                    text: oAppt.StartDate.toLocaleDateString("vi-VN"),
                  }).addStyleClass("sapUiSmallMarginBottom"),

                  new Label({ text: "Ca làm việc", design: "Bold" }),
                  new Text({ text: oAppt.ShiftName }).addStyleClass(
                    "sapUiSmallMarginBottom",
                  ),

                  new Label({
                    text: "Lý do nghỉ",
                    required: true,
                    design: "Bold",
                  }),
                  oReason,
                ],
              }),
            ],
            beginButton: new Button({
              text: "Gửi đơn",
              type: "Emphasized",
              press: function () {
                var sReason = oReason.getValue().trim();
                if (!sReason) {
                  MessageBox.warning("Vui lòng nhập lý do.");
                  return;
                }
                that._submitLeaveRequest(oAppt, sReason);
                oDialog.close();
              },
            }),
            endButton: new Button({
              text: "Hủy",
              press: function () {
                oDialog.close();
              },
            }),
            afterClose: function () {
              oDialog.destroy();
            },
          });

          oDialog.addStyleClass("sapUiContentPadding");
          oDialog.open();
        },
        _submitLeaveRequest: function (oAppt, sReason) {
          var oModel = this.getView().getModel();
          var dWorkDate = new Date(oAppt.StartDate);
          dWorkDate.setHours(12, 0, 0, 0);
          var oEntry = {
            PersonnelNumber: oAppt.Pernr,
            WorkDate: dWorkDate,
            ShiftId: oAppt.ShiftId,
            RequestType: "LEAVE",
            EmployeeComment: sReason,
            DisputeStatus: "PENDING",
          };
          BusyIndicator.show(0);

  var that = this;

  oModel.create("/MyDisputes", oEntry, {
    success: function () {
      // 2. TẮT BusyIndicator NGAY LẬP TỨC trước khi hiện MessageBox
      BusyIndicator.hide();
      
      MessageBox.success("Gửi đơn nghỉ phép thành công.", {
        onClose: function () {
          // 3. Tải lại dữ liệu lịch để cập nhật giao diện (nếu cần)
          that._loadCalendarData();
        }
      });
    },

    error: function (oError) {
      // 4. Luôn luôn nhớ TẮT BusyIndicator nếu xảy ra lỗi
      BusyIndicator.hide();

      var sMessage = "Không thể gửi đơn.";
      try {
        var oResponse = JSON.parse(oError.responseText);
        sMessage = oResponse.error.message.value;
      } catch (e) {}

      MessageBox.error(sMessage);
    }
  });
},
      },
    );
  },
);

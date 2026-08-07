sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/ui/model/json/JSONModel",
  ],
  function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox,
    BusyIndicator,
    Filter,
    FilterOperator,
    SelectDialog,
    StandardListItem,
    JSONModel,
  ) {
    "use strict";

    return Controller.extend(
      "my.report.zmydisputes.controller.EmployeeTimesheet",
      {
        onInit: function () {
          this.getOwnerComponent()
            .getRouter()
            .getRoute("EmployeeTimesheet")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          var oTable = this.byId("timesheetTable");

          if (!oTable) {
            return;
          }

          var oBinding = oTable.getBinding("items");

          if (oBinding) {
            oBinding.refresh(true);
          }
        },
        onStatusValueHelp: function () {
          var oInput = this.byId("idStatusFilter");
          var oModel = this.getView().getModel();

          BusyIndicator.show(0);

          // Get danh sách Status thực tế từ Entity WorkingTime
          oModel.read("/WorkingTime", {
            success: function (oData) {
              BusyIndicator.hide();

              var aResults = oData.results || [];
              var aUniqueStatus = [];
              var mStatusMap = {};

              // Lựa chọn mặc định reset/tất cả
              aUniqueStatus.push({
                Key: "",
                Title: "Tất cả trạng thái",
                Description: "Hiển thị toàn bộ",
              });

              // Bóc tách danh sách Status duy nhất từ Backend
              aResults.forEach(function (item) {
                if (item.status && !mStatusMap[item.status]) {
                  mStatusMap[item.status] = true;
                  aUniqueStatus.push({
                    Key: item.status,
                    Title: item.status,
                    Description: "Trạng thái: " + item.status,
                  });
                }
              });

              // Tạo SelectDialog Value Help
              var oValueHelpDialog = new SelectDialog({
                title: "Chọn Trạng thái",
                items: {
                  path: "/",
                  template: new StandardListItem({
                    title: "{Title}",
                    description: "{Description}",
                    type: "Active",
                  }),
                },
                search: function (oEvent) {
                  var sValue = oEvent.getParameter("value");
                  var oFilter = new Filter(
                    "Title",
                    FilterOperator.Contains,
                    sValue,
                  );
                  oEvent.getSource().getBinding("items").filter([oFilter]);
                },
                confirm: function (oEvent) {
                  var oSelectedItem = oEvent.getParameter("selectedItem");
                  if (oSelectedItem) {
                    var oContext = oSelectedItem.getBindingContext();
                    var sKey = oContext.getProperty("Key");

                    oInput.setValue(oSelectedItem.getTitle());
                    oInput.data("selectedKey", sKey);
                  }
                },
              });

              oValueHelpDialog.setModel(new JSONModel(aUniqueStatus));
              oValueHelpDialog.open();
            },
            error: function () {
              BusyIndicator.hide();
              MessageBox.error("Không thể tải danh sách trạng thái.");
            },
          });
        },

        /**
         * 2. HÀM XỬ LÝ LỌC DỮ LIỆU KHI NHẤN "GO / SEARCH" TRÊN FILTERBAR
         */
        onSearch: function () {
          var aFilters = [];

          // A. Lọc theo Ngày làm việc
          var oDatePicker = this.byId("idWorkDateFilter");
          var dDate = oDatePicker.getDateValue();

          if (dDate) {
            var dFilterDate = new Date(
              Date.UTC(
                dDate.getFullYear(),
                dDate.getMonth(),
                dDate.getDate(),
                12,
                0,
                0,
              ),
            );
            aFilters.push(
              new Filter("WorkDate", FilterOperator.EQ, dFilterDate),
            );
          }

          // B. Lọc theo Trạng thái chọn từ Value Help
          var oStatusInput = this.byId("idStatusFilter");
          var sStatusKey = oStatusInput.data("selectedKey");

          if (sStatusKey) {
            aFilters.push(new Filter("status", FilterOperator.EQ, sStatusKey));
          }

          // Áp dụng bộ lọc vào Table Binding
          var oTable = this.byId("timesheetTable");
          var oBinding = oTable.getBinding("items");
          if (oBinding) {
            oBinding.filter(aFilters);
          }
        },

        /**
         * 3. HÀM RESET BỘ LỌC SEARCH HELP
         */
        onReset: function () {
          this.byId("idWorkDateFilter").setDateValue(null);

          var oStatusInput = this.byId("idStatusFilter");
          oStatusInput.setValue("");
          oStatusInput.data("selectedKey", "");

          var oTable = this.byId("timesheetTable");
          var oBinding = oTable.getBinding("items");
          if (oBinding) {
            oBinding.filter([]);
          }
        },

        formatEdmTime: function (oTime) {
          if (
            !oTime ||
            typeof oTime !== "object" ||
            oTime.ms === undefined ||
            oTime.ms === null
          ) {
            return "--:--:--"; // Hoặc trả về ""
          }
          // Tính toán chuyển đổi mili-giây thành giờ:phút:giây
          var iTotalSeconds = Math.floor(oTime.ms / 1000);
          var iHours = Math.floor(iTotalSeconds / 3600);
          var iMinutes = Math.floor((iTotalSeconds % 3600) / 60);
          var iSeconds = iTotalSeconds % 60;

          // Chèn thêm số 0 ở trước nếu số nhỏ hơn 10
          var sHours = iHours < 10 ? "0" + iHours : iHours;
          var sMinutes = iMinutes < 10 ? "0" + iMinutes : iMinutes;
          var sSeconds = iSeconds < 10 ? "0" + iSeconds : iSeconds;

          return sHours + ":" + sMinutes + ":" + sSeconds;
        },
        onRequestTypeChange: function (oEvent) {
          var sKey = oEvent.getSource().getSelectedKey();

          var bVisible = sKey === "OVERTIME";

          this.byId("vbOTSection").setVisible(bVisible);
        },
        /**
         * 1. HÀM MỞ POPUP KHHIẾU NẠI (FRAGMENT)
         */
        onPressSubmitDispute: function (oEvent) {
          var oView = this.getView();

          // Lấy dòng đang chọn để kiểm tra xem nhân viên đã tick chọn dòng nào chưa
          var oTable = this.byId("timesheetTable");
          var oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageBox.error("Vui lòng chọn một dòng dữ liệu chấm công trước!");
            return;
          }

          // Đường dẫn Fragment được đổi về namespace mới của dự án zmy_disputes
          var sFragmentName = "my.report.zmydisputes.view.DisputeDialog";

          if (!this._pDialog) {
            this._pDialog = Fragment.load({
              id: oView.getId(),
              name: sFragmentName,
              controller: this,
            }).then(function (oDialog) {
              oView.addDependent(oDialog);
              return oDialog;
            });
          }
          this._pDialog.then(function (oDialog) {
            oDialog.open();
          });
        },

        /**
         * 2. HÀM XÁC NHẬN GỬI ĐƠN XUỐNG BACKEND RAP
         */
        onConfirmSubmit: function (oEvent) {
          var oDialog = oEvent.getSource().getParent();
          var oView = this.getView();
          var oModel = oView.getModel();

          // Lấy dữ liệu từ form trong Fragment
          var sRequestType = oView.byId("selectRequestType").getSelectedKey();
          var sProposedIn = oView.byId("tpProposedIn").getValue();
          var sProposedOut = oView.byId("tpProposedOut").getValue();
          var fOTHours = parseFloat(oView.byId("inputOTHours").getValue()) || 0;
          console.log("OT =", fOTHours);
          var sEmployeeComment = oView.byId("inputReason").getValue();

          if (!sProposedIn || !sProposedOut || !sEmployeeComment) {
            MessageBox.warning("Vui lòng nhập đầy đủ thông tin bắt buộc!");
            return;
          }
          if (sRequestType === "OVERTIME" && fOTHours <= 0) {
            MessageBox.warning("Vui lòng nhập số giờ OT.");
            return;
          }

          // Lấy thông tin dòng đang chọn theo chuẩn Freestyle
          var oSelectedItem = this.byId("timesheetTable").getSelectedItem();
          var oContext = oSelectedItem.getBindingContext();

          // --- LẤY ĐỘNG TOÀN BỘ GIÁ TRỊ TỪ ROW ĐƯỢC CHỌN ---
          var sPernr = oContext.getProperty("Pernr");
          var oDate = oContext.getProperty("WorkDate");
          var sShiftId = oContext.getProperty("ShiftId");

          // Kiểm tra phòng hờ nếu dữ liệu dòng chọn bị thiếu trường bắt buộc
          if (!sPernr || !oDate || !sShiftId) {
            sap.m.MessageBox.error(
              "Không thể xác định thông tin dòng được chọn. Vui lòng thử lại!",
            );
            sap.ui.core.BusyIndicator.hide();
            return;
          }

          // Định dạng lại ngày công sang chuỗi yyyy-MM-ddTHH:mm:ss khớp chuẩn OData Key
          var sYear = oDate.getFullYear();
          var sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
          var sDay = String(oDate.getDate()).padStart(2, "0");
          var sFormattedDate = sYear + "-" + sMonth + "-" + sDay + "T00:00:00";

          var sBoundPath = "/createReport";
          // Hàm biến đổi giờ sang định dạng OData V2 Edm.Time
          var formatTimeForODataV2 = function (sTime) {
            if (!sTime) return null;
            var aParts = sTime.split(":");
            var iMs =
              (parseInt(aParts[0], 10) * 3600 +
                parseInt(aParts[1], 10) * 60 +
                parseInt(aParts[2], 10)) *
              1000;
            return { __edmType: "Edm.Time", ms: iMs };
          };

          // Bật màn hình chờ Loading
          BusyIndicator.show(0);
          // Gọi Action Function Import xuống Backend RAP
          oModel.callFunction(sBoundPath, {
            method: "POST",
            urlParameters: {
              Pernr: sPernr,
              WorkDate: oDate,
              ShiftId: sShiftId,

              // 4 tham số nội dung phải viết THƯỜNG toàn bộ
              request_type: sRequestType,
              proposed_in: formatTimeForODataV2(sProposedIn),
              proposed_out: formatTimeForODataV2(sProposedOut),
              ot_hours: sRequestType === "OVERTIME" ? fOTHours : 0,
              employee_comment: sEmployeeComment,
            },
            success: function (oData, response) {
              BusyIndicator.hide();
              MessageToast.show("Đơn giải trình đã gửi thành công!");
              oDialog.close();

              oView.byId("tpProposedIn").setValue("");
              oView.byId("tpProposedOut").setValue("");
              oView.byId("inputOTHours").setValue("");
              oView.byId("inputReason").setValue("");
              var oTable = this.byId("timesheetTable");
              var oBinding = oTable.getBinding("items");

              if (oBinding) {
                oBinding.refresh(true);
              }
            }.bind(this),

            error: function (oError) {
              BusyIndicator.hide();
              var sMsg = "Gửi thất bại!";
              try {
                var oErrObj = JSON.parse(oError.responseText);
                sMsg += " Lỗi: " + oErrObj.error.message.value;
              } catch (e) {}
              MessageBox.error(sMsg);
            },
          });
        },

        /**
         * 3. HÀM BẤM NÚT HỦY ĐÓNG POPUP
         */
        onCancelSubmit: function (oEvent) {
          oEvent.getSource().getParent().close();
        },
      },
    );
  },
);

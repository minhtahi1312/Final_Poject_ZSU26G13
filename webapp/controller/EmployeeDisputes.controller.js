sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/ui/model/json/JSONModel"
  ],
  function (
    Controller,
    MessageToast,
    MessageBox,
    BusyIndicator,
    Filter,
    FilterOperator,
    SelectDialog,
    StandardListItem,
    JSONModel
  ) {
    "use strict";

    return Controller.extend(
      "my.report.zmydisputes.controller.EmployeeDisputes",
      {
        onInit: function () {
          this.getOwnerComponent()
            .getRouter()
            .getRoute("EmployeeDisputes")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          var oTable = this.byId("disputesTable");

          if (!oTable) {
            return;
          }

          var oBinding = oTable.getBinding("items");

          if (oBinding) {
            oBinding.refresh(true);
          }
        },
        onRequestTypeValueHelp: function () {
          var oInput = this.byId("idDispRequestTypeFilter");
          var oModel = this.getView().getModel();

          BusyIndicator.show(0);

          // Đọc danh sách MyDisputes thực tế
          oModel.read("/MyDisputes", {
            urlParameters: {
              "$select": "RequestType" // Tối ưu chỉ chọn trường RequestType
            },
            success: function (oData) {
              BusyIndicator.hide();

              var aResults = oData.results || [];
              var aTypes = [];
              var mTypeMap = {};

              // A. Tùy chọn mặc định
              aTypes.push({
                Key: "",
                Title: "All Request Types",
                Description: "Show all records"
              });

              // B. Đưa các loại đơn thực tế từ DB vào danh sách
              aResults.forEach(function (item) {
                var sKey = item.RequestType;
                if (sKey && !mTypeMap[sKey]) {
                  mTypeMap[sKey] = true;
                  aTypes.push({
                    Key: sKey,
                    Title: sKey,
                    Description: "Request ID: " + sKey
                  });
                }
              });

              // C. Tự động kiểm tra và chèn thêm loại 'LEAVE' nếu DB chưa có
              if (!mTypeMap["LEAVE"]) {
                aTypes.push({
                  Key: "LEAVE",
                  Title: "LEAVE",
                  Description: "Leave Request"
                });
              }

              // Khởi tạo SelectDialog F4 Value Help
              var oValueHelpDialog = new SelectDialog({
                title: "Select Request Type",
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
                    var sKey = oContext.getProperty("Key");

                    oInput.setValue(oSelectedItem.getTitle());
                    oInput.data("selectedKey", sKey);
                  }
                }
              });

              oValueHelpDialog.setModel(new JSONModel(aTypes));
              oValueHelpDialog.open();
            },
            error: function () {
              BusyIndicator.hide();
              MessageBox.error("Không thể tải danh sách loại đơn.");
            }
          });
        },

        /**
         * 2. HÀM XỬ LÝ LỌC KHI NHẤN "GO / SEARCH" TRÊN FILTERBAR
         */
        onSearch: function () {
          var aFilters = [];

          // A. Lọc theo Ngày làm việc (Dùng mốc 12:00 UTC chống nhảy ngày)
          var oDatePicker = this.byId("idDispWorkDateFilter");
          var dDate = oDatePicker.getDateValue();

          if (dDate) {
            var dFilterDate = new Date(
              Date.UTC(dDate.getFullYear(), dDate.getMonth(), dDate.getDate(), 12, 0, 0)
            );
            aFilters.push(new Filter("WorkDate", FilterOperator.EQ, dFilterDate));
          }

          // B. Lọc theo Loại yêu cầu từ Value Help
          var oRequestTypeInput = this.byId("idDispRequestTypeFilter");
          var sRequestTypeKey = oRequestTypeInput.data("selectedKey");

          if (sRequestTypeKey) {
            aFilters.push(new Filter("RequestType", FilterOperator.EQ, sRequestTypeKey));
          }

          // Áp dụng bộ lọc lên Bảng
          var oTable = this.byId("disputesTable");
          var oBinding = oTable.getBinding("items");
          if (oBinding) {
            oBinding.filter(aFilters);
          }
        },

        /**
         * 3. HÀM RESET BỘ LỌC SEARCH HELP
         */
        onReset: function () {
          this.byId("idDispWorkDateFilter").setDateValue(null);

          var oRequestTypeInput = this.byId("idDispRequestTypeFilter");
          oRequestTypeInput.setValue("");
          oRequestTypeInput.data("selectedKey", "");

          var oTable = this.byId("disputesTable");
          var oBinding = oTable.getBinding("items");
          if (oBinding) {
            oBinding.filter([]);
          }
        },
        formatEdmTime: function (oTime) {
          if (!oTime || oTime.ms === undefined) {
            return "";
          }

          var totalSeconds = Math.floor(oTime.ms / 1000);

          var hours = Math.floor(totalSeconds / 3600);
          var minutes = Math.floor((totalSeconds % 3600) / 60);
          var seconds = totalSeconds % 60;

          return (
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0")
          );
        },
        /**
         * Hàm xử lý Hủy đơn khiếu nại         */
        onCancelDispute: function (oEvent) {
          var that = this;
          var oModel = this.getView().getModel();
          var oTable = this.byId("disputesTable");
          var oSelectedItem = oTable.getSelectedItem();

          // Kiểm tra xem người dùng đã tick chọn dòng nào chưa
          if (!oSelectedItem) {
            MessageToast.show("Vui lòng chọn một dòng để hủy!");
            return;
          }

          // Lấy ra dữ liệu của dòng được tick chọn
          var oContext = oSelectedItem.getBindingContext();
          var oSelectedData = oContext.getObject();

          var sDisputeId = oSelectedData.DisputeId;
          var sStatus = oSelectedData.DisputeStatus;

          if (sStatus === "APPROVED") {
            sap.m.MessageBox.information(
              "Đơn này đã được phê duyệt nên không thể hủy.",
            );
            return;
          }

          if (sStatus === "REJECTED") {
            sap.m.MessageBox.information(
              "Đơn này đã bị từ chối nên không thể hủy.",
            );
            return;
          }

          if (sStatus === "CANCELLED") {
            sap.m.MessageBox.information("Đơn này đã được hủy trước đó.");
            return;
          }

          if (sStatus !== "PENDING") {
            sap.m.MessageBox.information(
              "Đơn này đã được xử lý nên không thể hủy.",
            );
            return;
          }

          // Bật màn hình chờ loading
          oModel.callFunction("/cancelReport", {
            method: "POST",
            urlParameters: {
              DisputeId: sDisputeId,
            },

            success: function () {
              BusyIndicator.hide();

              MessageToast.show("Hủy đơn thành công!");

              var oTable = that.byId("disputesTable");
              var oBinding = oTable.getBinding("items");

              if (oBinding) {
                oBinding.refresh(true);
              }
            },

            error: function () {
              BusyIndicator.hide();

              MessageToast.show("Có lỗi xảy ra khi hủy đơn!");
            },
          });
        },
      },
    );
  },
);

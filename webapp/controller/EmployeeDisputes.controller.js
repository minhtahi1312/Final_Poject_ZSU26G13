sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator",
  ],
  function (Controller, MessageToast, BusyIndicator) {
    "use strict";

    return Controller.extend(
      "my.report.zmydisputes.controller.EmployeeDisputes",
      {
        onInit: function () {
          // Khởi tạo OData Model tự động nhận từ manifest
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
          BusyIndicator.show(0);

          // Gọi Function Import xuống Backend
          oModel.callFunction("/cancelReport", {
            method: "POST",
            urlParameters: {
              DisputeId: sDisputeId,
            },
            success: function () {
              BusyIndicator.hide();
              MessageToast.show("Hủy đơn thành công!");
              oModel.refresh(true);
            },
            error: function (oError) {
              BusyIndicator.hide();
              MessageToast.show("Có lỗi xảy ra khi hủy đơn!");
            },
          });
        },
      },
    );
  },
);

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageToast, BusyIndicator) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.EmployeeDisputes", {
        
        onInit: function () {
            // Khởi tạo OData Model tự động nhận từ manifest
        },

        /**
         * Hàm xử lý Hủy đơn khiếu nại (Chuyển từ code cũ sang)
         */
        onCancelDispute: function (oEvent) {
            var oModel = this.getView().getModel();
            var oTable = this.byId("disputesTable"); // Lấy trực tiếp qua ID bảng cho chuẩn Freestyle
            var oSelectedItem = oTable.getSelectedItem(); // Lấy dòng đang được tick chọn công khai

            // Kiểm tra xem người dùng đã tick chọn dòng nào chưa
            if (!oSelectedItem) {
                MessageToast.show("Vui lòng chọn một dòng để hủy!");
                return;
            }

            // Lấy ra dữ liệu và mã GUID của dòng được tick chọn
            var oContext = oSelectedItem.getBindingContext();
            var oSelectedData = oContext.getObject();
            var sDisputeId = oSelectedData.DisputeId;

            // Bật màn hình chờ loading
            BusyIndicator.show(0);

            // Gọi hàm Function Import / Action một cách chính ngạch xuống execute_action ở Backend
            oModel.callFunction("/cancelReport", {
                method: "POST",
                urlParameters: {
                    "DisputeId": sDisputeId
                },
                success: function (oData, response) {
                    BusyIndicator.hide();
                    MessageToast.show("Hủy đơn khiếu nại thành công!");
                    oModel.refresh(true); // Tải lại bảng dữ liệu để cập nhật trạng thái mới
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    MessageToast.show("Có lỗi xảy ra khi hủy đơn!");
                }
            });
        }
    });
});
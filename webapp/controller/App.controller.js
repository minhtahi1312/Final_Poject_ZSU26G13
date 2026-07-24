sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.App", {
        onInit: function () {
            // Lấy bộ định tuyến (Router) từ Component hệ thống
            this.oRouter = this.getOwnerComponent().getRouter();
        },

        // Hàm ẩn/hiện nhanh thanh menu bên trái khi bấm nút ba sọc
        onSideNavButtonPress: function () {
            var oToolPage = this.byId("toolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        // Hàm xử lý khi chọn các mục trên menu để nhảy trang
        onSideItemSelect: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            
            if (sKey === "myCalendar") {
                this.oRouter.navTo("EmployeeCalendar");
            } else if (sKey === "myTimesheet") {
                this.oRouter.navTo("EmployeeTimesheet");
            } else if (sKey === "myDisputes") { 
                this.oRouter.navTo("EmployeeDisputes");
            }
        }
    });
});
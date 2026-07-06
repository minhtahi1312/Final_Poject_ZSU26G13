sap.ui.define([
    "sap/ui/core/UIComponent"
], function (UIComponent) {
    "use strict";

    return UIComponent.extend("my.report.zmydisputes.Component", {

        metadata: {
            manifest: "json"
        },

        /**
         * Hàm khởi tạo của Ứng dụng Freestyle
         */
        init: function () {
            // Gọi hàm init của lớp cha UIComponent
            UIComponent.prototype.init.apply(this, arguments);

            // Kích hoạt hệ thống định tuyến (Router) tự động dựa trên manifest.json
            this.getRouter().initialize();
        }
    });
});
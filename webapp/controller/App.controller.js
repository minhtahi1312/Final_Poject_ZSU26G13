sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.App", {
        
        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
        },

        // Toggle side menu collapse/expand
        onSideNavButtonPress: function () {
            var oToolPage = this.byId("toolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        // Handle navigation from side menu
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
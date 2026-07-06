sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox"
], function (Controller, JSONModel, BusyIndicator, MessageBox) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.EmployeeCalendar", {
        
        onInit: function () {
            // Đặt ngày mốc mặc định ban đầu hiển thị trên bộ lịch cá nhân
            var oCustomModel = new JSONModel({
                currentDate: new Date(2026, 6, 5) // Khớp đúng ngày mẫu 05/07/2026 trong ABAP Class
            });
            this.getView().setModel(oCustomModel, "$custom");

            // KÍCH HOẠT LUỒNG ÉP CHẠY: Lắng nghe sự kiện Router mỗi khi nhảy vào trang Lịch
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("EmployeeCalendar").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Hàm tự động chạy khi Route "EmployeeCalendar" được khớp
         */
        _onRouteMatched: function () {
            // Ép hệ thống kích hoạt lệnh gọi OData gửi xuống Network
            this._loadCalendarData();
        },

        /**
         * Hàm đọc dữ liệu thực tế từ OData
         */
        _loadCalendarData: function () {
            var oView = this.getView();
            var oModel = oView.getModel(); // Đọc OData Model mặc định từ manifest
            
            if (!oModel) {
                return;
            }

            BusyIndicator.show(0);
            var that = this; 

            var aFilters = [
                new sap.ui.model.Filter("Pernr", sap.ui.model.FilterOperator.EQ, "00000001") // Sau này thay bằng biến lấy từ User đăng nhập
            ];

            // Gọi tập thực thể OtPlan (Đúng theo file Metadata bạn cung cấp)
            oModel.read("/OtPlan", {
                filters: aFilters, // Truyền bộ lọc vào đây
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
                        var dPlanDate = new Date(dRawDate.getTime() + dRawDate.getTimezoneOffset() * 60000);

                        // --- THAY ĐỔI TẠI ĐÂY: KHỞI TẠO GIỜ ĐỘNG THEO CẤU HÌNH SAP BẢNG ZTA_SCHEDULE ---
                        var iStartHour = 8, iStartMin = 0, iEndHour = 17, iEndMin = 0;
                        var sShiftName = "Ca làm việc: " + item.ShiftId;
                        var sColorType = "Type10"; // Màu xám mặc định cho ca lạ
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

                        // 3. Tự động ánh xạ Tên và Màu sắc theo Mã ca bạn thiết lập
                        if (item.ShiftId === "CA_01") {
                            sShiftName = "Ca 1 - Ca Sáng";
                            sColorType = "Type01"; // Màu cam sáng
                        } else if (item.ShiftId === "CA_02") {
                            sShiftName = "Ca 2 - Ca Chiều";
                            sColorType = "Type04"; // Màu xanh lá
                        } else if (item.ShiftId === "CA_03") {
                            sShiftName = "Ca 3 - Ca Đêm";
                            sColorType = "Type06"; // Màu tím ca đêm
                            
                            // Cơ chế tự động bật cờ qua ngày nếu giờ ra nhỏ hơn giờ vào (VD: vào 23:00, ra 07:00)
                            if (iEndHour < iStartHour) {
                                iNextDayOffset = 1;
                            }
                        } else if (item.ShiftId === "HC") {
                            sShiftName = "Ca Hành Chính";
                            sColorType = "Type11"; // Màu xanh dương hành chính
                        }

                        // Gán mốc thời gian động bốc từ SAP Database
                        var dStartDate = new Date(dPlanDate.getFullYear(), dPlanDate.getMonth(), dPlanDate.getDate(), iStartHour, iStartMin, 0);
                        var dEndDate = new Date(dPlanDate.getFullYear(), dPlanDate.getMonth(), dPlanDate.getDate() + iNextDayOffset, iEndHour, iEndMin, 0);

                        var oAppointment = {
                            ShiftId: item.ShiftId,
                            ShiftName: sShiftName,
                            ColorType: sColorType,
                            StartDate: dStartDate,
                            EndDate: dEndDate
                        };

                        if (!oGroupedData[sPernr]) {
                            oGroupedData[sPernr] = {
                                Pernr: sPernr,
                                EmployeeName: item.EmployeeName ? item.EmployeeName : "Nhân viên: " + sPernr,
                                DeptId: item.DeptId ? item.DeptId : "1000",
                                Appointments: []
                            };
                        }
                        oGroupedData[sPernr].Appointments.push(oAppointment);
                    });

                    var oCalendarModel = new JSONModel({
                        CalendarRows: Object.values(oGroupedData)
                    });
                    
                    oView.setModel(oCalendarModel, "calendarModel"); 
                },
                
                error: function (oError) {
                    BusyIndicator.hide();
                    MessageBox.error("Không thể tải dữ liệu từ tập thực thể OtPlan!");
                }
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

            var dStart = oAppointment.getStartDate();
            var dEnd = oAppointment.getEndDate();

            var sLogDate = dStart.getDate().toString().padStart(2, '0') + "/" + 
                           (dStart.getMonth() + 1).toString().padStart(2, '0') + "/" + 
                           dStart.getFullYear();
            var sLogStart = dStart.getHours().toString().padStart(2, '0') + ":" + dStart.getMinutes().toString().padStart(2, '0');
            var sLogEnd = dEnd.getHours().toString().padStart(2, '0') + ":" + dEnd.getMinutes().toString().padStart(2, '0');

            var sPath = oAppointment.getBindingContext("calendarModel").getPath();
            var oModel = this.getView().getModel("calendarModel");
            var oRowData = oModel.getProperty(sPath); 

            // ĐỌC THÔNG TIN ĐỘNG: Lấy ShiftName trực tiếp từ Object dữ liệu gốc đã gán thay vì text tĩnh
            var oAppointmentContext = oAppointment.getBindingContext("calendarModel");
            var sDynamicShiftName = oModel.getProperty(oAppointmentContext.getPath() + "/ShiftName");

            var sDetailMessage = " Mã kíp ca: " + oAppointment.getTitle() + "\n" +
                                 " Tên ca: " + sDynamicShiftName + "\n" +
                                 " Ngày làm việc: " + sLogDate + "\n" +
                                 " Thời gian: từ " + sLogStart + " đến " + sLogEnd + "\n\n" +
                                 " Nhân viên: " + oRowData.EmployeeName + " (MSNV: " + oRowData.Pernr + ")\n" +
                                 " Phòng ban / Nhà máy: " + oRowData.DeptId;

            MessageBox.information(sDetailMessage, {
                title: "Chi Tiết Ca Làm Việc Cá Nhân"
            });
        }
    });
});
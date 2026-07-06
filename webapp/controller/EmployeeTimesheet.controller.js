sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], function (Controller, Fragment, MessageToast, MessageBox, BusyIndicator) {
    "use strict";

    return Controller.extend("my.report.zmydisputes.controller.EmployeeTimesheet", {

        onInit: function () {
            // Khởi tạo tự động nhận OData Model mặc định từ manifest
        },

        formatEdmTime: function (oTime) {
            if (!oTime || oTime.ms === undefined) {
                return "";
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
                    controller: this
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
            var sRequestType     = oView.byId("selectRequestType").getSelectedKey();
            var sProposedIn      = oView.byId("tpProposedIn").getValue();
            var sProposedOut     = oView.byId("tpProposedOut").getValue();
            var sEmployeeComment = oView.byId("inputReason").getValue();

            if (!sProposedIn || !sProposedOut || !sEmployeeComment) {
                MessageBox.warning("Vui lòng nhập đầy đủ thông tin bắt buộc!");
                return;
            }

            // Lấy thông tin dòng đang chọn theo chuẩn Freestyle
            var oTable = this.byId("timesheetTable");
            var oSelectedItem = oTable.getSelectedItem();
            
            var oContext         = oSelectedItem.getBindingContext();
            var sPersonnelNumber = oContext.getProperty("PersonnelNumber");
            var oWorkDate        = oContext.getProperty("WorkDate");
            var sSequenceNumber  = oContext.getProperty("SequenceNumber"); 

            // Hàm biến đổi giờ sang định dạng OData V2 Edm.Time
            var formatTimeForODataV2 = function (sTime) {
                if (!sTime) return null;
                var aParts = sTime.split(":");
                var iMs = (parseInt(aParts[0], 10) * 3600 + parseInt(aParts[1], 10) * 60 + parseInt(aParts[2], 10)) * 1000;
                return { __edmType: "Edm.Time", ms: iMs };
            };

            // Bật màn hình chờ Loading
            BusyIndicator.show(0);

            // Gọi Action Function Import xuống Backend RAP
            oModel.callFunction("/createReport", {
                method: "POST",
                functionParameters: {
                    PersonnelNumber:  sPersonnelNumber,
                    WorkDate:         oWorkDate,
                    SequenceNumber:   sSequenceNumber, 
                    request_type:     sRequestType,
                    proposed_in:      formatTimeForODataV2(sProposedIn),
                    proposed_out:     formatTimeForODataV2(sProposedOut),
                    employee_comment: sEmployeeComment
                },
                success: function (oData, response) {
                    BusyIndicator.hide();
                    MessageToast.show("Đơn giải trình đã gửi thành công!");
                    oDialog.close();

                    // Xóa sạch dữ liệu trên form để lần sau nhập tiếp
                    oView.byId("tpProposedIn").setValue("");
                    oView.byId("tpProposedOut").setValue("");
                    oView.byId("inputReason").setValue("");

                    oModel.refresh(true); // Tải lại bảng Timesheet để cập nhật thông tin
                }.bind(this),

                error: function (oError) {
                    BusyIndicator.hide();
                    var sMsg = "Gửi thất bại!";
                    try {
                        var oErrObj = JSON.parse(oError.responseText);
                        sMsg += " Lỗi: " + oErrObj.error.message.value;
                    } catch (e) { }
                    MessageBox.error(sMsg);
                }
            });
        },

        /**
         * 3. HÀM BẤM NÚT HỦY ĐÓNG POPUP
         */
        onCancelSubmit: function (oEvent) {
            oEvent.getSource().getParent().close();
        }
    });
});
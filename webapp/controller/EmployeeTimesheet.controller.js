sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
  ],
  function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox,
    BusyIndicator,
    Filter,
    FilterOperator,
    Sorter,
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

        _getI18nText: function (sKey, aArgs) {
          return this.getView()
            .getModel("i18n")
            .getResourceBundle()
            .getText(sKey, aArgs);
        },

        _onRouteMatched: function () {
          var oTable = this.byId("timesheetTable");

          if (!oTable) {
            return;
          }

          var oBinding = oTable.getBinding("items");

          if (oBinding) {
            var oSorter = new sap.ui.model.Sorter("WorkDate", true);

            oBinding.sort(oSorter);

            oBinding.refresh(true);
          }
        },

        // =========================================================
        // FILTERING & VALUE HELPS
        // =========================================================
        formatStatusState: function (sStatus) {
          switch (sStatus) {
            case "COMPLETE":
            case "COMPLETED":
            case "APPROVED":
              return "Success";
            case "ABSENT":
            case "REJECTED":
              return "Error";
            case "WARNING":
            case "EARLY_OUT":
              return "Warning";
            case "LEAVE":
              return "Information";
            case "CHECK_IN":
            default:
              return "None";
          }
        },

        formatStatusIcon: function (sStatus) {
          switch (sStatus) {
            case "COMPLETE":
            case "COMPLETED":
            case "APPROVED":
              return "sap-icon://accept";
            case "ABSENT":
            case "REJECTED":
              return "sap-icon://alert";
            case "WARNING":
            case "EARLY_OUT":
              return "sap-icon://message-warning";
            case "CHECK_IN":
              return "sap-icon://sys-enter-2";
            case "LEAVE":
              return "sap-icon://away";
            default:
              return "";
          }
        },
        onStatusValueHelp: function () {
          var oInput = this.byId("idStatusFilter");
          var oModel = this.getView().getModel();
          var that = this;

          BusyIndicator.show(0);

          oModel.read("/WorkingTime", {
            success: function (oData) {
              BusyIndicator.hide();
              var aResults = oData.results || [];
              var aUniqueStatus = [];
              var mStatusMap = {};

              aUniqueStatus.push({
                Key: "",
                Title: that._getI18nText("txtAllStatus"),
                Description: that._getI18nText("txtShowAll"),
              });

              aResults.forEach(function (item) {
                if (item.status && !mStatusMap[item.status]) {
                  mStatusMap[item.status] = true;
                  aUniqueStatus.push({
                    Key: item.status,
                    Title: item.status,
                    Description: that._getI18nText("txtStatusPrefix", [
                      item.status,
                    ]),
                  });
                }
              });

              var oValueHelpDialog = new SelectDialog({
                title: that._getI18nText("titleSelectStatus"),
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
                    var sKey = oSelectedItem
                      .getBindingContext()
                      .getProperty("Key");
                    if (!sKey) {
                      // Khi bấm chọn "All Status"
                      oInput.setValue("");
                      oInput.data("selectedKey", "");
                    } else {
                      oInput.setValue(oSelectedItem.getTitle());
                      oInput.data("selectedKey", sKey);
                    }
                    that.onSearch();
                  }
                },
              });

              oValueHelpDialog.setModel(new JSONModel(aUniqueStatus));
              oValueHelpDialog.open();
            },
            error: function (oError) {
              BusyIndicator.hide();
              MessageBox.error(that._getI18nText("msgLoadStatusError"));
            },
          });
        },

        onSearch: function () {
          var aFilters = [];
          var dDate = this.byId("idWorkDateFilter").getDateValue();

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

          var oStatusInput = this.byId("idStatusFilter");
          var sStatusKey = oStatusInput.data("selectedKey");

          if (sStatusKey) {
            aFilters.push(new Filter("status", FilterOperator.EQ, sStatusKey));
          }

          var oBinding = this.byId("timesheetTable").getBinding("items");

          if (oBinding) {
            // Filter
            oBinding.filter(aFilters);
            oBinding.sort(new Sorter("WorkDate", true));
          }
        },

        onReset: function () {
          this.byId("idWorkDateFilter").setDateValue(null);

          var oStatusInput = this.byId("idStatusFilter");
          oStatusInput.setValue("");
          oStatusInput.data("selectedKey", "");

          var oBinding = this.byId("timesheetTable").getBinding("items");

          if (oBinding) {
            oBinding.filter([]);
            oBinding.sort(new Sorter("WorkDate", true));
          }
        },

        formatEdmTime: function (oTime) {
          if (
            !oTime ||
            typeof oTime !== "object" ||
            oTime.ms === undefined ||
            oTime.ms === null
          ) {
            return "--:--:--";
          }
          var iTotalSeconds = Math.floor(oTime.ms / 1000);
          var iHours = Math.floor(iTotalSeconds / 3600);
          var iMinutes = Math.floor((iTotalSeconds % 3600) / 60);
          var iSeconds = iTotalSeconds % 60;

          return (
            String(iHours).padStart(2, "0") +
            ":" +
            String(iMinutes).padStart(2, "0") +
            ":" +
            String(iSeconds).padStart(2, "0")
          );
        },

        onRequestTypeChange: function (oEvent) {
          var sKey = oEvent.getSource().getSelectedKey();

          var bRemoveWarning = sKey === "REMOVE_WAR";
          var bOvertime = sKey === "OVERTIME";

          this.byId("lblProposedIn").setVisible(!bRemoveWarning);
          this.byId("tpProposedIn").setVisible(!bRemoveWarning);

          this.byId("lblProposedOut").setVisible(!bRemoveWarning);
          this.byId("tpProposedOut").setVisible(!bRemoveWarning);

          this.byId("vbOTSection").setVisible(bOvertime);
        },

        onPressSubmitDispute: function () {
          var oView = this.getView();
          var oSelectedItem = this.byId("timesheetTable").getSelectedItem();

          if (!oSelectedItem) {
            MessageBox.error(this._getI18nText("msgSelectRowToDispute"));
            return;
          }

          var oContext = oSelectedItem.getBindingContext();
          var oActIn = oContext.getProperty("ActIn");
          var oActOut = oContext.getProperty("ActOut");

          var sFormattedIn = this.formatEdmTime(oActIn);
          var sFormattedOut = this.formatEdmTime(oActOut);

          if (sFormattedIn === "--:--:--") {
            sFormattedIn = "";
          }
          if (sFormattedOut === "--:--:--") {
            sFormattedOut = "";
          }

          var sFragmentName = "my.report.zmydisputes.view.DisputeDialog";
          var that = this;

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
            // 3. Tự động điền giờ của dòng được chọn vào form trước khi hiển thị popup
            oView.byId("tpProposedIn").setValue(sFormattedIn);
            oView.byId("tpProposedOut").setValue(sFormattedOut);

            // Reset các trường nhập lý do & OT về trạng thái ban đầu
            oView.byId("inputReason").setValue("");
            oView.byId("inputOTHours").setValue("");

            // Cập nhật lại trạng thái hiển thị
            that.onRequestTypeChange({
              getSource: function () {
                return oView.byId("selectRequestType");
              },
            });

            oDialog.open();
          });
        },

        onConfirmSubmit: function (oEvent) {
          var oDialog = oEvent.getSource().getParent();
          var oView = this.getView();
          var oModel = oView.getModel();
          var that = this;

          // Lấy dữ liệu từ form trong Fragment
          var sRequestType = oView.byId("selectRequestType").getSelectedKey();
          var sProposedIn = oView.byId("tpProposedIn").getValue();
          var sProposedOut = oView.byId("tpProposedOut").getValue();
          var fOTHours = parseFloat(oView.byId("inputOTHours").getValue()) || 0;
          var sEmployeeComment = oView.byId("inputReason").getValue();

          if (sRequestType === "REMOVE_WAR") {
            if (!sEmployeeComment) {
              MessageBox.warning(this._getI18nText("msgFillMandatory"));
              return;
            }
          } else {
            if (!sProposedIn || !sProposedOut || !sEmployeeComment) {
              MessageBox.warning(this._getI18nText("msgFillMandatory"));
              return;
            }
          }
          if (sRequestType === "OVERTIME" && fOTHours <= 0) {
            MessageBox.warning(this._getI18nText("msgEnterOtHours"));
            return;
          }

          var oContext = this.byId("timesheetTable")
            .getSelectedItem()
            .getBindingContext();

          var sPernr = oContext.getProperty("Pernr");
          var oDate = oContext.getProperty("WorkDate");
          var sShiftId = oContext.getProperty("ShiftId");

          var oActIn = oContext.getProperty("ActIn");
          var oActOut = oContext.getProperty("ActOut");

          if (!sPernr || !oDate || !sShiftId) {
            MessageBox.error(this._getI18nText("msgCannotIdentifyRow"));
            return;
          }

          var formatTimeForODataV2 = function (vTime) {
            if (!vTime) {
              return null;
            }

            // Nếu dữ liệu đã là Edm.Time
            if (typeof vTime === "object" && vTime.ms !== undefined) {
              return {
                __edmType: "Edm.Time",
                ms: vTime.ms,
              };
            }

            // Nếu dữ liệu là chuỗi HH:mm:ss
            if (typeof vTime === "string") {
              var aParts = vTime.split(":");
              var iHours = parseInt(aParts[0], 10) || 0;
              var iMinutes = parseInt(aParts[1], 10) || 0;
              var iSeconds = parseInt(aParts[2], 10) || 0;
              var iMs = (iHours * 3600 + iMinutes * 60 + iSeconds) * 1000;
              return {
                __edmType: "Edm.Time",
                ms: iMs,
              };
            }
            return null;
          };
          BusyIndicator.show(0);
          oModel.callFunction("/createReport", {
            method: "POST",
            urlParameters: {
              Pernr: sPernr,
              WorkDate: oDate,
              ShiftId: sShiftId,
              request_type: sRequestType,
              proposed_in:
                sRequestType === "REMOVE_WAR"
                  ? formatTimeForODataV2(oActIn)
                  : formatTimeForODataV2(sProposedIn),
              proposed_out:
                sRequestType === "REMOVE_WAR"
                  ? formatTimeForODataV2(oActOut)
                  : formatTimeForODataV2(sProposedOut),
              ot_hours: sRequestType === "OVERTIME" ? fOTHours : 0,
              employee_comment: sEmployeeComment,
            },

            success: function () {
              BusyIndicator.hide();
              MessageToast.show(that._getI18nText("msgDisputeSuccess"));
              oDialog.close();

              oView.byId("tpProposedIn").setValue("");
              oView.byId("tpProposedOut").setValue("");
              oView.byId("inputOTHours").setValue("");
              oView.byId("inputReason").setValue("");
              oView.byId("selectRequestType").setSelectedKey("");
              oView.byId("lblProposedIn").setVisible(true);
              oView.byId("tpProposedIn").setVisible(true);
              oView.byId("lblProposedOut").setVisible(true);
              oView.byId("tpProposedOut").setVisible(true);
              oView.byId("vbOTSection").setVisible(false);
              var oBinding = that.byId("timesheetTable").getBinding("items");

              if (oBinding) {
                oBinding.refresh(true);
              }
            },

            error: function (oError) {
              BusyIndicator.hide();
              var sMsg = that._getI18nText("msgDisputeSubmitError");
              try {
                var oErrObj = JSON.parse(oError.responseText);
                sMsg += " " + oErrObj.error.message.value;
              } catch (e) {}
              MessageBox.error(sMsg);
            },
          });
        },

        onCancelSubmit: function (oEvent) {
          oEvent.getSource().getParent().close();
        },
      },
    );
  },
);

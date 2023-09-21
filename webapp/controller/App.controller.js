sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/sharedLibrary"
], function (BaseController, JSONModel, sharedLibrary) {
    "use strict";

    return BaseController.extend("zslpmcrprb.controller.App", {

        onInit: function () {
            var oViewModel,
                fnSetAppNotBusy,
                iOriginalBusyDelay = this.getView().getBusyIndicatorDelay(),
                t = this;

            oViewModel = new JSONModel({
                busy: true,
                delay: 0,
                layout: "OneColumn",
                previousLayout: "",
                actionButtonsInfo: {
                    midColumn: {
                        fullScreen: false
                    }
                }
            });
            this.setModel(oViewModel, "appView");

            fnSetAppNotBusy = function () {
                oViewModel.setProperty("/busy", false);
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            };

            // since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
            this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy);
            this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

            // apply content density mode to root view
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());


            // Getting execution context

            this._getExecutionContext(function () {

                // Prepare model to use in other parts of application

                var oExecutionContext = new sap.ui.model.json.JSONModel({

                    SystemUser: t.oSystemUser

                });

                // Setting execution context for whole application

                t.getOwnerComponent().setModel(oExecutionContext, "executionContext");

                // User is authorized to create problems on behalf of customers

                if (t.oSystemUser.AuthorizedToCreateProblemOnBehalf) {


                    // Preparing additional models

                    t._getListOfCompanies(function () {

                        var oCompaniesList = new sap.ui.model.json.JSONModel({

                            CompaniesList: t.oCompaniesList

                        });

                        t.getOwnerComponent().setModel(oCompaniesList, "companiesList");

                    });
                }

            });

            // Getting application configuration

            this._getApplicationConfiguration(function () {

                var oApplicationConfiguration = new sap.ui.model.json.JSONModel({

                    ApplicationConfiguration: t.oApplicationConfiguration

                });

                t.getOwnerComponent().setModel(oApplicationConfiguration, "applicationConfiguration");

            });


            // Getting frontend constants

            this._getFrontendConstants(function () {

                var oFrontendConstants = new sap.ui.model.json.JSONModel({

                    FrontendConstants: t.oFrontendConstants

                });

                t.getOwnerComponent().setModel(oFrontendConstants, "frontendConstants");

            });

        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
        * Get frontend constants
        */

        _getFrontendConstants: function (callback) {

            var t = this,
                sErroneousExecutionText = this.getResourceBundle().getText("oDataModelReadFailure");

            sharedLibrary.readEntity("FrontendConstants", sErroneousExecutionText, this, false, true, function (oData) {
                t.oFrontendConstants = oData;

                return callback();

            });

        },

        /**
        * Get application configuration
        */
        _getApplicationConfiguration: function (callback) {

            var t = this,
                sErroneousExecutionText = this.getResourceBundle().getText("oDataModelReadFailure");

            sharedLibrary.readEntityWithFilter("FrontendConfiguration", "Application eq 'zslpmcrprb'", sErroneousExecutionText, this, false, true, function (oData) {
                t.oApplicationConfiguration = oData;
                return callback();

            });
        },

        /**
        * Get list of companies
        */
        _getListOfCompanies: function (callback) {


            var t = this,
                sErroneousExecutionText = this.getResourceBundle().getText("oDataModelReadFailure");

            sharedLibrary.readEntity("Company", sErroneousExecutionText, this, false, false, function (oData) {
                t.oCompaniesList = oData.results;
                return callback();

            });

        },
        /**
        * Get execution context
        */
        _getExecutionContext: function (callback) {

            var t = this,
                sErroneousExecutionText = this.getResourceBundle().getText("oDataModelReadFailure");

            sharedLibrary.readEntity("SystemUser", sErroneousExecutionText, this, false, true, function (oData) {
                t.oSystemUser = oData.results[0];

                if (!t.oSystemUser.AuthorizedToCreateProblem) {

                    sap.m.MessageBox.error(t.getResourceBundle().getText("userNotAuthorizedToRunThisApp"));

                } else {

                    return callback();

                }



            });
        }

    });
});
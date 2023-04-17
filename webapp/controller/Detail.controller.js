// Constants classes

const textTypes = Object.freeze(
    class textTypes {
        static reply = 'SU01';
        static description = 'SU99';
        static reproductionSteps = 'SURS';
        static internalNote = 'SU04';
        static solution = 'SUSO';
        static businessConsequences = 'SUBI';
    });

const mandatoryInputFields = Object.freeze(
    class mandatoryInputFields {
        static mandatoryInputFields = [
            "tableGeneralDataItemInputName",
            "tableGeneralDataItemInputDescription",
            "tableGeneralDataItemInputReproduction",
            "tableGeneralDataItemInputBusinessImpact",
            "tableGeneralDataItemInputDate",
            "tableGeneralDataItemSelectPriority",
            "tableGeneralDataItemSelectSystem"];
    });

const emailAddressInputFields = Object.freeze(
    class emailAddressInputFields {
        static emailAddressInputFields = [
            "tableGeneralDataItemInputContactPersonEmail"];
    });

sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/library",
    "../utils/sharedLibrary",
    "sap/ui/core/library"
], function (BaseController, JSONModel, formatter, mobileLibrary, sharedLibrary, CoreLibrary) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;

    return BaseController.extend("yslpmcrprb.controller.Detail", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0
            });

            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

            this.setModel(oViewModel, "detailView");

            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

            this.oSemanticPage = this.byId("detailPage");

            this._clearProblemControls();

            // Getting  execution context from App.controller

            var oExecutionContext = this.getOwnerComponent().getModel("executionContext");

            // Current system user              

            this.oExecutionContext = oExecutionContext.oData;

            // Setting models to display user and company name + properties

            this.byId("tableGeneralDataCompanyStatic").setModel(oExecutionContext, "runtimeModel");
            this.byId("tableGeneralDataCompanyStaticMulti").setModel(oExecutionContext, "runtimeModel");

            this.byId("pageHeader").setModel(oExecutionContext, "runtimeModel");



            // Bus for events from a list
            var oEventBus = sap.ui.getCore().getEventBus();
            // 1. ChannelName, 2. EventName, 3. Function to be executed, 4. Listener
            oEventBus.subscribe("ListAction", "companyHasBeenSelected", this.onCompanyHasBeenSelected, this);


        },


        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
        * After form is rendered       
        *         
        */
        onAfterRendering: function () {


        },

        /**        
        * Before form is rendered       
        */
        onBeforeRendering: function () {



            this._setSystemSelection();




        },
        /**
        * Company has been selected on a list
        */
        onCompanyHasBeenSelected: function () {

            this._processCompanySelection();

            this.getModel().refresh();

        },

        /**
        * Upload completed
        */
        onUploadCompleted: function (oEvent) {
            var oUploadSet = this.byId("UploadSet");
            oUploadSet.removeAllIncompleteItems();
        },

        /**
        * Date changed
        */
        onDateChange: function (oEvent) {
            var ValueState = CoreLibrary.ValueState,

                oDP = oEvent.getSource(),
                bValid = oEvent.getParameter("valid");

            if (bValid) {
                oDP.setValueState(ValueState.None);
            } else {
                oDP.setValueState(ValueState.Error);
            }
        },

        /**
        * Send button pressed
        */
        onPressSend: function () {

            this._executeProblemCreation();

        },

        /**
        * Show Footer button pressed
        */
        onPressShowFooter: function () {

            this.oSemanticPage.setShowFooter(!this.oSemanticPage.getShowFooter());
        },

        /**
        * Binds the view to the object path and expands the aggregated line items.
        * @function
        * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
        * @private
        */
        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").objectId;
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getModel().metadataLoaded().then(function () {
                var sObjectPath = this.getModel().createKey("ProductSet", {
                    Guid: sObjectId
                });
                this._bindView("/" + sObjectPath);
            }.bind(this));
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearListListSelection();
                return;
            }

            var sPath = oElementBinding.getPath(),
                oResourceBundle = this.getResourceBundle(),
                oObject = oView.getModel().getObject(sPath),
                sObjectGuid = oObject.Guid,
                sObjectId = oObject.Guid,
                sObjectName = oObject.Id,
                oViewModel = this.getModel("detailView");

            this.Guid = sObjectGuid;
            this.ObjectId = sObjectId;
            this.Id = sObjectName;

            this.getOwnerComponent().oListSelector.selectAListItem(sPath);

            //  this._reloadPriorityCombobox();
        },

        _onMetadataLoaded: function () {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getModel("detailView");

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
       * Set system selector
       */
        _setSystemSelection: function () {


            // Model for list of systems            

            var oSystemsList = this.getOwnerComponent().getModel("systemSelectorModel"),
                oSelectedCompany = this.getOwnerComponent().getModel("selectedCompany");

            this.byId("tableGeneralDataItemSelectSystem").setModel(oSystemsList, "systemSelectorModel");

            if ((oSystemsList) && (oSystemsList.oData.SystemsList.length > 0)) {

                this.byId("tableGeneralDataItemSelectSystem").setProperty("enabled", true);

                var sCompanyName;

                if (this.oExecutionContext.SystemUser.AuthorizedToCreateProblemOnBehalf) {

                    sCompanyName = oSelectedCompany.oData.CompanyName;

                } else {

                    sCompanyName = this.oExecutionContext.SystemUser.CompanyName;

                }


                var sSystemSelectorText = this.getResourceBundle().getText("selectSystem", [sCompanyName,
                    oSystemsList.oData.SystemsList.length]);

                this.byId("tableGeneralDataItemSelectSystem").setPlaceholder(sSystemSelectorText);
            }

        },

        /**
       * Processing for a company selection
       */
        _processCompanySelection: function () {

            // Model for selected company

            var oSelectedCompany = this.getOwnerComponent().getModel("selectedCompany");
            this.byId("tableGeneralDataItemInputCompanyStaticMulti").setModel(oSelectedCompany, "selectedCompany");

            this._setSystemSelection();

        },


        /**
         * Get problem input fields
         */
        _getProblemInputFields: function () {

            var oProblemInputFields = {};
            oProblemInputFields.tableGeneralDataItemInputDate = this.byId("tableGeneralDataItemInputDate").getValue();
            oProblemInputFields.tableGeneralDataItemInputName = this.byId("tableGeneralDataItemInputName").getValue();
            oProblemInputFields.tableGeneralDataItemInputDescription = this.byId("tableGeneralDataItemInputDescription").getValue();
            oProblemInputFields.tableGeneralDataItemInputReproduction = this.byId("tableGeneralDataItemInputReproduction").getValue();
            oProblemInputFields.tableGeneralDataItemInputBusinessImpact = this.byId("tableGeneralDataItemInputBusinessImpact").getValue();
            oProblemInputFields.tableGeneralDataItemSelectPriority = this.byId("tableGeneralDataItemSelectPriority").getSelectedKey();
            oProblemInputFields.tableGeneralDataItemInputContactPersonEmail = this.byId("tableGeneralDataItemInputContactPersonEmail").getValue();
            oProblemInputFields.tableGeneralDataItemCheckboxUseContactPersonEmail = this.byId("tableGeneralDataItemCheckboxUseContactPersonEmail").getSelected();
            oProblemInputFields.tableGeneralDataItemContactPersonData = this.byId("tableGeneralDataItemContactPersonData").getValue();
            oProblemInputFields.tableGeneralDataItemSelectSystem = this.byId("tableGeneralDataItemSelectSystem").getSelectedKey();

            return oProblemInputFields;

        },

        /**
        * Clear problem controls
        */
        _clearProblemControls: function () {

            this.byId("tableGeneralDataItemInputDescription").setValue("");
            this.byId("tableGeneralDataItemInputReproduction").setValue("");
            this.byId("tableGeneralDataItemInputBusinessImpact").setValue("");
            this.byId("tableGeneralDataItemInputName").setValue("");
            this.byId("tableGeneralDataItemInputDate").setDateValue(new Date());
            this.byId("tableGeneralDataItemSelectPriority").setSelectedKey("");
            this.byId("tableGeneralDataItemSelectSystem").setSelectedKey("");
        },

        /**
        * Mandatory fields handling
        */
        _validateAndGetProblemFields: function () {

            var oProblemInputFields = this._getProblemInputFields(),
                oProblemInputFieldsValues = {},
                t = this;

            for (var key in oProblemInputFields) {

                var sFieldValue = oProblemInputFields[key];

                // Checking mandatory fields

                if ((!sFieldValue) && (mandatoryInputFields.mandatoryInputFields.includes(key))) {

                    sharedLibrary.setFieldErrorState(t, key);

                    return;

                } else {

                    sharedLibrary.dropFieldState(t, key);

                    oProblemInputFieldsValues[key] = sFieldValue;

                } // if (!sFieldValue)

                // Additional check for email fields

                if ((sFieldValue) && (emailAddressInputFields.emailAddressInputFields.includes(key))) {

                    if (!sharedLibrary.isValidEmailAddress(sFieldValue)) {

                        sap.m.MessageBox.error(this.getResourceBundle().getText("incorrectEmailFormat"));

                        sharedLibrary.setFieldErrorState(t, key);

                        return;

                    }

                }

            } // for (var key in mandatoryFields)

            return oProblemInputFieldsValues;

        }, // validateMandatoryFields

        /**
        * Creation of a problem text
        */
        _createProblemText: function (sGuid, sTextId, sText) {

            var oTextPayload = {};

            oTextPayload.Tdid = sTextId;
            oTextPayload.TextString = sText;

            sharedLibrary.createSubEntity("ProblemSet", sGuid, "Text", oTextPayload,
                null, this.getResourceBundle().getText("textCreationFailure"),
                this, function () { });
        },



        /**
        * Creation of a problem through OData
        */
        _createProblem: function () {

            var oProblemInputFields = this._validateAndGetProblemFields(),
                t = this;

            if (typeof oProblemInputFields !== "undefined") {

                var
                    sProblemDescriptionText = oProblemInputFields.tableGeneralDataItemInputDescription,
                    sProblemReproductionText = oProblemInputFields.tableGeneralDataItemInputReproduction,
                    sProblemBusinessImpactText = oProblemInputFields.tableGeneralDataItemInputBusinessImpact,
                    sProblemNameText = oProblemInputFields.tableGeneralDataItemInputName,
                    sProblemDate = oProblemInputFields.tableGeneralDataItemInputDate,
                    sProblemPriority = oProblemInputFields.tableGeneralDataItemSelectPriority,
                    sProblemContactPersonEmail = oProblemInputFields.tableGeneralDataItemInputContactPersonEmail,
                    bProblemUseContactPersonEmail = oProblemInputFields.tableGeneralDataItemCheckboxUseContactPersonEmail,
                    sProblemContactPersonDataText = oProblemInputFields.tableGeneralDataItemContactPersonData,
                    sProblemSystem = oProblemInputFields.tableGeneralDataItemSelectSystem,
                    oPayload = {};

                oPayload.Description = sProblemNameText;
                oPayload.PostingDate = sharedLibrary.convertStringDateToEpoch(sProblemDate);
                oPayload.ProductGuid = this.Guid;
                oPayload.ProductName = this.Id;
                oPayload.Priority = sProblemPriority;
                oPayload.ContactEmail = sProblemContactPersonEmail;
                oPayload.NotifyByContactEmail = bProblemUseContactPersonEmail;
                oPayload.SAPSystemName = sProblemSystem;


                if (this.oExecutionContext.SystemUser.AuthorizedToCreateProblemOnBehalf) {

                    // User authorized to create problems on behalf of Customer, so
                    // we take a company from a selection

                    this.oSelectedCompany = this.getOwnerComponent().getModel("selectedCompany");

                    oPayload.CompanyBusinessPartner = this.oSelectedCompany.oData.CompanyBusinessPartner;


                } else {

                    // User is not authorized to create problems on behalf of Customer, so
                    // we take a company from user profile

                    oPayload.CompanyBusinessPartner = this.oExecutionContext.SystemUser.CompanyBusinessPartner;
                }


                var oPage = this.byId("detailPage");

                oPage.setBusyIndicatorDelay(0);

                oPage.setBusy(true);

                sharedLibrary.createEntity("Problem", oPayload,
                    null, this.getResourceBundle().getText("problemCreationFailure"),
                    this, function (oData) {

                        var sGuid = oData.Guid;

                        // Setting description text with contact data


                        if (sProblemContactPersonDataText.length > 0) {

                            sProblemDescriptionText = sProblemDescriptionText + "\n" + "\n" +
                                t.getResourceBundle().getText("contactPersonData") + "\n" + "\n" + sProblemContactPersonDataText;

                        }

                        t._createProblemText(sGuid, textTypes.description, sProblemDescriptionText);

                        // Setting reproduction text

                        t._createProblemText(sGuid, textTypes.reproductionSteps, sProblemReproductionText);

                        // Setting Business Impact

                        t._createProblemText(sGuid, textTypes.businessConsequences, sProblemBusinessImpactText);


                        // Uploading attachments: removing dashes from Guid

                        t._uploadProblemAttachments(sGuid, function () {

                            var sSuccessText = t.getResourceBundle().getText("problemCreatedSuccessfully", oData.ObjectId);
                            oPage.setBusy(false);
                            t.getModel().refresh();
                            t._clearProblemControls();
                            sharedLibrary.informationAction(sSuccessText, function () {


                                // showing nothing on problem creation page until product is selected

                                t.getOwnerComponent().getRouter().navTo("list", {}, false);


                                // Whole page reload is required to re-build UploadSet control
                                // Without re-build the upload URL for some reason is not updated for
                                // GUID of a new problem (i.e. GUID is passed, but UploadSet uses old upload URL)
                                // in a case we need to create one more problem after a previous one

                                t._reloadPage();

                            });

                        });

                    });

                oPage.setBusy(false);

            } // if ( typeof oProblemInputFields !== "undefined" )
            else {

                sap.m.MessageBox.error(t.getResourceBundle().getText("mandatoryFieldsNotSet"));
            }

        },

        _reloadPage: function () {

            location.reload();
        },

        /**
        * Upload all incomplete problem attachments at once in a cycle
        */
        _uploadProblemAttachments: function (sGuid, callback) {

            var oUploadSet = this.byId("UploadSet"),
                sAttachmentUploadURL = "/ProblemSet(guid'" + sGuid + "')/Attachment",
                oItems = oUploadSet.getIncompleteItems();

            oUploadSet.setUploadUrl(sharedLibrary.getODataPath(this) + sAttachmentUploadURL);

            for (var k = 0; k < oItems.length; k++) {

                var oItem = oItems[k];
                var sFileName = oItem.getFileName();

                var oCustomerHeaderToken = new sap.ui.core.Item({
                    key: "x-csrf-token",
                    text: this.getModel().getSecurityToken()
                });

                // Header slug to store a file name
                var oCustomerHeaderSlug = new sap.ui.core.Item({
                    key: "slug",
                    text: sFileName
                });

                oUploadSet.addHeaderField(oCustomerHeaderToken);
                oUploadSet.addHeaderField(oCustomerHeaderSlug);
                oUploadSet.uploadItem(oItem);
                oUploadSet.removeAllHeaderFields();
            }

            callback();
        },

        /**
        * Create problem
        */
        _executeProblemCreation: function () {

            var sText = this.getResourceBundle().getText("confirmProblemPosting"),
                t = this;

            sharedLibrary.confirmAction(sText, function () {

                t._createProblem();

            });

        },

        /**
         * Binds the view to the object path. Makes sure that detail view displays
         * a busy indicator while data for the corresponding element binding is loaded.
         * @function
         * @param {string} sObjectPath path to the object to be bound to the view.
         * @private
         */
        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        /**
         * Toggle between full and non full screen mode.
         */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        }
    });

});
import { LightningElement, api, wire } from 'lwc';
import {
    getObjectInfo,
    getPicklistValuesByRecordType
} from 'lightning/uiObjectInfoApi';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

export default class DynamicDependentPicklist extends LightningElement {
    // -----------------------------
    // FLOW INPUTS
    // -----------------------------

    @api objectApiName;
    @api controllingFieldApiName;
    @api controllingValue;
    @api dependentFieldApiName;

    @api label = 'Select an option';
    @api placeholder = 'Select...';
    @api required = false;
    @api messageWhenValueMissing = 'Complete this field.';

    // Optional in Field Dependency mode.
    // Required in Record Type mode.
    @api recordTypeId;

    // -----------------------------
    // FLOW OUTPUT
    // -----------------------------

    _selectedValue;

    @api
    get selectedValue() {
        return this._selectedValue;
    }

    set selectedValue(value) {
        this._selectedValue = value;
    }

    // -----------------------------
    // INTERNAL STATE
    // -----------------------------

    options = [];
    errorMessage;
    resolvedRecordTypeId;
    objectInfo;

    // -----------------------------
    // MODE
    // -----------------------------

    get isFieldDependencyMode() {
        return !!(
            this.controllingFieldApiName ||
            this.controllingValue
        );
    }

    get isRecordTypeMode() {
        return !this.isFieldDependencyMode;
    }

    // -----------------------------
    // OBJECT METADATA
    // -----------------------------

    @wire(getObjectInfo, {
        objectApiName: '$objectApiName'
    })
    wiredObjectInfo({ data, error }) {
        if (data) {
            this.objectInfo = data;
            this.errorMessage = null;

            this.resolvedRecordTypeId =
                this.recordTypeId || data.defaultRecordTypeId;

            this.validateFieldConfiguration();
        } else if (error) {
            this.objectInfo = null;
            this.options = [];

            this.errorMessage = this.getErrorMessage(
                error,
                'Unable to load object information.'
            );
        }
    }

    // -----------------------------
    // PICKLIST METADATA
    // -----------------------------

    @wire(getPicklistValuesByRecordType, {
        objectApiName: '$objectApiName',
        recordTypeId: '$resolvedRecordTypeId'
    })
    wiredPicklistValues({ data, error }) {
        if (data) {
            this.buildOptions(data);
        } else if (error) {
            this.options = [];

            this.errorMessage = this.getErrorMessage(
                error,
                'Unable to load picklist values.'
            );
        }
    }

    // -----------------------------
    // CONFIGURATION VALIDATION
    // -----------------------------

    validateFieldConfiguration() {
        if (!this.objectInfo) {
            return false;
        }

        if (!this.dependentFieldApiName) {
            this.setConfigurationError(
                'A Picklist Field API Name is required.'
            );
            return false;
        }

        const dependentField =
            this.objectInfo.fields?.[this.dependentFieldApiName];

        if (!dependentField) {
            this.setConfigurationError(
                `The picklist field "${this.dependentFieldApiName}" was not found on ${this.objectApiName}.`
            );
            return false;
        }

        /*
         * FIELD DEPENDENCY MODE
         *
         * If either controlling input is supplied,
         * both are required.
         */
        if (this.isFieldDependencyMode) {
            if (!this.controllingFieldApiName) {
                this.setConfigurationError(
                    'A Controlling Field API Name is required when using Field Dependency mode.'
                );
                return false;
            }

            if (!this.controllingValue) {
                this.setConfigurationError(
                    'A Controlling Value is required when using Field Dependency mode.'
                );
                return false;
            }

            const controllingField =
                this.objectInfo.fields?.[
                    this.controllingFieldApiName
                ];

            if (!controllingField) {
                this.setConfigurationError(
                    `The controlling field "${this.controllingFieldApiName}" was not found on ${this.objectApiName}.`
                );
                return false;
            }

            /*
             * controllerName tells us which field Salesforce
             * has configured as the controlling field.
             */
            if (
                dependentField.controllerName !==
                this.controllingFieldApiName
            ) {
                this.setConfigurationError(
                    `"${this.dependentFieldApiName}" is not configured as dependent on "${this.controllingFieldApiName}". Create the Field Dependency in Object Manager first.`
                );
                return false;
            }
        }

        /*
         * RECORD TYPE MODE
         *
         * If no controlling field/value is supplied,
         * an explicit Record Type Id is required.
         */
        if (this.isRecordTypeMode) {
            if (!this.recordTypeId) {
                this.setConfigurationError(
                    'A Record Type Id is required when no controlling field and value are supplied.'
                );
                return false;
            }

            /*
             * A field with a Salesforce Field Dependency
             * cannot be safely filtered by Record Type alone.
             */
            if (dependentField.controllerName) {
                this.setConfigurationError(
                    `"${this.dependentFieldApiName}" is configured as a dependent picklist. Supply its Controlling Field API Name and Controlling Value to use Field Dependency mode.`
                );
                return false;
            }
        }

        this.errorMessage = null;
        return true;
    }

    // -----------------------------
    // BUILD OPTIONS
    // -----------------------------

    buildOptions(data) {
        if (!this.validateFieldConfiguration()) {
            return;
        }

        const picklist =
            data.picklistFieldValues?.[
                this.dependentFieldApiName
            ];

        if (!picklist) {
            this.setConfigurationError(
                `Picklist metadata could not be found for "${this.dependentFieldApiName}".`
            );
            return;
        }

        /*
         * RECORD TYPE MODE
         *
         * getPicklistValuesByRecordType already returns
         * only values available for the supplied Record Type.
         */
        if (this.isRecordTypeMode) {
            this.options = (picklist.values || []).map(
                (picklistValue) => ({
                    label: picklistValue.label,
                    value: picklistValue.value
                })
            );

            if (this.options.length === 0) {
                this.setConfigurationError(
                    `No values from "${this.dependentFieldApiName}" are available for the supplied Record Type Id.`
                );
                return;
            }

            this.finishBuildingOptions();
            return;
        }

        /*
         * FIELD DEPENDENCY MODE
         *
         * controllerValues looks approximately like:
         *
         * {
         *     "Online": 0,
         *     "Referral": 1,
         *     "Outreach": 2
         * }
         *
         * Each dependent value has a validFor array containing
         * the controller indexes for which it is valid.
         */
        const controllerValues =
            picklist.controllerValues || {};

        const controllingIndex =
            controllerValues[this.controllingValue];

        if (controllingIndex === undefined) {
            this.options = [];

            this.setConfigurationError(
                `The controlling value "${this.controllingValue}" is not available for "${this.controllingFieldApiName}". Use the picklist value's API value, not its label if those differ.`
            );
            return;
        }

        this.options = (picklist.values || [])
            .filter((picklistValue) => {
                return (
                    Array.isArray(picklistValue.validFor) &&
                    picklistValue.validFor.includes(
                        controllingIndex
                    )
                );
            })
            .map((picklistValue) => ({
                label: picklistValue.label,
                value: picklistValue.value
            }));

        if (this.options.length === 0) {
            this.setConfigurationError(
                `No values from "${this.dependentFieldApiName}" are configured for controlling value "${this.controllingValue}".`
            );
            return;
        }

        this.finishBuildingOptions();
    }

    finishBuildingOptions() {
        this.errorMessage = null;

        /*
         * If an existing selected value is no longer valid
         * for the current configuration, clear it.
         */
        if (
            this._selectedValue &&
            !this.options.some(
                (option) =>
                    option.value === this._selectedValue
            )
        ) {
            this._selectedValue = null;

            this.dispatchEvent(
                new FlowAttributeChangeEvent(
                    'selectedValue',
                    null
                )
            );
        }
    }

    // -----------------------------
    // USER INTERACTION
    // -----------------------------

    handleChange(event) {
        this._selectedValue = event.detail.value;

        this.dispatchEvent(
            new FlowAttributeChangeEvent(
                'selectedValue',
                this._selectedValue
            )
        );
    }

    // -----------------------------
    // FLOW VALIDATION
    // -----------------------------

    @api
    validate() {
        if (this.errorMessage) {
            return {
                isValid: false,
                errorMessage: this.errorMessage
            };
        }

        if (this.required && !this._selectedValue) {
            return {
                isValid: false,
                errorMessage:
                    this.messageWhenValueMissing ||
                    'Complete this field.'
            };
        }

        return {
            isValid: true
        };
    }

    // -----------------------------
    // HELPERS
    // -----------------------------

    get isDisabled() {
        return this.options.length === 0;
    }

    setConfigurationError(message) {
        this.options = [];
        this.errorMessage = `Configuration Error: ${message}`;
    }

    getErrorMessage(error, fallbackMessage) {
        return (
            error?.body?.message ||
            error?.message ||
            fallbackMessage
        );
    }
}
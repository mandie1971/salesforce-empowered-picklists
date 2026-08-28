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

    // Optional. If omitted, the object's default record type is used.
    @api recordTypeId;

    // -----------------------------
    // FLOW INPUT / OUTPUT
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

        if (!this.controllingFieldApiName) {
            this.setConfigurationError(
                'A Controlling Field API Name is required.'
            );
            return false;
        }

        if (!this.dependentFieldApiName) {
            this.setConfigurationError(
                'A Dependent Field API Name is required.'
            );
            return false;
        }

        const controllingField =
            this.objectInfo.fields?.[this.controllingFieldApiName];

        const dependentField =
            this.objectInfo.fields?.[this.dependentFieldApiName];

        if (!controllingField) {
            this.setConfigurationError(
                `The controlling field "${this.controllingFieldApiName}" was not found on ${this.objectApiName}.`
            );
            return false;
        }

        if (!dependentField) {
            this.setConfigurationError(
                `The dependent field "${this.dependentFieldApiName}" was not found on ${this.objectApiName}.`
            );
            return false;
        }

        /*
         * controllerName tells us which field Salesforce has configured
         * as the controlling field for this dependent picklist.
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

        this.errorMessage = null;
        return true;
    }

    // -----------------------------
    // BUILD FILTERED OPTIONS
    // -----------------------------

    buildOptions(data) {
        if (!this.validateFieldConfiguration()) {
            return;
        }

        if (!this.controllingValue) {
            this.setConfigurationError(
                'A Controlling Value is required.'
            );
            return;
        }

        const dependentPicklist =
            data.picklistFieldValues?.[this.dependentFieldApiName];

        if (!dependentPicklist) {
            this.setConfigurationError(
                `Picklist metadata could not be found for "${this.dependentFieldApiName}".`
            );
            return;
        }

        /*
         * controllerValues looks approximately like:
         *
         * {
         *     "Online": 0,
         *     "Referral": 1,
         *     "Outreach": 2
         * }
         *
         * Each dependent value then has a validFor array containing
         * the controller indexes for which that value is valid.
         */
        const controllerValues =
            dependentPicklist.controllerValues || {};

        const controllingIndex =
            controllerValues[this.controllingValue];

        if (controllingIndex === undefined) {
            this.options = [];

            this.setConfigurationError(
                `The controlling value "${this.controllingValue}" is not available for "${this.controllingFieldApiName}". Use the picklist value's API value, not its label if those differ.`
            );
            return;
        }

        this.options = (dependentPicklist.values || [])
            .filter((picklistValue) => {
                return (
                    Array.isArray(picklistValue.validFor) &&
                    picklistValue.validFor.includes(controllingIndex)
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

        this.errorMessage = null;

        /*
         * If Flow supplied an existing value but it isn't valid for
         * this controlling value anymore, clear it.
         */
        if (
            this._selectedValue &&
            !this.options.some(
                (option) => option.value === this._selectedValue
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
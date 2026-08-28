import { LightningElement, api } from 'lwc';

export default class DynamicDependentPicklistEditor extends LightningElement {
    _inputVariables = [];

    @api
    get inputVariables() {
        return this._inputVariables;
    }

    set inputVariables(value) {
        this._inputVariables = value || [];
    }

    getValue(name) {
        const variable = this._inputVariables.find(
            (item) => item.name === name
        );

        return variable ? variable.value : null;
    }

    get objectApiName() {
        return this.getValue('objectApiName') || '';
    }

    get recordTypeId() {
        return this.getValue('recordTypeId') || '';
    }

    get controllingFieldApiName() {
        return this.getValue('controllingFieldApiName') || '';
    }

    get controllingValue() {
        return this.getValue('controllingValue') || '';
    }

    get dependentFieldApiName() {
        return this.getValue('dependentFieldApiName') || '';
    }

    get label() {
        return this.getValue('label') || 'Select an option';
    }

    get placeholder() {
        return this.getValue('placeholder') || 'Select...';
    }

    get required() {
        return this.getValue('required') === true;
    }

    get messageWhenValueMissing() {
        return (
            this.getValue('messageWhenValueMissing') ||
            'Complete this field.'
        );
    }

    get recordTypeDisabled() {
        return !!(
            this.controllingFieldApiName ||
            this.controllingValue
        );
    }

    get fieldDependencyDisabled() {
        return !!this.recordTypeId;
    }

    handleTextChange(event) {
        this.dispatchValueChange(
            event.target.dataset.name,
            event.target.value,
            'String'
        );
    }

    handleBooleanChange(event) {
        this.dispatchValueChange(
            event.target.dataset.name,
            event.target.checked,
            'Boolean'
        );
    }

    handleRecordTypeChange(event) {
        const value = event.target.value;

        this.dispatchValueChange(
            'recordTypeId',
            value,
            'String'
        );
    }

    handleControllingFieldChange(event) {
        const value = event.target.value;

        this.dispatchValueChange(
            'controllingFieldApiName',
            value,
            'String'
        );
    }

    handleControllingValueChange(event) {
        const value = event.target.value;

        this.dispatchValueChange(
            'controllingValue',
            value,
            'String'
        );
    }

    dispatchValueChange(name, newValue, newValueDataType) {
        this.dispatchEvent(
            new CustomEvent(
                'configuration_editor_input_value_changed',
                {
                    bubbles: true,
                    composed: true,
                    detail: {
                        name,
                        newValue,
                        newValueDataType
                    }
                }
            )
        );
    }

    @api
    validate() {
        const errors = [];

        if (!this.objectApiName) {
            errors.push({
                key: 'objectApiName',
                errorString: 'Object API Name is required.'
            });
        }

        if (!this.dependentFieldApiName) {
            errors.push({
                key: 'dependentFieldApiName',
                errorString: 'Picklist Field API Name is required.'
            });
        }

        const hasRecordType = !!this.recordTypeId;
        const hasControllingField =
            !!this.controllingFieldApiName;
        const hasControllingValue =
            !!this.controllingValue;

        if (
            !hasRecordType &&
            !hasControllingField &&
            !hasControllingValue
        ) {
            errors.push({
                key: 'filterMethod',
                errorString:
                    'Choose a filtering method: Record Type Id or Controlling Field + Controlling Value.'
            });
        }

        if (
            hasRecordType &&
            (hasControllingField || hasControllingValue)
        ) {
            errors.push({
                key: 'filterMethod',
                errorString:
                    'Choose only one filtering method.'
            });
        }

        if (
            !hasRecordType &&
            (hasControllingField !== hasControllingValue)
        ) {
            errors.push({
                key: 'fieldDependency',
                errorString:
                    'Controlling Field API Name and Controlling Value must be provided together.'
            });
        }

        return errors;
    }
}
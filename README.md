# Dynamic Dependent Picklist for Salesforce Flow

A lightweight Salesforce Flow Screen Component that displays the valid values of a dependent picklist based on a controlling value already known by the Flow.

This lets you use Salesforce's existing Field Dependency configuration without requiring the user to select — or even see — the controlling field.

## Why This Exists

Salesforce Flow can display dependent picklists, but the standard approach expects the user to interact with the controlling field.

Sometimes the Flow already knows the controlling value.

For example, imagine an online form with:

- **Source:** Online
- **How Did You Hear About Us?:** a dependent picklist

If every submission from the form has a Source of `Online`, there's no reason to ask the user to select it.

Dynamic Dependent Picklist lets the Flow supply Online behind the scenes and displays only the dependent picklist values that Salesforce has configured as valid for Online.

No hard-coded choices. No duplicate configuration. No trying to remember every Flow that needs to be updated when a picklist value changes.

Salesforce’s existing Field Dependency remains the single source of truth. Add, remove, or change a dependent value in Object Manager, and the component automatically reflects the current configuration everywhere it’s used.

## Features

- No Apex required
- Uses Salesforce UI API
- Uses your existing Salesforce Field Dependency as the single source of truth
- **Never hard-code dependent picklist values in your Flow**
- **No duplicate lists of choices to maintain**
- Update the Field Dependency once in Object Manager — every Flow using the component automatically reflects the change
- Supports record-type-specific picklist values
- Works in Salesforce Screen Flows
- Returns the selected API value to Flow
- Supports required-field validation
- Provides configuration errors when fields or values are misconfigured

## Requirements

The controlling and dependent fields must already have a **Field Dependency relationship configured in Salesforce Object Manager**.

Both fields must belong to the same object.

## Installation

Copy:

```text
force-app/main/default/lwc/dynamicDependentPicklist
```

into the same location in your Salesforce DX project.

Deploy it with Salesforce CLI:

```bash
sf project deploy start --source-dir force-app/main/default/lwc/dynamicDependentPicklist
```

After deployment, **Dynamic Dependent Picklist** will be available as a Screen Component in Flow Builder.

## Flow Configuration

Add **Dynamic Dependent Picklist** to a Flow Screen and configure the following properties.

### Object API Name

API name of the object containing the controlling and dependent fields.

Example:

```text
Nomination__c
```

### Controlling Field API Name

API name of the controlling field in the existing Salesforce Field Dependency.

Example:

```text
Source__c
```

### Controlling Value

The API value the component should use to filter the dependent picklist.

Example:

```text
Online
```

The controlling field itself is not displayed to the user.

### Dependent Field API Name

API name of the dependent picklist field.

Example:

```text
How_did_you_hear_about_Essie__c
```

Only values configured as valid for the specified controlling value are displayed.

### Record Type Id

Optional.

Supply a Record Type Id if the available picklist values should be based on a particular record type.

If left blank, the object's default record type is used.

### Field Label

The label displayed above the picklist.

### Placeholder

The text displayed before the user selects a value.

### Required

Determines whether the user must select a value before proceeding.

### Selected Value

The component outputs the selected dependent picklist's **API value** to Flow.

Use this output when creating or updating your record.

## Example

Suppose a Flow-powered online form always uses:

```text
Source__c = Online
```

And Salesforce has a Field Dependency between:

```text
Source__c
        ↓
How_did_you_hear_about_Essie__c
```

Configure Dynamic Dependent Picklist with:

```text
Object API Name:
Nomination__c

Controlling Field API Name:
Source__c

Controlling Value:
Online

Dependent Field API Name:
How_did_you_hear_about_Essie__c
```

The user sees only the **How Did You Hear About Essie?** values Salesforce has configured as valid when Source is `Online`.

If the Field Dependency is later changed in Object Manager, the component automatically uses the updated configuration. There is no second list of choices to maintain in the Flow.

## Guest User / Experience Cloud Note

This component retrieves object and picklist metadata using Salesforce UI API.

When used in a public or unauthenticated Experience Cloud site, the guest user must have sufficient access for Salesforce to return the relevant object and field metadata.

Always test the component in the same user context in which the Flow will run.

## License

MIT

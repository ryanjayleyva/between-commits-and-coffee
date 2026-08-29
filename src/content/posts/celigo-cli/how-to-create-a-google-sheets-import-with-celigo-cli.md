---
title: 'How to Create a Google Sheets Import with Celigo CLI'
description:
  'Learn how to create a Google Sheets import with the Celigo CLI, configure the
  Google Sheets HTTP request with Handlebars expressions, attach the import to
  an existing flow, and troubleshoot common import and sync configuration
  errors.'
published: August 24, 2026
updated: August 26, 2026
---

With the Salesforce export in place, the next step is to create the Google
Sheets import that will receive the account data. If you haven't created the
export yet, start with
[How to Create a Salesforce Export with Celigo CLI](/posts/celigo-cli/how-to-create-a-salesforce-export-with-celigo-cli/).

## TL;DR

Define the import in JSON with `adaptorType: "HTTPImport"`, configure the Google
Sheets API endpoint in `http`, and create it with `celigo imports create`.
Attach the import to the flow through `pageProcessors` with `"type": "import"`,
then run the flow with `celigo flows run`.

This post covers several configuration errors that come up when building
HTTP-based imports. Each one has a specific fix.

## Creating the Google Sheets Import

From `salesforce-google-sheets-integration`, create an `imports` directory for
import definitions.

```bash
cd salesforce-google-sheets-integration
mkdir imports
cd imports
```

Create the import definition as
`celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json`.

```bash
vim celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
```

The import needs `_integrationId` to attach to the integration, `_connectionId`
to reference the Google Sheets connection, and `adaptorType` to select the HTTP
connector.

```json
{
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "_connectionId": "<YOUR_GOOGLE_SHEETS_CONNECTION_ID>",
  "name": "Push Salesforce Account by Name and Last Modified Date",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "adaptorType": "HTTPImport"
}
```

> **NOTE:** `adaptorType` is case-sensitive. Use `HTTPImport`, not `HttpImport`
> or `httpimport`. The platform rejects incorrect casing with a 422 validation
> error.

Create the import by redirecting the definition file to the CLI.

```bash
celigo imports create < celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
```

The CLI returns the created resource with the server-assigned `_id`.

```bash
~/Developer/salesforce-google-sheets-integration/imports ❯ celigo imports create < celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
_id            <YOUR_IMPORT_ID>
createdAt      2026-08-25T16:13:04.364Z
lastModified   2026-08-25T16:13:04.364Z
name           Push Salesforce Account by Name and Last Modified Date
description    For https://rjleyva.com Celigo CLI demonstration only.
_connectionId  <YOUR_GOOGLE_SHEETS_CONNECTION_ID>
adaptorType    HTTPImport
```

Add the `_id` back into the definition so the file matches the created resource.
The next section needs both IDs, the flow's and the import's.

## Configuring the HTTP Request

The import needs the Google Sheets API endpoint, HTTP method, and request body.
Open the import definition.

```bash
vim celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
```

The `http` block configures the endpoint. The `relativeURI` uses the Google
Sheets API v4 append endpoint with the spreadsheet ID and sheet name. The
`valueInputOption=USER_ENTERED` query parameter ensures formulas and formatting
are interpreted properly.

```json
{
  "_id": "<YOUR_IMPORT_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "_connectionId": "<YOUR_GOOGLE_SHEETS_CONNECTION_ID>",
  "name": "Push Salesforce Account by Name and Last Modified Date",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "adaptorType": "HTTPImport",
  "http": {
    "method": ["POST"],
    "relativeURI": [
      "/v4/spreadsheets/<YOUR_SPREADSHEET_ID>/values/Sheet1:append?valueInputOption=USER_ENTERED"
    ],
    "requestType": ["CREATE"],
    "formType": "http"
  }
}
```

> **IMPORTANT:** The `relativeURI` must use the API endpoint path, not the
> browser URL. The browser URL includes `/edit` and query parameters for the UI,
> which return a 404 when called programmatically.

The `body` field contains the request payload with handlebars expressions that
reference the Salesforce fields from the export.

```json
{
  "_id": "<YOUR_IMPORT_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "_connectionId": "<YOUR_GOOGLE_SHEETS_CONNECTION_ID>",
  "name": "Push Salesforce Account by Name and Last Modified Date",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "adaptorType": "HTTPImport",
  "http": {
    "method": ["POST"],
    "relativeURI": [
      "/v4/spreadsheets/<YOUR_SPREADSHEET_ID>/values/Sheet1:append?valueInputOption=USER_ENTERED"
    ],
    "requestType": ["CREATE"],
    "formType": "http",
    "body": [
      "{\"values\":[[\"{{record.Id}}\",\"{{record.Name}}\",\"{{record.Owner.Name}}\",\"{{record.LastModifiedDate}}\",\"{{record.Contacts.[0].Email}}\",\"{{record.Adoption_Score__c}}\"]]}"
    ]
  }
}
```

Each `{{record.FieldName}}` resolves at runtime to the corresponding field from
the Salesforce export. The nested `{{record.Contacts.[0].Email}}` accesses the
first contact's email through the subquery relationship.

> **NOTE:** The body is a JSON string within an array. The outer array is
> positionally aligned with `method` and `requestType`. The inner string must be
> valid JSON with properly escaped quotes.

Update the import with the complete definition.

```bash
celigo imports update <YOUR_IMPORT_ID> --file celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
```

## Attaching the Import to the Flow

The import needs a `_flowId` to associate it with the flow, and the flow needs
`pageProcessors` to reference the import.

Open the import definition and add `_flowId`.

```bash
vim celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
```

```json
{
  "_id": "<YOUR_IMPORT_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "_connectionId": "<YOUR_GOOGLE_SHEETS_CONNECTION_ID>",
  "_flowId": "<YOUR_FLOW_ID>",
  "name": "Push Salesforce Account by Name and Last Modified Date",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "adaptorType": "HTTPImport",
  "http": {
    "method": ["POST"],
    "relativeURI": [
      "/v4/spreadsheets/<YOUR_SPREADSHEET_ID>/values/Sheet1:append?valueInputOption=USER_ENTERED"
    ],
    "requestType": ["CREATE"],
    "formType": "http",
    "body": [
      "{\"values\":[[\"{{record.Id}}\",\"{{record.Name}}\",\"{{record.Owner.Name}}\",\"{{record.LastModifiedDate}}\",\"{{record.Contacts.[0].Email}}\",\"{{record.Adoption_Score__c}}\"]]}"
    ]
  }
}
```

Update the import.

```bash
celigo imports update <YOUR_IMPORT_ID> --file celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
```

Now open the flow definition from the previous post.

```bash
cd ../flows
vim celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

Add the `pageProcessors` array with `"type": "import"` referencing the import
created above.

```json
{
  "_id": "<YOUR_FLOW_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "name": "Salesforce Accounts to Google Sheets",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "disabled": true,
  "pageGenerators": [
    {
      "_exportId": "<YOUR_EXPORT_ID>"
    }
  ],
  "pageProcessors": [
    {
      "type": "import",
      "_importId": "<YOUR_IMPORT_ID>"
    }
  ]
}
```

> **IMPORTANT:** The `type` field is required on every page processor. Without
> it, the API rejects the update with a 422 validation error:
> `type needs to be specified with pageProcessors and should be either import or export`.

Update the flow.

```bash
celigo flows update <YOUR_FLOW_ID> --file celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

## Resetting the Delta Checkpoint

The first run of the flow may show 0 records processed even though data appeared
in the Google Sheet. This happens because a delta export only pulls records
modified since the last successful run. Once the first run completes, the
checkpoint is set, and subsequent runs return nothing until new changes occur.

To reprocess the same records, reset the delta checkpoint by adding
`reset: true` to the `delta` block.

Open the export definition.

```bash
cd ../exports
vim celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

```json
{
  "_id": "<YOUR_EXPORT_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "_connectionId": "<YOUR_SALESFORCE_CONNECTION_ID>",
  "name": "Fetch Salesforce Account by Name and Last Modified Date",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "adaptorType": "SalesforceExport",
  "type": "delta",
  "delta": {
    "dateField": "LastModifiedDate",
    "reset": true
  },
  "salesforce": {
    "api": "rest",
    "type": "soql",
    "soql": {
      "query": "SELECT Id, Name, Owner.Name, LastModifiedDate, (SELECT Id, Name, Email FROM Contacts) FROM Account WHERE Owner.Name IN ('Kimmy Seludo') AND LastModifiedDate > {{lastExportDateTime}}"
    }
  },
  "includeDeletedRecords": false
}
```

Update the export.

```bash
celigo exports update <YOUR_EXPORT_ID> --file celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

> **NOTE:** Remove `reset: true` after the next run completes so the delta
> checkpoint resumes normal behavior. Leaving it in causes every run to
> reprocess all matching records, defeating the purpose of delta sync.

## Switching from Delta to Full Sync

For the initial test, switching to `type: "all"` is simpler than resetting the
delta checkpoint. Full sync pulls every matching record on every run, regardless
of when they were last modified.

> **NOTE:** If your export uses `type: "delta"` with `{{lastExportDateTime}}` in
> the query, switching to `type: "all"` requires removing the delta clause. The
> `{{lastExportDateTime}}` handlebar is only defined in delta mode and causes a
> `handlebars_template_parse_error` if referenced in full sync mode.

Open the export definition.

```bash
vim celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

Change `type` from `"delta"` to `"all"` and remove the `delta` block and the
`LastModifiedDate > {{lastExportDateTime}}` clause from the query.

```json
{
  "_id": "<YOUR_EXPORT_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "_connectionId": "<YOUR_SALESFORCE_CONNECTION_ID>",
  "name": "Fetch Salesforce Account by Name and Last Modified Date",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "adaptorType": "SalesforceExport",
  "type": "all",
  "salesforce": {
    "api": "rest",
    "type": "soql",
    "soql": {
      "query": "SELECT Id, Name, Owner.Name, LastModifiedDate, (SELECT Id, Name, Email FROM Contacts) FROM Account WHERE Owner.Name IN ('RJ Leyva')"
    }
  },
  "includeDeletedRecords": false
}
```

Update the export.

```bash
celigo exports update <YOUR_EXPORT_ID> --file celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

## Running the Flow

Enable the flow before running it. Flows created with `disabled: true` will not
execute until explicitly enabled.

```bash
celigo flows set <YOUR_FLOW_ID> disabled=false
```

Run the flow.

```bash
celigo flows run <YOUR_FLOW_ID>
```

The command returns a JSON response with the run details. Check the
integrator.io dashboard to verify the records processed and confirm the data
appeared in your Google Sheet.

## Troubleshooting

### Invalid adaptorType

```
(422): Validation error: Invalid value 'GoogleSheets' for field 'adaptorType'.
```

Google Sheets imports use `HTTPImport`, not `GoogleSheets`. The connection
handles the Google Sheets API authentication and base URL.

### Missing pageProcessor type

```
(422): Validation error: Invalid flow - type needs to be specified with
pageProcessors and should be either import or export
```

Every entry in `pageProcessors` requires `"type": "import"` or
`"type": "export"`. The platform does not infer the type from the presence of
`_importId` or `_exportId`.

### Invalid JSON in request body

```
(400): An invalid JSON is sent in the request.body
```

The body string must be valid JSON with all property names and string values
wrapped in quotes. The outer quotes in the JSON string must be escaped with
backslashes. Check for unescaped quotes or missing commas.

### Handlebars triple braces breaking JSON

Using triple braces `{{{record.FieldName}}}` in the body template causes JSON
parsing errors. Triple braces produce unescaped output, which can inject raw
values containing quotes or special characters that break the JSON structure.

Use double braces `{{record.FieldName}}` instead. Double braces escape the
output so values with special characters are safe to embed in a JSON string.

### 404 from Google Sheets API

```
<!DOCTYPE html>...Page Not Found...
```

The `relativeURI` is using the browser URL instead of the API endpoint. The
browser URL includes `/edit` and UI query parameters. The API endpoint uses
`/v4/spreadsheets/{id}/values/{range}:append`.

### handlebars_template_parse_error

```
Failed to generate salesforce.soql.query from template: "lastExportDateTime"
not defined in the model
```

The query references `{{lastExportDateTime}}` but `type` is set to `"all"`. This
handlebar is only available in delta mode. Remove the clause or switch back to
`type: "delta"`.

## Verifying the Export

You can run an export on demand without starting the flow.

```bash
celigo exports invoke <YOUR_EXPORT_ID>
```

This executes the SOQL query against Salesforce and returns the records without
creating a flow job. Use it to verify the query before running the full flow.

## Resulting State

At this point, your integration structure should look like this.

```bash
~/Developer/salesforce-google-sheets-integration ❯ tree
.
├── connections
│   ├── celigo-cli-demo-only-google-sheets-connection.json
│   └── celigo-cli-demo-only-salesforce-connection.json
├── exports
│   └── celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
├── flows
│   └── celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
├── imports
│   └── celigo-cli-demo-only-push-salesforce-account-to-google-sheets.json
└── integrations.json
```

The flow now has a Salesforce export as its source and a Google Sheets import as
its destination. The integration is complete and ready for scheduled or manual
runs.

In the next post,
[How to Schedule a Flow with Celigo CLI](/posts/celigo-cli/how-to-schedule-a-flow-with-celigo-cli)
we'll add a cron schedule to run the flow on a recurring basis.

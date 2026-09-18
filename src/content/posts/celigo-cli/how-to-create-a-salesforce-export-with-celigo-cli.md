---
title: 'How to Create a Salesforce Export with Celigo CLI'
description:
  'Learn how to create a Salesforce export with the Celigo CLI, define a SOQL
  query to extract account data, enable delta sync, and attach the export to an
  existing flow.'
published: August 23, 2026
updated: August 24, 2026
tags: ['celigo-cli', 'salesforce', 'soql']
---

With the flow in place, the next step is to create a Salesforce export that
queries account data with SOQL. If you haven't created the flow yet, start with
[How to Create a Flow with Celigo CLI](/posts/celigo-cli/how-to-create-a-flow-with-celigo-cli/).

## TL;DR

Define the export in JSON with `adaptorType`, `_connectionId`, and a SOQL query,
then create it with `celigo exports create`. Attach the export to the flow
through the flow definition's `pageGenerators`, then enable delta sync with
`type: "delta"` so each run pulls only records modified since the last
successful run.

Exports are referenced, not contained. The export points to its connection with
`_connectionId`, and the flow points back to the export with
`pageGenerators[]._exportId`. Keeping those two relationships straight is most
of the work in this post.

## Creating the Salesforce Export

From `salesforce-google-sheets-integration`, create an `exports` directory for
export definitions.

```bash
cd salesforce-google-sheets-integration
mkdir exports
cd exports
```

Create the export definition as
`celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json`

```bash
vim celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

Three parts do the real work here. The `adaptorType` identifies the connector,
the `_connectionId` references the Salesforce connection created earlier in the
series, and the `salesforce` block holds the query configuration. The SOQL query
selects the account fields, resolves `Owner.Name` through the owner
relationship, and fetches related contacts through a subquery.

```json
{
  "_connectionId": "<YOUR_SALESFORCE_CONNECTION_ID>",
  "name": "Fetch Salesforce Account by Name and Last Modified Date",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "adaptorType": "SalesforceExport",
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

Inside the `salesforce` block, `type` selects the extraction method, and `soql`
queries the org through the REST API. `includeDeletedRecords: false` leaves
deleted and archived records out of the results. Don't confuse this nested
`type` with a second, top-level `type` field that gets added later in this post
to select sync behavior.

Create the export by redirecting the definition file to the CLI.

```bash
celigo exports create < celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

Once the command completes successfully, the export exists in integrator.io, and
the CLI returns the assigned ID, timestamps, name, and other resource
properties.

```bash
~/Developer/salesforce-google-sheets-integration/exports ❯ celigo exports create < celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
_id            <YOUR_EXPORT_ID>
createdAt      2026-08-22T19:30:27.422Z
lastModified   2026-08-22T19:30:27.474Z
name           Fetch Salesforce Account by Name and Last Modified Date
description    For https://rjleyva.com Celigo CLI demonstration only.
_connectionId  <YOUR_SALESFORCE_CONNECTION_ID>
apiIdentifier  <YOUR_API_IDENTIFIER>
asynchronous   true
salesforce     {
  "type": "soql",
  "api": "rest",
  "soql": {
    "query": "SELECT Id, Name, Owner.Name, LastModifiedDate, (SELECT Id, Name, Email FROM Contacts) FROM Account WHERE Owner.Name IN ('RJ Leyva')"
  }
}
adaptorType    SalesforceExport
```

Add the `_id` back into the definition so the file matches the created resource.
The next section needs both IDs, the flow's and the export's.

## Attaching the Export to the Flow

A flow starts with one or more page generators. Each entry in the flow
definition's `pageGenerators` array references an export by `_exportId`, making
that export the source of records for the flow.

Open the flow definition from the previous post.

```bash
cd ../flows
vim celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

Add the `pageGenerators` array referencing the export created above.

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
  ]
}
```

> **NOTE:** The attachment key is `_exportId`, not `_integrationId`. Both
> resources carry an `_integrationId` because both belong to the integration.
> That field describes ownership, not attachment.

Update the existing flow with the modified definition.

```bash
celigo flows update <YOUR_FLOW_ID> --file celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

Like the connection update in a previous post, `flows update` sends a full
replacement, so the definition must stay complete. The `--file` flag reads the
body from the named file rather than piping it on stdin. The command returns the
updated flow, now carrying the page generator.

```bash
~/Developer/salesforce-google-sheets-integration/flows ❯ celigo flows update <YOUR_FLOW_ID> --file celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
_id                            <YOUR_FLOW_ID>
lastModified                   2026-08-22T20:04:32.888Z
name                           Salesforce Accounts to Google Sheets
description                    For https://rjleyva.com Celigo CLI demonstration only.
disabled                       true
_integrationId                 <YOUR_INTEGRATION_ID>
createdAt                      2026-08-22T19:42:37.940Z
autoResolveMatchingTraceKeys   true
logging                        {
  "mode": "accountLevel"
}
```

If you reference the wrong flow ID, the API rejects the request before anything
changes.

```bash
(404): Not found: Flow not found.
Hint: A referenced id in the request doesn't exist. Verify the ids you passed (e.g. _connectionId, _exportId, _importId, _flowId).
```

List flows to confirm the ID when this happens.

```bash
celigo flows list --format json
```

## Enabling Delta Sync

The query currently returns every account owned by the named owner on every run,
whether or not anything changed. Adding a filter against
`{{lastExportDateTime}}` turns the export into a delta sync. That handlebar
resolves at runtime to the timestamp of the export's last successful run.

Return to the `exports` directory and open the export definition.

```bash
cd ../exports
vim celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

Add the sync mode and the new query clause. Alongside `_connectionId`, the
definition now carries the `_id` returned by create and the `_integrationId`
shared with the flow.

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
    "dateField": "LastModifiedDate"
  },
  "salesforce": {
    "api": "rest",
    "type": "soql",
    "soql": {
      "query": "SELECT Id, Name, Owner.Name, LastModifiedDate, (SELECT Id, Name, Email FROM Contacts) FROM Account WHERE Owner.Name IN ('RJ Leyva') AND LastModifiedDate > {{lastExportDateTime}}"
    }
  },
  "includeDeletedRecords": false
}
```

Setting `type: "delta"` on the resource is what makes `{{lastExportDateTime}}`
resolvable. Without it, the platform has no checkpoint to bind the handlebar
against.

> **NOTE:** `delta.dateField` does not modify a manual SOQL query. The WHERE
> clause does the filtering. The field satisfies validation and mirrors what the
> integrator.io UI sets when you pick the delta export type.

Update the export with the modified definition.

```bash
celigo exports update <YOUR_EXPORT_ID> --file celigo-cli-demo-only-fetch-salesforce-account-by-name-and-last-modified-date.json
```

With delta enabled, the first run behaves like a full export because no
checkpoint exists yet. Each subsequent run pulls only records modified since the
last successful run, and after a failed run the checkpoint stays put so no
changed records are missed.

## Verifying the Export

You can run an export on demand without starting the flow.

```bash
celigo exports invoke <YOUR_EXPORT_ID>
```

`invoke` executes the SOQL query against Salesforce through the connection and
returns the records it finds, without creating a flow job. This catches query
and connection problems before they reach a flow run. Your records will differ
depending on your org data.

```bash
~/Developer/salesforce-google-sheets-integration/exports ❯ celigo exports invoke <YOUR_EXPORT_ID>
[
  {
    "Id": "<YOUR_ACCOUNT_ID>",
    "Name": "Company XYZ",
    "Owner": {
      "Name": "RJ Leyva"
    },
    "LastModifiedDate": "2026-08-22T21:14:31.000Z",
    "Contacts": {
      "records": [
        {
          "Id": "<YOUR_CONTACT_ID>",
          "Name": "John Doe",
          "Email": "john.doe@xyz.com"
        }
      ]
    }
  }
]
```

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
└── integrations.json
```

The flow now has a source. In the next post,
[How to Create a Google Sheets Import with Celigo CLI](/posts/celigo-cli/how-to-create-a-google-sheets-import-with-celigo-cli)
we'll create the Google Sheets import as its destination and map the account
fields into spreadsheet rows.

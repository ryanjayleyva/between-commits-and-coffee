---
title: 'How to Create a Flow with Celigo CLI'
description:
  'Learn how to create a flow with the Celigo CLI, attach it to an existing
  integration, and manage it from the command line.'
published: August 20, 2026
updated: August 22, 2026
---

With both connections configured, the next step is to create the flow that will
orchestrate the data transfer between them. If you haven't created the Google
Sheets connection, start with
[How to Create a Google Sheets Connection with Celigo CLI](/posts/celigo-cli/how-to-create-a-google-sheets-connection-with-celigo-cli/)

## TL;DR

Create a flow definition, attach it to an existing integration with
`_integrationId`, and create it with `celigo flows create`. Verify the resulting
flow with `celigo flows list` before adding its source and destination in the
next post.

Create a `flows` directory for flow definitions.

```bash
cd salesforce-google-sheets-integration
mkdir flows
cd flows
```

Keep flow definitions in a dedicated `flows` directory. Separating flows from
connections and integrations makes each resource easier to locate, review, and
maintain as the project grows.

Create the definition file.

```bash
vim celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

The `_integrationId` field attaches the flow to an existing integration. The
`name` and `description` identify the flow.

> **NOTE:** `_integrationId` must reference the integration's `id` from
> `integrations.json`. It is not the flow `_id`, which is generated when the
> flow is created.

```json
{
  "_id": "<YOUR_FLOW_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "name": "Salesforce Accounts to Google Sheets",
  "description": "For https://rjleyva.com Celigo CLI demonstration only."
}
```

> **NOTE:** Standalone flows are no longer supported. New flows must be attached
> to an existing integration with `_integrationId`.

If you did not capture the `id` when you created the integration, list
integrations from the CLI.

```bash
celigo integrations list --format json
```

Find the `salesforce-google-sheets-integration` entry and copy its `_id` into
the definition.

## Creating the Flow

Create the flow by redirecting the definition file to the CLI.

```bash
celigo flows create < celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

The command returns the flow with the server assigned `_id` and the defaults
integrator.io applies at creation.

```bash
~/Developer/salesforce-google-sheets-integration/flows ❯ celigo flows create < celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
_id                           <YOUR_FLOW_ID>
lastModified                  2026-08-22T14:39:24.828Z
name                          Salesforce Accounts to Google Sheets
description                   For https://rjleyva.com Celigo CLI demonstration only.
disabled                      false
_integrationId                6a8950ecf113e6ff7c4808e3
createdAt                     2026-08-22T14:39:24.648Z
autoResolveMatchingTraceKeys  true
logging                       {
  "mode": "accountLevel"
}
```

## Verifying the Flow

You can verify the new flow alongside the others at any time.

```bash
celigo flows list --format json
```

The flow is now attached to the integration but intentionally has no source or
destination. It is not runnable yet.

```bash
~/Developer/salesforce-google-sheets-integration ❯ tree
.
├── connections
│   ├── celigo-cli-demo-only-google-sheets-connection.json
│   └── celigo-cli-demo-only-salesforce-connection.json
├── flows
│   └── celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
└── integrations.json
```

In the next post,
[How to Create a Salesforce Export with Celigo CLI](/posts/celigo-cli/how-to-create-a-salesforce-export-with-celigo-cli/)
we'll add the Salesforce export as the source and configure its SOQL query to
extract account data.

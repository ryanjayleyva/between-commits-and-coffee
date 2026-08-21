---
title: 'How to Create a Flow with Celigo CLI'
description:
  'Learn how to create an integrator.io flow with the Celigo CLI, attach it to
  an existing integration, and verify it from the command line.'
published: August 20, 2026
updated: August 20, 2026
---

This tutorial is part of a series on working with the Celigo CLI and assumes
you've completed
[How to Set Up a Google Sheets Connection with Celigo CLI](/posts/celigo-cli/how-to-set-up-a-google-sheets-connection-with-celigo-cli/)
and have the Salesforce and Google Sheets connections configured.

This post creates the flow that ties those connections together, pulling
accounts out of Salesforce and dropping them into their own tabs in a
spreadsheet. The connections and the integration from the previous posts are
already in place, so we can keep moving.

The flow definition follows the same pattern you used for the integration and
connections, with two fields that make it a flow.

## Create the Flow Definition

Create a `flows` directory for flow definitions.

```bash
cd first-integration
mkdir flows
cd flows
```

A dedicated `flows` directory isn't just tidiness—it's how you keep the project
maintainable as it grows. Separating flow definitions from connections and
integrations keeps each component easy to locate, review, and evolve without
turning the repository into a mess.

Create the definition file.

```bash
nvim celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

The definition uses the same `name` and `description` fields as the integration.
The `_integrationId` field attaches the flow to the integration, and the
`disabled` field prevents it from running while it is being configured.

```json
{
  "name": "Salesforce Accounts to Google Sheets",
  "description": "Demo-only Retrieves Salesforce Accounts and their assigned Account Managers, then writes the data to a Google Sheets spreadsheet for reporting and reference.",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "disabled": true
}
```

The `_integrationId` field is required when creating a flow.

> NOTE: Standalone flows are no longer supported in integrator.io, so the flow
> must be attached to an existing integration using `_integrationId`.

If you did not capture the integration ID when you created the integration, list
integrations from the CLI.

```bash
celigo integrations list --format table
```

Copy the `_id` value from the `first-integration` row into the definition before
continuing.

## Create the Flow

Create the flow by redirecting the definition file to the CLI.

```bash
celigo flows create < celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

The command returns the flow with the server assigned `_id` and the defaults
integrator.io applies at creation.

```bash
~/first-integration/flows ❯ celigo flows create < celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
_id                          6a867c1f8de69a5a41e46f72
lastModified                 2026-08-20T04:01:36.137Z
name                         Salesforce Accounts to Google Sheets
description                  Demo-only Retrieves Salesforce Accounts and their assigned Account Managers, then writes the data to a Google Sheets spreadsheet for reporting and reference.
disabled                     true
_integrationId               6a7ed955e27c4161182679de
createdAt                    2026-08-20T04:01:35.969Z
autoResolveMatchingTraceKeys true
logging                      {
  "mode": "accountLevel"
}
```

The `disabled` value confirms the flow will not run while it is empty, and
`_integrationId` points back at the integration. Your own `_id` and timestamps
will differ.

You can verify the new flow alongside the others at any time.

```bash
celigo flows list --format table
```

The list output uses the same `--format` options as integrations.

At this point the flow is created but intentionally empty. It has no source or
destination yet, so it cannot move data. In the next post, we'll add the
Salesforce export as the flow's source and the Google Sheets import as its
destination, then enable the flow once it is wired up and verified.

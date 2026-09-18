---
title: 'How to Create an Integration with Celigo CLI'
description:
  'Learn how to create an integration with the Celigo CLI, configure its
  resources, and manage it programmatically from the command line.'
published: August 13, 2026
updated: August 22, 2026
tags: ['celigo-cli', 'integrations']
---

This tutorial builds on the CLI setup covered in
[How to Get Started with Celigo CLI](/posts/celigo-cli/how-to-get-started-with-celigo-cli/).
If you haven't installed, configured, and authenticated the Celigo CLI, complete
that guide first.

Throughout this series, we'll build a complete Salesforce to Google Sheets
integration using the Celigo CLI. Each post adds another part of the
integration, from creating the integration itself to configuring connections,
flows, and other required resources. By the end of the series, you'll have a
working integration and a practical understanding of how to manage it from the
command line.

## TL;DR

Create an integration by defining its properties in JSON and passing the
definition to `celigo integrations create` through standard input. You'll verify
the resulting integration from the CLI and use the same `table` and `json`
output formats introduced in the previous post.

## Creating the Integration

The Celigo CLI represents integrator.io resources as JSON documents. For
resource creation commands, you can provide the definition through standard
input or, where supported, with `--file`.

Start by creating a directory for the integration:

```bash
mkdir salesforce-google-sheets-integration
```

Then change into the directory:

```bash
cd salesforce-google-sheets-integration
```

Create an `integrations.json` file:

```bash
vim integrations.json
```

Define the integration `name` and `description`:

```json
{
  "name": "Salesforce - Google Sheets Integration",
  "description": "https://rjleyva.com Celigo CLI demonstration only."
}
```

The `name` field is required when creating an integration. The CLI uses this
JSON document as the resource definition for the creation request.

Create the integration by redirecting `integrations.json` to the CLI:

```bash
celigo integrations create < integrations.json
```

The `<` operator redirects the contents of `integrations.json` to the command's
standard input. The CLI reads that JSON as the resource definition for the
creation request.

> TIP: The create command reads the resource definition from standard input. If
> no input is provided, the CLI cannot construct the creation request and
> returns an error: **No input received. Pipe JSON via stdin, or pass --file
> <path> (where supported).**

Once the command completes successfully, the integration is created in
integrator.io, and the CLI returns the integration ID, timestamps, name, and
other resource properties:

```bash
_id                        <YOUR_INTEGRATION_ID>
lastModified               2026-08-22T07:34:05.003Z
name                       Salesforce - Google Sheets Integration
description                For https://rjleyva.com Celigo CLI demonstration only.
install                    []
_registeredConnectionIds   []
_registeredLookupCacheIds  []
installSteps               []
uninstallSteps             []
changeEditionSteps         []
flowGroupings              []
apiGroupings               []
createdAt                  2026-08-22T07:34:05.003Z
```

The `_id` identifies the integration. Add it to `integrations.json` so the file
contains the current resource definition:

```json
{
  "_id": "<YOUR_INTEGRATION_ID>",
  "name": "Salesforce - Google Sheets Integration",
  "description": "For https://rjleyva.com Celigo CLI demonstration only."
}
```

You can verify the integration in the integrator.io UI or query it directly from
the CLI:

```bash
celigo integrations list --format json
celigo integrations list --format table
```

## Updating the Integration

You can use the `update` subcommand to modify the integration. For example,
after changing its `name` or `description`:

```bash
celigo integrations update <YOUR_INTEGRATION_ID> --file integrations.json
```

At this point, the project contains a single resource definition:

```bash
~/Developer/salesforce-google-sheets-integration ❯ tree
.
└── integrations.json
```

The integration is now in place. In the next post,
[How to Create a Salesforce Connection with Celigo CLI](/posts/celigo-cli/how-to-create-a-salesforce-connection-with-celigo-cli/),
we'll configure the Salesforce connection for use as an export endpoint later in
the series.

---
title: 'How to Create Your First Integration with Celigo CLI'
description:
  'Learn how to create your first integrator.io integration using the Celigo
  CLI, configure integration resources, and manage your integration from the
  command line.'
published: August 13, 2026
updated: August 14, 2026
---

This tutorial builds on the concepts covered in
[How to Get Started with Celigo CLI](/posts/celigo-cli/how-to-get-started-with-celigo-cli/).
If you haven't already installed, configured, and authenticated the Celigo CLI,
complete that guide before proceeding.

## Creating Your First Integration

The Celigo CLI treats integrator.io resources as JSON documents. For resource
creation commands, you provide the resource definition through standard input
or, where supported, with `--file`. This tutorial uses an `integrations.json`
file so the definition can be version-controlled alongside the rest of your
integration configuration.

Start by creating a directory for the integration:

```bash
mkdir first-integration
```

Then change into the new directory:

```bash
cd first-integration
```

Create an `integrations.json` file:

```bash
nvim integrations.json
```

For this example, the file contains the integration name and description:

```json
{
  "name": "first-integration",
  "description": "This is my first integration"
}
```

The `name` field is required when creating an integration. The CLI passes the
JSON document to the integration creation request.

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
~/first-integration ❯ celigo integrations create < integrations.json
_id                        6a7ed955e27c4161182679de
lastModified               2026-08-14T09:01:09.734Z
name                       first-integration
install                    []
_registeredConnectionIds   []
_registeredLookupCacheIds  []
installSteps               []
uninstallSteps             []
changeEditionSteps         []
flowGroupings              []
apiGroupings               []
createdAt                  2026-08-14T09:01:09.734Z
```

You can verify the new integration from the integrator.io web interface or query
it directly from the CLI.

To list the integrations as JSON:

```bash
celigo integrations list --format json
```

Or use the table format for interactive terminal output:

```bash
celigo integrations list --format table
```

This provides the foundation for the next step in the series. In the next post,
[How to Set Up a Salesforce Connection with Celigo CLI](/posts/celigo-cli/how-to-set-up-a-salesforce-connection-with-celigo-cli/),
we'll create and configure a connection that can be used by flows within
integrator.io.

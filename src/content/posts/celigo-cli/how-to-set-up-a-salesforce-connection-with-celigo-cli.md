---
title: 'How to Set Up a Salesforce Connection with Celigo CLI'
description:
  'Learn how to set up a Salesforce connection with Celigo CLI, including
  creating the connection, completing OAuth authorization, and verifying it from
  the command line.'
published: August 15, 2026
updated: August 15, 2026
---

This tutorial builds on
[How to Get Started with Celigo CLI](/posts/celigo-cli/how-to-get-started-with-celigo-cli/)
and
[How to Create Your First Integration with Celigo CLI](/posts/celigo-cli/how-to-create-your-first-integration-with-celigo-cli/).
You should already have the CLI configured and a `first-integration` directory
from the previous post.

In this post, we'll add the Salesforce connection that will serve as the source
for the flow we'll build later. The flow will extract accounts assigned to
Account Managers from Salesforce and write the results to dedicated Google
Sheets tabs.

The workflow separates connection configuration from authentication. Define the
connection in JSON, create it with `celigo connections create`, authorize it
with `celigo connections authorize`, and verify it with
`celigo connections ping`.

## Create the Salesforce Connection

From `first-integration`, create a `connections` directory for connection
definitions:

```bash
cd first-integration
mkdir connections
cd connections
```

Create the connection definition as
`celigo-cli-demo-only-salesforce-connection.json`

> TIP: Use descriptive resource names. Clear names make resources easier to
> identify and manage as an integration grows.

```bash
nvim celigo-cli-demo-only-salesforce-connection.json
```

The required fields are `type` and `name`. The type identifies the connector,
while name provides a readable name for the connection. Additional
Salesforce-specific settings can be defined in a nested salesforce object when
needed.

```json
{
  "type": "salesforce",
  "name": "Salesforce Connection (Demo Only)"
}
```

Create the connection by redirecting the definition file to the CLI:

```bash
celigo connections create < celigo-cli-demo-only-salesforce-connection.json
```

The `<` operator redirects the contents of the file to the command's standard
input. The CLI reads that JSON as the resource definition for the creation
request.

Once the command completes successfully, the connection is created in
integrator.io, and the CLI returns the connection ID, timestamps, name, and
other resource properties:

```bash
~/first-integration/connections ❯ celigo connections create < celigo-cli-demo-only-salesforce-connection.json
_id                           6a7ff1dbe27c416118751eb0
createdAt                     2026-08-15T04:58:03.795Z
lastModified                  2026-08-15T04:58:03.827Z
type                          salesforce
name                          Salesforce Connection (Demo Only)
enableMicroBatchForOneToMany  true
enableCsvObjectParsing        true
salesforce                    {
  "scope": [],
  "concurrencyLevel": 5,
  "targetConcurrencyLevel": 5
}
autoRecoverRateLimitErrors    true
microServices                 {
  "disableNetSuiteWebservices": false,
  "disableNetSuiteDistributed": false,
  "disableNetSuiteProxy": false,
  "disableHttp": false,
  "disableS3": false,
  "disableSalesforce": false,
  "disableAs2": false,
  "disableFtp": false,
  "disableAs2File": false,
  "disableDataLoaderFile": false
}
```

> NOTE: The connection definition contains no authentication material. For
> OAuth-based connections, authentication is handled separately through
> `celigo connections authorize` rather than stored in the resource definition.

You can verify the new connection from the integrator.io web interface or query
it directly from the CLI:

```bash
celigo connections list --format json
```

## Authorizing and Testing the Connection

Authorize the connection to complete the Salesforce OAuth flow:

```bash
celigo connections authorize 6a7ff1dbe27c416118751eb0
```

The command opens the Salesforce authorization flow in a browser and waits for
authorization to complete.

You can verify the connection at any time:

```bash
celigo connections ping 6a7ff1dbe27c416118751eb0
```

`ping` sends a test request to the remote system to verify the connection.

> NOTE: In a headless environment, `authorize` can't open a browser. Pass
> `--print-url` to print the authorization URL so you can complete the flow
> manually.

At this point you should have a structure like this:

```bash
~/first-integration ❯ tree
├──  connections
│   └── {} celigo-cli-demo-only-salesforce-connection.json
└── {} integrations.json
```

In the next post, How to Set Up a Google Sheets Connection with Celigo CLI,
we’ll configure the destination connection for the series flow, enabling it to
write data to Google Sheets.

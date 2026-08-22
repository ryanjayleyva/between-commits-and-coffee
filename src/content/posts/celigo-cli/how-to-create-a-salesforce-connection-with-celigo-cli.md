---
title: 'How to Create a Salesforce Connection with Celigo CLI'
description:
  'Learn how to create and set up a Salesforce connection with the Celigo CLI,
  complete OAuth authorization, and verify the connection from the command line.'
published: August 15, 2026
updated: August 22, 2026
---

With the CLI configured and the integration created, the next step is to add the
Salesforce connection. You should have a `salesforce-google-sheets-integration`
directory with `integrations.json` from the previous post.

If you haven't created the integration yet, start with
[How to Create an Integration with Celigo CLI](/posts/celigo-cli/how-to-create-an-integration-with-celigo-cli/)

## TL;DR

Create a Salesforce connection with `celigo connections create`, authorize it
with `celigo connections authorize`, and verify the connection with
`celigo connections ping`. The connection definition is stored as JSON, while
OAuth authentication is handled separately from the resource configuration.

The workflow separates connection configuration from authentication. Define the
connection in JSON, create it with `celigo connections create`, authorize it
with `celigo connections authorize`, and verify it with
`celigo connections ping`.

## Creating the Salesforce Connection

From `salesforce-google-sheets-integration`, create a `connections` directory
for connection definitions:

```bash
cd salesforce-google-sheets-integration
mkdir connections
cd connections
```

Create the connection definition as
`celigo-cli-demo-only-salesforce-connection.json`

> **NOTE:** Use descriptive resource names. Clear names make resources easier to
> identify and manage as an integration grows.

```bash
vim celigo-cli-demo-only-salesforce-connection.json
```

The required fields are `type` and `name`. The type identifies the connector,
while name provides a readable name for the connection. Additional
Salesforce-specific settings can be defined in a nested salesforce object when
needed.

```json
{
  "type": "salesforce",
  "name": "Celigo CLI Demo only Salesforce Connection"
}
```

Create the connection by redirecting the definition file to the CLI:

```bash
celigo connections create < celigo-cli-demo-only-salesforce-connection.json
```

Once the command completes successfully, the connection is created in
integrator.io, and the CLI returns the connection ID, timestamps, name, and
other resource properties:

```bash
~/Dev/salesforce-google-sheets-integration/connections ❯ celigo connections create < celigo-cli-demo-only-salesforce-connection.json
_id                           <YOUR_SALESFORCE_CONNECTION_ID>
createdAt                     2026-08-22T08:59:37.830Z
lastModified                  2026-08-22T08:59:37.863Z
type                          salesforce
name                          Celigo CLI Demo only Salesforce Connection
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
  "disableDataLoaderFile": false,
  "disableEdiServiceFlowRun": false,
  "enableDemandConcurrency": false,
  "disableDemandConcurrency": false
}
```

> **NOTE:** The connection definition contains no authentication material. For
> OAuth-based connections, authentication is handled separately through
> `celigo connections authorize` rather than stored in the resource definition.

You can verify the new connection from the integrator.io web interface or query
it directly from the CLI:

```bash
celigo connections list --format json
celigo connections list --format table
```

## Authorizing and Testing the Connection

Authorize the connection to complete the Salesforce OAuth flow:

```bash
celigo connections authorize <YOUR_SALESFORCE_CONNECTION_ID>
```

The command opens the Salesforce authorization flow in a browser and waits for
authorization to complete.

You can verify the connection at any time:

```bash
celigo connections ping 6a7ff1dbe27c416118751eb0
```

`ping` sends a test request to Salesforce using the connection's current
authentication state. If the connection has not been authorized, the command
returns an `unauthorized_connection` error:

```bash
~/Dev/s/connections ❯ celigo connections ping <YOUR_SALESFORCE_CONNECTION_ID>
errors  [
  {
    "code": "unauthorized_connection",
    "message": "Invalid or unauthorized connection. Please authorize the Salesforce connection.",
    "source": "connection"
  }
]
```

If you see this response, authorize the connection with
`celigo connections authorize` and run `ping` again.

At this point, your integration directory should look like this:

```bash
~/Dev/salesforce-google-sheets-integration ❯ tree
.
├── connections
│   └── celigo-cli-demo-only-salesforce-connection.json
└── integrations.json
```

In the next post,
[How to Create a Google Sheets Connection with Celigo CLI](/posts/celigo-cli/how-to-create-a-google-sheets-connection-with-celigo-cli/),
we’ll create and authorize the Google Sheets connection that will serve as the
import destination for the flow.

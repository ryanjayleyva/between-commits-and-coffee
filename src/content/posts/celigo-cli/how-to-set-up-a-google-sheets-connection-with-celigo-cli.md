---
title: 'How to Set Up a Google Sheets Connection with Celigo CLI'
description:
  'Learn how to create an HTTP connection for the Google Sheets API using the
  Celigo CLI, configure the OAuth 2.0 flow, request headers, and a health check,
  and authorize and verify the connection from the command line.'
published: August 16, 2026
updated: August 21, 2026
---

This tutorial is part of a series on working with the Celigo CLI and assumes
you’ve completed
[How to Set Up a Salesforce Connection with Celigo CLI](/posts/celigo-cli/how-to-set-up-a-salesforce-connection-with-celigo-cli/).
and have a working Salesforce connection configured.

This post focuses on configuring the Google Sheets connection, but the
Salesforce connection is a prerequisite for the series. The subsequent tutorials
build on both connections, so complete the Salesforce setup before continuing.

Here we're building the destination side with an HTTP connection pointed at the
Google Sheets API. A flow will tie them together later, pulling accounts out of
Salesforce and dropping them into their own tabs in a spreadsheet. The
connections directory from last time is already in place, so we can keep moving.

Since this connection follows the same workflow you already used for Salesforce,
we'll move more quickly and focus on what's different.

## Create the Google Sheets Connection

Create the connection definition file.

```bash
nvim celigo-cli-demo-only-google-sheet-connection.json
```

For this example, the file begins with a minimal definition covering the
connection name, type, and HTTP base URI.

```json
{
  "name": "Google Sheets Connection (Demo Only)",
  "type": "http",
  "description": "Demo-only Google Sheets connection intended exclusively for Celigo CLI tutorials and demonstrations. Do not use for production or internal workflows.",
  "http": {
    "formType": "http",
    "mediaType": "json",
    "baseURI": "https://sheets.googleapis.com/"
  }
}
```

Create the connection by redirecting the definition file to the CLI.

```bash
celigo connections create < celigo-cli-demo-only-google-sheet-connection.json
```

The command returns the connection with the same server assigned fields you saw
on the Salesforce connection, `_id`, `createdAt`, and defaults such as
`enableMicroBatchForOneToMany`. The output below shows the demo environment.
Your own `_id` will be different, so copy it from your terminal before you
continue. Every command in the rest of this tutorial takes that value, shown
here as `<YOUR_CONNECTION_ID>`.

```bash
~/first-integration/connections ❯ celigo connections create < celigo-cli-demo-only-google-sheet-connection.json
_id                           <YOUR_CONNECTION_ID>
createdAt                     2026-08-15T06:18:30.360Z
lastModified                  2026-08-15T06:18:30.423Z
type                          http
name                          Google Sheets Connection (Demo Only)
enableMicroBatchForOneToMany  true
enableCsvObjectParsing        true
http                          {
  "formType": "http",
  "mediaType": "json",
  "baseURI": "https://sheets.googleapis.com/",
  "concurrencyLevel": 25,
  "targetConcurrencyLevel": 25,
  "isRest": false,
  "useNewAuthFailSchema": true
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

## Configuring the Connection

A minimal definition creates the connection, but it cannot read or write
spreadsheets. A functional HTTP connection needs the adaptor, authentication,
request headers, and a health check. Extend the definition file with the
complete configuration.

```bash
nvim celigo-cli-demo-only-google-sheet-connection.json
```

The `assistant` field selects the Google Sheets adaptor, which layers the Sheets
behavior on top of the generic HTTP layer. The `auth` object declares the OAuth
flow, requesting the `spreadsheets` scope and sending the resulting token in the
`Authorization` header. The `ping` block tells integrator.io how to verify the
connection, in this case a `GET` against a known spreadsheet, so
`celigo connections ping` returns a meaningful result.

```json
{
  "name": "Google Sheets Connection (Demo Only)",
  "description": "Demo-only Google Sheets connection intended exclusively for Celigo CLI tutorials and demonstrations. Do not use for production or internal workflows.",
  "type": "http",
  "assistant": "googlesheets",
  "http": {
    "formType": "http",
    "mediaType": "json",
    "baseURI": "https://sheets.googleapis.com/",
    "concurrencyLevel": 7,
    "targetConcurrencyLevel": 25,
    "ping": {
      "relativeURI": "v4/spreadsheets/<YOUR_SPREADSHEET_ID>",
      "method": "GET"
    },
    "headers": [
      {
        "name": "accept",
        "value": "application/json"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ],
    "auth": {
      "type": "oauth",
      "oauth": {
        "scope": ["https://www.googleapis.com/auth/spreadsheets"]
      },
      "token": {
        "headerName": "Authorization",
        "scheme": " ",
        "paramName": "access_token"
      }
    }
  }
}
```

Replace `<YOUR_SPREADSHEET_ID>` with the ID of a spreadsheet. The health check
only needs access to a spreadsheet, so an empty file works.

The `auth` object above declares the scope and how the access token travels with
each request. That alone does not enable authorization. The connection also
needs OAuth client values from your own environment, the client ID, the client
secret, and the authorization endpoint URI that serves the consent screen. Those
values come from your Google Cloud project and your Celigo account and this
article intentionally leaves them out. Add them to the `auth` object yourself,
using the field names from the Celigo documentation for Google Sheets
connections. Keep the client secret out of version control.

Push the updated definition with `update`, which replaces the connection body in
full with this JSON.

```bash
celigo connections update <YOUR_CONNECTION_ID> < celigo-cli-demo-only-google-sheet-connection.json
```

Unlike `create`, `update` is scoped to an existing resource and takes the
connection ID as an argument. It sends a full replacement, so the definition you
provide must be complete. Any field you omit here is cleared from the
connection.

## Authorizing and Testing the Connection

Like the Salesforce connection, this one runs on OAuth 2.0. Tokens are absent at
creation and materialize only after the browser authorization flow completes.
The CLI handles the exchange automatically.

```bash
celigo connections authorize <YOUR_CONNECTION_ID>
```

Running the command automatically opens a browser window with the provider's
authorization URL, then polls until `needsAuthorization` clears. When it
finishes, it pings the connection to verify the handshake.

If you run `authorize` before your OAuth client configuration and authorization
endpoint URI are in place, the command fails before any browser opens.

```text
Failed to get authorization URL. Ensure the connection is configured for OAuth2.
(422): Validation error: Expected field: authURI in the Connection to be present.
```

The `authURI` field is the authorization endpoint URI for your OAuth client, the
address that shows the consent screen. This error means the connection is
missing that account specific value, not that the CLI is broken. Add the OAuth
client configuration to the connection, push it again with `update`, and run
`authorize` a second time.

You can also verify a connection is online at any time.

```bash
celigo connections ping <YOUR_CONNECTION_ID>
```

Ping sends a test request against the remote system to confirm the connection
details and credentials are valid. For this connection, that is the GET against
your spreadsheet defined in the `ping` block.

Now you should have a structure like this.

```bash
~/first-integration ❯ tree
├── connections
│   ├── {} celigo-cli-demo-only-google-sheet-connection.json
│   └── {} celigo-cli-demo-only-salesforce-connection.json
└── {} integrations.json
```

Both connections are now created and authorized. In the next post,
[How to Create a Flow with Celigo CLI](/posts/celigo-cli/how-to-create-a-flow-with-celigo-cli/),
we’ll create the flow that ties them together, attaching it to the integration
and leaving it disabled until it has a source and a destination.

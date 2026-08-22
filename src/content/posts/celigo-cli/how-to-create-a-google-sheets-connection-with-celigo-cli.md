---
title: 'How to Create a Google Sheets Connection with Celigo CLI'
description:
  'Learn how to create and configure a Google Sheets connection with the Celigo
  CLI, complete OAuth authorization, and verify the connection from the command
  line.'
published: August 16, 2026
updated: August 21, 2026
---

With the Salesforce connection in place, the next step is to create the Google
Sheets connection.

If you haven't created the Salesforce connection, start with
[How to Create a Salesforce Connection with Celigo CLI](/posts/celigo-cli/how-to-create-a-salesforce-connection-with-celigo-cli/).

## TL;DR

Create an HTTP connection for the Google Sheets API, configure the Google Sheets
adaptor, OAuth authentication, request headers, and a `ping` endpoint, then
update the connection with `celigo connections update`. Authorize the connection
with `celigo connections authorize` and verify it with
`celigo connections ping`.

This connection serves as the destination for the flow we'll build later. It
uses HTTP to connect to the Google Sheets API and write Salesforce account data
to dedicated spreadsheet tabs.

## Create the Google Sheets Connection

Create the connection definition:

```bash
vim celigo-cli-demo-only-google-sheet-connection.json
```

Start with the connection `name` and `type`, then define the HTTP `mediaType`
and `baseURI`:

```json
{
  "name": "Celigo CLI Demo Only Google Sheets Connection",
  "type": "http",
  "http": {
    "mediaType": "json",
    "baseURI": "https://sheets.googleapis.com/"
  }
}
```

Create the connection:

```bash
celigo connections create < celigo-cli-demo-only-google-sheet-connection.json
```

The CLI returns the created resource, including the assigned `_id` and server
defaults. Copy the `_id`; you'll use it for the remaining commands in this post.

```bash
~/Dev/salesforce-google-sheets-integration/connections ❯ celigo connections create < celigo-cli-demo-only-google-sheets-connection.json
_id                           <YOUR_GOOGLE_SHEETS_CONNECTION_ID>
createdAt                     2026-08-22T10:34:39.015Z
lastModified                  2026-08-22T10:34:39.054Z
type                          http
name                          Celigo CLI Demo Only Google Sheets Connection
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
  "disableDataLoaderFile": false,
  "disableEdiServiceFlowRun": false,
  "enableDemandConcurrency": false,
  "disableDemandConcurrency": false
}
```

## Configuring the Connection

The initial definition creates the connection but does not yet provide the
configuration required to access Google Sheets. Add the Google Sheets adaptor,
OAuth authentication, request headers, and a health check.

```bash
vim celigo-cli-demo-only-google-sheet-connection.json
```

The `assistant` field selects the Google Sheets adaptor. The `auth` block
defines the OAuth flow and spreadsheet scope, `headers` defines the API request
headers, and `ping` defines the `GET` request used by `celigo connections ping`.

```json
{
  "_id": "<YOUR_GOOGLE_SHEETS_CONNECTION_ID>",
  "name": "Celigo CLI Demo Only Google Sheets Connection",
  "type": "http",
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
    "assistant": "googlesheets",
    "_iClientId": "<YOUR_iClientId>",
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
        "grantType": "authorizecode",
        "useIClientFields": true,
        "authURI": "https://accounts.google.com/o/oauth2/auth",
        "tokenURI": "https://accounts.google.com/o/oauth2/token",
        "scope": ["https://www.googleapis.com/auth/spreadsheets"]
      }
    }
  }
}
```

Replace `<YOUR_SPREADSHEET_ID>` with your spreadsheet ID.

> **NOTE:** The spreadsheet ID is the value between `/d/` and `/edit` in the
> URL.

```bash
https://docs.google.com/spreadsheets/d/1AbC..........xyz123/edit
                                      └── spreadsheet ID ──┘
```

Set `relativeURI` to `v4/spreadsheets/<YOUR_SPREADSHEET_ID>`. Combined with the
connection's `baseURI`, this resolves to:

```bash
GET https://sheets.googleapis.com/v4/spreadsheets/<YOUR_SPREADSHEET_ID>
```

With the definition complete, update the existing connection:

```bash
celigo connections update <YOUR_GOOGLE_SHEETS_CONNECTION_ID> < celigo-cli-demo-only-google-sheet-connection.json
```

Unlike `create`, `update` is scoped to an existing resource and takes the
connection ID as an argument. It sends a full replacement, so the definition you
provide must be complete. Any field you omit here is cleared from the
connection.

## Authorizing and Testing the Connection

The connection is ready to authorize. Run:

```bash
celigo connections authorize <YOUR_GOOGLE_SHEETS_CONNECTION_ID>
```

The CLI opens the Google authorization flow in your browser and waits for
authorization to complete. Once authorized, it pings the connection to verify
access.

You can also verify a connection is online at any time.

```bash
celigo connections ping <YOUR_GOOGLE_SHEETS_CONNECTION_ID>
```

`ping` sends the configured `GET` request against the spreadsheet to verify that
the connection can authenticate and access the Google Sheets API.

At this point, your integration structure should look like this:

```bash
~/salesforce-google-sheets-integration ❯ tree
.
├── connections
│   ├── celigo-cli-demo-only-google-sheet-connection.json
│   └── celigo-cli-demo-only-salesforce-connection.json
└── integrations.json
```

Both connections are now configured and authorized. In the next post,
[How to Create a Flow with Celigo CLI](/posts/celigo-cli/how-to-create-a-flow-with-celigo-cli/),
we’ll create the flow that ties them together.

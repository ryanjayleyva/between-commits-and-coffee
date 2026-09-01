---
title: 'How to Schedule a Flow with Celigo CLI'
description:
  'Learn how to schedule a Celigo flow with cron, set the schedule and timezone
  with the celigo flows set command, or add them to the flow definition and push
  it with celigo flows update.'
published: August 26, 2026
updated: August 30, 2026
---

The flow now has a Salesforce export as its source and a Google Sheets import as
its destination, and it runs when you invoke it with `celigo flows run`. The
next step is to make it run on its own. This post adds a recurring schedule.
Every Monday at 8:05 AM Eastern, the flow pulls accounts from Salesforce and
appends them to the sheet. If you haven't built the import yet, start with
[How to Create a Google Sheets Import with Celigo CLI](/posts/celigo-cli/how-to-create-a-google-sheets-import-with-celigo-cli/).

## TL;DR

Celigo CLI schedules use 6-field cron in the form
`"? minute hour dayOfMonth month dayOfWeek"`, with `?` always in the leading
position. Pair `schedule` with an IANA `timezone`. To change nothing but the
schedule, use
`celigo flows set <YOUR_FLOW_ID> schedule="? 5 8 ? * 1" timezone=America/New_York`.
To keep scheduling in the definition file, add the two fields to the flow JSON
and push it with
`celigo flows update <YOUR_FLOW_ID> --file celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json`.
`set` touches only the fields you name, while `update --file` replaces the whole
flow, so the file must mirror the server's current state first.

## The Schedule Expression

Celigo uses a 6-field cron format with seconds in the first position. The first
position is `?`. Unlike the 5-field cron used by most Linux systems, the first
position is seconds, and Celigo always leaves it as `?`.

| Position     | Value | Meaning      |
| ------------ | ----- | ------------ |
| seconds      | `?`   | always `?`   |
| minutes      | `5`   | minute 5     |
| hours        | `8`   | hour 8, 8 AM |
| day of month | `?`   | unused       |
| month        | `*`   | every month  |
| day of week  | `1`   | Monday       |

`*` matches every value in its position. Day of week `1` is Monday.

Reading `"? 5 8 ? * 1"` position by position gives minute 5, hour 8, any month,
Monday. The day-of-month position is `?` because a Celigo cron cannot set day of
month and day of week at the same time, so the unused position must be `?`. The
flow runs at 8:05 AM on Mondays.

> **NOTE:** Keep the leading `?`. A 5-field expression like `"5 8 * * 1"` omits
> the seconds position and fails with `Invalid cron expression`.

The schedule resolves in the flow's `timezone`. Set it to an IANA name such as
`America/New_York`. Celigo does not shift cron schedules for daylight saving
time automatically. A run scheduled inside the 1:00 to 3:00 AM window on a
changeover day can be skipped or fire twice. 8:05 AM sits well outside that
window, so the Monday runs keep their wall-clock time.

Without `timezone` set, the API defaults to UTC, while the integrator.io UI
falls back to the account owner's profile timezone. An explicit IANA name
removes the ambiguity.

## Setting the Schedule with the set Command

`celigo flows set` changes specific fields on the live flow. Add the schedule
and timezone in a single command.

```bash
celigo flows set <YOUR_FLOW_ID> schedule="? 5 8 ? * 1" timezone=America/New_York
```

The quotes are required. Both `*` and `?` are glob characters. Unquoted, the
shell expands them against files in the current directory before `celigo` ever
sees the value.

`set` works on individual key=value assignments rather than a full document. The
CLI writes the flow back in place, but how it does so depends on the field.
Fields like `name`, `disabled`, and `schedule.cron` sit on the atomic patch
whitelist, so they are applied with a single `PATCH` that touches only what you
named. A cron-string `schedule` (the bare key) and `timezone` sit outside that
whitelist, so they take the retrieve-merge-write path instead. The CLI reads the
flow, applies the assignments, and writes the whole flow back. Either way, every
field you did not name is carried through untouched. The command does not look
at the definition file and does not care whether it is in sync with the server.

## Adding the Schedule to the Definition File

If the flow definition file is the artifact you review and deploy, keep the
schedule there. Open the flow definition.

```bash
vim celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

Add `schedule` and `timezone` alongside the existing fields. The cron string
goes through unchanged, and only the quotes differ from the shell form.

```json
{
  "_id": "<YOUR_FLOW_ID>",
  "_integrationId": "<YOUR_INTEGRATION_ID>",
  "name": "Salesforce Accounts to Google Sheets",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "disabled": true,
  "schedule": "? 5 8 ? * 1",
  "timezone": "America/New_York",
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

Push the file.

```bash
celigo flows update <YOUR_FLOW_ID> --file celigo-cli-demo-only-salesforce-accounts-to-google-sheets.json
```

`update` does not merge the file with the live flow. It replaces the flow body
with the file body. Anything the server has that the file omits is dropped.

That matters here. The running flow carries fields the hand-written file does
not, including `autoResolveMatchingTraceKeys` set to `true`, `logging` set to
account level, the page generator's `skipRetries`, and the page processor's
`responseMapping`. The file also says `disabled: true` while the flow is
currently enabled. Pushing the file as-is resets all of those.

Check the current state before a file-based push, and bring the file up to it.

```bash
celigo flows get <YOUR_FLOW_ID>
```

Copy the fields the server returns that the file lacks, set `disabled` to its
real value, and only then push. The file must be the flow's complete, current
description, plus the schedule you are adding.

## Choosing Between set and update

| Aspect                | celigo flows set             | celigo flows update --file       |
| --------------------- | ---------------------------- | -------------------------------- |
| What gets sent        | only the assigned fields     | the entire file body             |
| Fields you don't name | preserved                    | dropped if absent from the file  |
| Needs a synced file   | no                           | yes                              |
| Source of truth       | the live flow                | the definition file              |
| Best for              | schedule, timezone, disabled | full flow definitions you review |

For adding a schedule to a flow that is already running, `set` is the minimal
change, since it cannot disturb anything else. `update --file` is the right tool
when the definition file is the artifact you maintain, which is the pattern this
series has followed all along. The schedule itself is identical either way. What
differs is how much of the flow you commit to the server along with it.

## Verifying the Schedule

Confirm the schedule is on the flow.

```bash
celigo flows get <YOUR_FLOW_ID>
```

The response now includes `schedule` and `timezone`. The output below is trimmed
to the fields that changed or matter for this post.

```json
{
  "_id": "<YOUR_FLOW_ID>",
  "name": "Salesforce Accounts to Google Sheets",
  "description": "For https://rjleyva.com Celigo CLI demonstration only.",
  "disabled": false,
  "schedule": "? 5 8 ? * 1",
  "timezone": "America/New_York",
  "pageGenerators": [
    {
      "_exportId": "<YOUR_EXPORT_ID>",
      "skipRetries": false
    }
  ],
  "pageProcessors": [
    {
      "type": "import",
      "_importId": "<YOUR_IMPORT_ID>",
      "responseMapping": {
        "fields": [],
        "lists": []
      }
    }
  ],
  "autoResolveMatchingTraceKeys": true,
  "logging": {
    "mode": "accountLevel"
  }
}
```

The flow is scheduled to run every Monday at 8:05 AM Eastern. It pulls the
Salesforce accounts and appends them to the sheet without any manual
intervention. You can still trigger the flow on demand with `celigo flows run`.
The schedule is an additional trigger, not a replacement for manual runs.

In the next post,
[How to Track a Celigo CLI Integration with Git](/posts/celigo-cli/how-to-track-a-celigo-cli-integration-with-git)
we’ll put the Celigo definition files under
[Git](https://git-scm.com/) so integration changes can be tracked, reviewed, and
reproduced.

---
title: 'How to Get Started with Celigo CLI'
description:
  'Learn how to install and configure the Celigo CLI, authenticate with an
  integrator.io account, manage profiles, and use basic Celigo CLI commands to
  list integrations and flows.'
published: August 12, 2026
updated: August 22, 2026
---

The Celigo CLI provides a programmatic interface to the integrations and flows
you manage in integrator.io. It brings those resources into the command line,
providing a pragmatic way to incorporate Celigo operations into CI/CD pipelines,
development workflows, and automation.

## TL;DR

Install the Celigo CLI with npm, configure a profile with an integrator.io API
token, and use `celigo integrations list` and `celigo flows list` to inspect
your resources. Use `table` for readable output and `json` for structured data.

> **NOTE:** Installing and configuring the Celigo CLI does not require a Celigo
> account. An active integrator.io subscription is required to authenticate the
> CLI and connect it to your Celigo environment using an API token. If you don't
> have a subscription, you can request a free trial from Celigo.

## Prerequisites

[Node.js 22](https://nodejs.org/en) or later is required. Node.js includes npm,
which the Celigo CLI uses for installation. Once Node.js is installed, you can
install the CLI the same way on Linux, macOS, and Windows.

The examples below use Linux and macOS. On Windows, install Node.js using the
[official installer](https://nodejs.org/en/download).

### Linux

On Arch-based distributions, you can install Node.js and npm with `pacman`:

```bash
sudo pacman -S nodejs npm
```

On Arch, nodejs and npm are separate packages, so install both. Arch ships a
current Node.js release (or an LTS branch such as nodejs-lts-jod for Node 22),
so no third-party repository is required.

On Debian-based distributions such as Ubuntu, you can add the
[NodeSource repository](https://github.com/nodesource/distributions) and install
Node.js with apt:

```bash
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
```

On Fedora or RHEL-based distributions, you can install Node.js with `dnf`:

```bash
sudo dnf install -y nodejs
```

### macOS

On macOS, you can install Node.js with Homebrew:

```bash
brew install node
```

Verify that Node.js and npm are available:

```bash
node --version
npm --version
```

## Installing the Celigo CLI

Once Node.js and npm are available, install the Celigo CLI globally using npm:

```bash
npm install -g @celigo/celigo-cli
```

A global install puts the `celigo` command on your path, so it works from any
directory.

Verify the installation:

```bash
celigo --version
```

If the installation was successful, the command returns the installed version:

```bash
2026.8.6
```

## Inspecting the Celigo CLI Skills

The Celigo CLI also installs Celigo-specific skills for supported AI coding
agents. The skills provide context about integrator.io concepts and development
workflows. During installation, the CLI creates symbolic links to them in the
agent's skills directory. The location of that directory depends on the agent.

For example, with pi.dev:

```bash
ls -la ~/.pi/agent/skills/
```

You should see Celigo-specific skills represented as symbolic links:

```bash
building-apis -> ../../../.agents/skills/building-apis/
building-b2b -> ../../../.agents/skills/building-b2b/
building-flows -> ../../../.agents/skills/building-flows/
building-mcp-servers -> ../../../.agents/skills/building-mcp-servers/
building-tools -> ../../../.agents/skills/building-tools/
configuring-ai-agents -> ../../../.agents/skills/configuring-ai-agents/
configuring-connections -> ../../../.agents/skills/configuring-connections/
configuring-exports -> ../../../.agents/skills/configuring-exports/
configuring-filters -> ../../../.agents/skills/configuring-filters/
configuring-guardrails -> ../../../.agents/skills/configuring-guardrails/
configuring-imports -> ../../../.agents/skills/configuring-imports/
configuring-lookup-caches -> ../../../.agents/skills/configuring-lookup-caches/
getting-started -> ../../../.agents/skills/getting-started/
managing-api-tokens -> ../../../.agents/skills/managing-api-tokens/
managing-integrations -> ../../../.agents/skills/managing-integrations/
managing-on-premise-agents -> ../../../.agents/skills/managing-on-premise-agents/
managing-stacks -> ../../../.agents/skills/managing-stacks/
managing-users -> ../../../.agents/skills/managing-users/
troubleshooting-flows -> ../../../.agents/skills/troubleshooting-flows/
using-marketplace-templates -> ../../../.agents/skills/using-marketplace-templates/
writing-handlebars -> ../../../.agents/skills/writing-handlebars/
writing-mappings -> ../../../.agents/skills/writing-mappings/
writing-scripts -> ../../../.agents/skills/writing-scripts/
writing-sql -> ../../../.agents/skills/writing-sql/
```

The `->` notation indicates that these entries are symbolic links rather than
regular directories.

## Configuring the CLI

After installation, the Celigo CLI creates a `~/.celigo` directory. Its
`config.json` file contains the CLI configuration, including connection details,
authentication credentials, active profiles, and the default output format.

For this example, I'll use Vim to edit the configuration file:

```bash
vim ~/.celigo/config.json
```

> **IMPORTANT:** Treat your API token as a credential. Never commit
> `~/.celigo/config.json` to source control or share it with a valid token. If a
> token is accidentally exposed, revoke it immediately and generate a new one in
> integrator.io.

Add or update the configuration so it looks like this:

```json
{
  "active_profile": "default",
  "profiles": {
    "default": {
      "base_url": "https://api.integrator.io",
      "api_token": "<YOUR_INTEGRATOR.IO_API_TOKEN>",
      "default_format": "json"
    }
  }
}
```

`active_profile` determines which profile the CLI uses by default. `base_url` is
the integrator.io API endpoint the CLI communicates with, and `api_token`
authenticates requests against that environment. You can create and manage these
tokens in [integrator.io](https://integrator.io/accesstokens)

There are two types of token:

| Token type                  | When to use                                                                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal access token (PAT) | Tied to your own user and carries the same permissions you do. The quickest option for a developer working with the CLI day to day.                                                                      |
| Account API token           | Created by an owner or administrator and can be limited to a specific set of resources instead of the whole account. Prefer it for automation that needs to keep working beyond any one person's access. |

`default_format` controls how command results are rendered. Use `table` for
readable output and `json` for structured data. You can override the default for
individual commands:

```bash
celigo integrations list --format table
```

### Configuring Multiple Profiles

If you work across multiple Celigo environments, use separate profiles to
isolate their connection and authentication settings:

```json
{
  "active_profile": "prod",
  "profiles": {
    "prod": {
      "api_token": "<PRODUCTION_API_TOKEN>",
      "base_url": "https://api.integrator.io",
      "default_format": "table"
    },
    "eu": {
      "api_token": "<EU_API_TOKEN>",
      "base_url": "https://api.eu.integrator.io"
    },
    "sandbox": {
      "api_token": "<SANDBOX_API_TOKEN>",
      "base_url": "https://api.integrator.io",
      "default_format": "json"
    }
  }
}
```

The active profile determines where subsequent commands run. Switch profiles
explicitly:

```bash
celigo profile use eu
```

Subsequent commands use the selected profile until you switch to another one.

For available CLI configuration options and supported environments, see the
[Celigo CLI Configuration reference](https://developer.celigo.com/cli/getting-started/configuration).

## Verifying the CLI

With the CLI configured and authenticated, use these commands to inspect your
integrations and flows:

```bash
celigo integrations list
celigo flows list
```

Both support the same output formats:

```bash
celigo integrations list --format json
celigo integrations list --format table
```

The same output options apply across CLI resources, so the pattern remains
consistent as you work with other commands.

You now have a configured CLI environment and can query integrations and flows
directly from the terminal. In the next post,
[How to Create an Integration with Celigo CLI](/posts/celigo-cli/how-to-create-an-integration-with-celigo-cli/),
we'll move from inspecting existing resources to creating your first
integration.

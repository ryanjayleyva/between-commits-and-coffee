---
title:
  'Celigo CLI: Getting Started with the integrator.io Command Line Interface'
description:
  'Learn how to install and configure the Celigo CLI, authenticate with an
  integrator.io account, manage profiles, and use basic Celigo CLI commands to
  list integrations and flows.'
published: August 12, 2026
updated: August 14, 2026
---

The Celigo CLI provides a command-line interface for working with integrator.io
resources. It allows you to manage integrations and flows programmatically and
incorporate integrator.io configuration into scripts, automation, and
development workflows.

In this guide, we'll install the CLI, configure authentication, create a
profile, and use the CLI to inspect integrations and flows. We'll also look at
output formats and the local configuration stored in `~/.celigo/config.json`.

By the end, you'll have a working CLI environment and the foundation needed for
the rest of this series.

> NOTE: You can install and set up the Celigo CLI without a Celigo account.
> However, you will need an active integrator.io subscription to authenticate
> and connect the CLI to your Celigo environment. If you don't have a
> subscription, you can request a free trial from Celigo.

## Prerequisites

Before installing the Celigo CLI, make sure [Node.js 22](https://nodejs.org/en)
or later is available in your development environment. The CLI is distributed
through npm, which is included with Node.js.

You can install Node.js using the official installer or a version manager such
as [Node Version Manager](https://github.com/nvm-sh/nvm).

If you use Homebrew, you can install Node.js with:

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

Installing the CLI globally makes the `celigo` command available from your
terminal, allowing you to use it from any directory in your development
environment.

Verify the installation:

```bash
celigo --version
```

If the installation was successful, the command will return the installed
version of the Celigo CLI.

```bash
2026.8.6
```

## AI Coding Agent Skills

The Celigo CLI also installs Celigo-specific skills for supported AI coding
agents. These skills provide context about integrator.io concepts and
development workflows, allowing supported AI tools to work with Celigo resources
more effectively.

The CLI installs the skills and creates symbolic links in the agent's skills
directory. The exact location depends on the AI coding agent you're using.

For example, with pi.dev:

```bash
ls -la ~/.pi/agent/skills/
```

You should see Celigo-specific skills represented as symbolic links.

> NOTE: The exact set of skills and their installation paths may change between
> CLI releases and supported AI coding agents.

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
regular directories. The links point back to the skill definitions installed by
the Celigo CLI.

> IMPORTANT: The Celigo CLI configures AI agent skills during installation. Make
> sure your AI development tool is installed before installing the Celigo CLI so
> the installer can detect the available agent environment and create the
> appropriate skill links. If you installed the Celigo CLI before setting up
> your AI development tool, reinstall the Celigo CLI after the agent is
> installed:

```bash
npm install -g @celigo/celigo-cli
```

## Configuration

After installing the Celigo CLI, the CLI creates a `~/.celigo` directory in your
home directory. The directory contains `config.json`, which stores the Celigo
CLI configuration, including connection details, authentication credentials,
active profiles, and the default output format.

The configuration is profile-based. Each profile defines the settings the CLI
uses when communicating with an integrator.io environment.

For this example, I'll use Neovim to edit the configuration file:

```bash
nvim ~/.celigo/config.json
```

Add or update the configuration so it looks like this:

> IMPORTANT: Treat your API token as a credential. Do not commit
> `~/.celigo/config.json` to source control or share the file if it contains a
> valid token.

```json
{
  "active_profile": "default",
  "profiles": {
    "default": {
      "base_url": "https://api.integrator.io",
      "api_token": "<YOUR_INTEGRATOR.IO_API_TOKEN>",
      "default_format": "table"
    }
  }
}
```

The `active_profile` property determines which profile the CLI uses by default.
In this example, the active profile is `default`.

The `base_url` specifies the integrator.io API endpoint the CLI will communicate
with.

The `api_token` is used to authenticate requests against that environment.

The `default_format` controls how command results are displayed in the terminal.
Setting it to table makes command output easier to read interactively. You can
also switch to JSON when you need structured output for inspection or other
tooling.

The output format can also be overridden for individual commands without
changing the configured default. For example:

```bash
celigo integrations list --format json
```

This allows you to keep table as the default for interactive use while
requesting JSON when a specific command requires structured output.

If you work with multiple Celigo environments or accounts, you can define
multiple CLI profiles in the same configuration file.

You can maintain separate profiles for production, another account, and a
sandbox environment:

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

Each profile defines the connection and CLI settings used when interacting with
a specific integrator.io environment or account.

The `active_profile` property determines which profile the CLI uses by default.
In this example, prod is the active profile.

You can switch the active profile without manually editing the configuration
file:

```bash
celigo profile use eu
```

After switching profiles, subsequent commands use the selected profile unless
you explicitly override the profile or other command options.

This profile-based approach is useful when working across multiple Celigo
environments because each environment keeps its connection and authentication
settings separate while using the same CLI configuration.

For more information about the available CLI configuration options and supported
environments, refer to the
[Celigo CLI Documentation](https://developer.celigo.com/cli).

## Querying Integrations and Flows

With the CLI configured and authenticated, you can use it to inspect and work
with resources in your integrator.io environment.

The primary commands for discovery are:

```bash
celigo integrations list
celigo flows list
```

Both commands support the same output formats:

```bash
# Human-readable output
celigo integrations list --format table
```

```bash
# Structured output
celigo integrations list --format json
```

Use `table` when working interactively in the terminal. Use `json` when the
output will be consumed by scripts, automation, or other tooling.

The same output options apply to flows:

```bash
celigo flows list --format json
```

### Choosing an output format

| Format | Best for                                                      |
| ------ | ------------------------------------------------------------- |
| table  | Interactive terminal use and quick inspection                 |
| json   | Automation, scripting, filtering, and programmatic processing |

This common output pattern applies across CLI resources, so once you understand
it for one command, you can apply the same approach to other Celigo CLI
commands.

Now have a configured CLI environment and can query integrations and flows
directly from the terminal.

In the next post,
[Creating Your First Integration with the Celigo CLI](/posts/creating-your-first-integration-with-celigo-cli/),
we'll move beyond inspecting existing resources and create our first integration
using the Celigo CLI.

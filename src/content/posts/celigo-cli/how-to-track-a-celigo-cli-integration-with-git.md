---
title: 'How to Track a Celigo CLI Integration with Git'
description:
  'Learn how to track a Celigo CLI integration with Git, scan for leaked
  credentials with gitleaks, and keep the integration definition files under
  version control.'
published: August 30, 2026
updated: September 1, 2026
---

The flow now has a Salesforce export as its source, a Google Sheets import as
its destination, and a recurring schedule. The next step is to put the
integration definition files under version control with Git.

Git isn't required to run the integration. It becomes valuable when the
integration evolves and you need a reliable way to understand, review, and roll
back changes. With the definition files under version control, changes to the
integration become explicit file changes. You can inspect the diff, review it
before deploying, and restore a previous version when necessary.

We'll use GitHub as the remote repository. A hosted remote gives you a central
place to store the repository and collaborate without running your own Git
server.

## TL;DR

Install Git and gitleaks. Create a `.gitignore` that excludes `.celigo/` and
`.env`. Initialize the repository. Wire up the
[pre-commit](https://pre-commit.com/) framework with the gitleaks hook so
credentials are scanned automatically on every commit. Stage the definition
files, run a manual scan with `gitleaks git --staged .`, and make the first
commit. The hook compiles the gitleaks binary on the first commit; later commits
are fast.

## Choosing a Workflow

With Celigo CLI, you can work with an integration directly through CLI commands,
or retrieve its definition, edit it as files, and update the integration from
those changes.

In this series, I used the definition-file approach. It's the workflow I prefer
because it makes the integration configuration explicit and gives us something
concrete to inspect, modify, diff, and review with Git.

This is also how I tend to approach integration development. When configuration
can be represented as code, I prefer keeping it in a form that can be inspected
and versioned. It lets us apply familiar software-engineering practices such as
diffing, code review, and version control to integration configuration.

With the workflow chosen, the next steps install the tools, create the ignore
rules, initialize the repository, and wire up the pre-commit hook.

## Installing Git

Git is available through your distribution's package manager on Linux, through
Homebrew on macOS, and through the Git for Windows installer or `winget` on
Windows.

### Linux

On Debian-based distributions such as Ubuntu, install Git with `apt`:

```bash
sudo apt install git
```

On Fedora or RHEL-based distributions, install Git with `dnf`:

```bash
sudo dnf install git
```

On Arch-based distributions, install Git with `pacman`:

```bash
sudo pacman -S git
```

### macOS

On macOS, install Git with Homebrew:

```bash
brew install git
```

### Windows

On Windows, install Git for Windows from the
[official installer](https://git-scm.com/download/win), or from the command
prompt or PowerShell with `winget`:

```bash
winget install --id Git.Git -e --source winget
```

### Verifying the Installation

Check that Git is available and confirm the installed version:

```bash
git --version
```

On Windows, reopen the terminal after the installer finishes so the `git`
command is available on your PATH.

## Installing Gitleaks

Gitleaks scans staged files and Git history for credentials such as API tokens
and keys. Install it so the scan runs from your machine before anything is
pushed to GitHub.

### Linux

There is no single distribution package for gitleaks. Download the release
binary for your architecture from the
[releases page](https://github.com/gitleaks/gitleaks/releases) and add it to
PATH. For x64 systems with the current release:

```bash
wget https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
tar -xzf gitleaks_8.30.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

On ARM-based Linux systems, download the `linux_arm64` archive instead.

### macOS

On macOS, install gitleaks with Homebrew:

```bash
brew install gitleaks
```

### Windows

On Windows, install gitleaks from the command prompt or PowerShell with
`winget`:

```bash
winget install --id Gitleaks.Gitleaks -e
```

### Verifying the Installation

Confirm gitleaks is available and its version:

```bash
gitleaks version
```

## Creating the Git Ignore Rules

Before the first commit, decide what belongs in the repository. The definition
files (`integrations.json`, `connections/`, `exports/`, `flows/`, `imports/`)
hold resource IDs and references, not credentials, so they are safe to commit
and push to GitHub.

The thing that must never reach the repository is the Celigo CLI configuration.
Your API token lives in `~/.celigo/config.json`, outside the project directory,
so `git init` leaves it alone. Keep it that way. If you ever copy the CLI config
or other credentials into the project, a `.gitignore` keeps them from being
staged.

Create a `.gitignore` file in the project root:

```bash
vim .gitignore
```

```gitignore
.celigo/
.env
```

`.celigo/` excludes any copy of the CLI configuration directory, and `.env`
excludes environment files that commonly hold credentials.

## Initializing Git

Move into the `salesforce-google-sheets-integration` directory and initialize a
repository:

```bash
cd salesforce-google-sheets-integration
git init
```

`git init` creates the `.git` directory in the project, where Git stores
repository state. Confirm it with:

```bash
ls -la
```

The `.git` entry is present, and the repository is initialized.

## Configuring the Pre-Commit Hook

The cleanest way to scan for credentials is to make gitleaks run automatically
on every commit, so a secret can't slip in because the scan step was skipped.
The [pre-commit](https://pre-commit.com/) framework runs hooks before each
commit, and gitleaks publishes an official hook.

On Linux and Windows, install it with pip:

```bash
pip install pre-commit
```

On macOS, install pre-commit with Homebrew:

```bash
brew install pre-commit
```

Create a `.pre-commit-config.yaml` file in the project root:

```bash
vim .pre-commit-config.yaml
```

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks
```

Install the hook:

```bash
pre-commit install
```

The hook runs `gitleaks git --pre-commit --redact --staged --verbose` on every
commit. It scans only the staged changes and redacts any match from its output,
so a credential isn't echoed to your terminal. The first commit takes a few
minutes while pre-commit compiles the gitleaks binary. Later commits are fast.
Pin `rev` to a release and update it periodically with `pre-commit autoupdate`.

If you installed the gitleaks binary yourself, swap `id: gitleaks` for
`id: gitleaks-system` to have the hook use that binary instead of compiling one.

> **NOTE:** Git hooks can be skipped with `git commit --no-verify`, so the local
> hook is a first line of defense. GitHub's push protection is a second one, and
> it is on by default for free accounts and public repositories, blocking pushes
> that contain known secrets.

## Making the First Commit

With the repository initialized, the ignore rules in place, and the pre-commit
hook installed, the first commit brings the definition files under version
control.

### Reviewing What Git Sees

Stage all of the definition files and check what Git is about to commit:

```bash
git add .
git status
```

`git status` lists the files Git has staged. You should see the definition
directories and `integrations.json` listed as new files:

```bash
On branch main
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .gitignore
        .pre-commit-config.yaml
        integrations.json
        connections/
        exports/
        flows/
        imports/
```

Nothing from `~/.celigo/` appears because it is outside the project directory.
Nothing from `.celigo/` or `.env` appears because the `.gitignore` rules exclude
them.

If you see a file you did not intend to stage, remove it with
`git reset HEAD <file>` before continuing.

### Scanning the Staged Files

Run the same gitleaks scan that the pre-commit hook will run, without actually
committing:

```bash
gitleaks git --staged .
```

A clean scan produces no output and exits with status 0. If gitleaks finds a
match, it redacts the value and reports the file and rule that triggered it. Fix
the finding before committing, or add a documented exception if the finding is a
false positive.

When the hook is installed, this scan runs automatically on every commit. The
manual step here confirms that the staged files are clean before you create the
commit.

### Creating the Commit

With a clean scan, commit the staged files:

```bash
git commit -m "Initial commit"
```

The pre-commit hook runs the gitleaks scan before the commit proceeds. If the
scan finds a credential, the commit is blocked and you see the finding in the
output. If the scan is clean, the commit is created.

Verify the commit:

```bash
git log --oneline
```

```
a1b2c3d Initial commit
```

The definition files are now under version control. Team members can clone the
repository and start contributing. Pull requests and issues on GitHub give you a
review layer for integration changes. Keep the repository private if the
definition files reference internal resource IDs, or public if the integration
is a template others can learn from.

That is the workflow I use to build and maintain Celigo integrations with the
CLI.

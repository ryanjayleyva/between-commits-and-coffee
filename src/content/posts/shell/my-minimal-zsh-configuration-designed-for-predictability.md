---
title: 'My Minimal Zsh Configuration, Designed for Predictability'
description:
  'A walkthrough of my minimal, framework-free Zsh configuration on macOS,
  focusing on explicit dependencies, startup cost, portability, and the
  tradeoffs behind keeping shell configuration simple.'
published: September 4, 2026
updated: September 8, 2026
---

My `~/.zshrc` is minimal, and that is the point. I let standalone tools handle
most of the functionality: `zoxide` for navigation, `eza` for listing, and
Powerlevel10k for the prompt. Homebrew handles the packages, while the shell
configuration mostly wires everything together.

This article is me walking through what that config does and why. It is about my
setup on macOS with Apple Silicon and Zsh 5.9 as the default shell. Where
something is version-dependent or machine-specific, I say so.

## TL;DR

There isn't much to my `.zshrc`. It loads the environment from `~/env`, sets up
completion and the prompt, initializes the tools I use, and defines a handful of
aliases.

I don't use a Zsh framework or plugin manager. I load the few pieces I want
directly.

It's not meant to be a universal Zsh setup. It's just enough shell configuration
to make this particular machine comfortable to use.

## Configuration Layout

Three files matter:

```
~/.zshrc                      # thin orchestrator
~/env/macos/env.zsh           # platform-specific environment (sourced)
~/.p10k.zsh                   # Powerlevel10k prompt config (generated)
```

`~/env` is its own Git repo, managed with GNU Stow. Shell config, scripts, docs,
and a Homebrew `Brewfile` all live there, and a fresh machine gets them with:

```bash
stow -t ~ -d macos .
stow -t ~ -d shared .
```

`~/.zshrc` handles platforms by loading one file:

```zsh
case "$(uname)" in
  Darwin)
    source "$HOME/env/macos/env.zsh"
    ;;
  *)
    echo "Unsupported platform: $(uname)"
    return 1
    ;;
esac
```

Everything that differs between operating systems lives in `env.zsh`. The
Homebrew install path, the plugin paths, the `PNPM_HOME` location, all of it.
Add a Linux machine later and I write a `~/env/linux/env.zsh`; `~/.zshrc` does
not change.

The `return` rather than `exit` is deliberate. `~/.zshrc` is sourced, not
executed, so `return` stops this file and leaves the shell alive. `exit` would
kill the whole login process.

## Configuring Shell Behavior

`env.zsh` does the real environment work:

```zsh
path=(
  /opt/homebrew/bin
  $path
)

P10K_SOURCE="/opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme"
ZSH_AUTOSUGGESTIONS_SOURCE="/opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
ZSH_SYNTAX_HIGHLIGHTING_SOURCE="/opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

PNPM_HOME="$HOME/Library/pnpm"
```

The lowercase `path` is the array form of `PATH`. Zsh keeps the two in sync, so
this is just a readable way to prepend `/opt/homebrew/bin`. That matters on
Apple Silicon, where Homebrew's directory is not on the default `PATH`. The
prepend makes Homebrew binaries like `git`, `nvim`, and `eza` win any name
collision.

I store the plugin paths in variables instead of sourcing them here. The instant
prompt has to render before the plugins load, so the actual `source` happens
later in `~/.zshrc` at the right point in the order. The `Brewfile` declares
these packages, so `brew bundle` keeps the paths valid on a new machine.

Back in `~/.zshrc`:

```zsh
export PATH
export PNPM_HOME
```

These two lines look redundant but are not. `path` was mutated by array
assignment, and the tied `PATH` keeps its inherited export attribute on its own,
so `export PATH` is harmless belt-and-suspenders. `export PNPM_HOME` is the one
that matters: `env.zsh` only assigns the scalar, and plain `VAR=value`
assignments are not exported in Zsh, so child processes reading `PNPM_HOME`
would see nothing without it.

Then:

```zsh
export EDITOR="nvim"
export BAT_THEME="ansi"
```

`EDITOR` points at Neovim so Git and CLIs open the right editor. `BAT_THEME`
keeps `bat` output readable without fighting the prompt's palette.

And `PATH` deduplication:

```zsh
typeset -U path PATH
```

`typeset -U` makes the array unique. Duplicate entries get dropped every time
`path` changes. Since env.zsh prepends Homebrew and `~/.zshrc` later prepends
`PNPM_HOME/bin`, duplicates would accumulate across re-sources without it.

## History

I do not configure history at all. `~/.zshrc` never touches `HISTSIZE` or
`SAVEHIST`. The values come from macOS's `/etc/zshrc`: `HISTSIZE=2000`,
`SAVEHIST=1000`, with `HISTFILE` at `~/.zsh_history`.

I won't pretend this is a considered decision. It is mostly inertia, and it
works. `HISTSIZE` is commands kept in memory, `SAVEHIST` is commands written to
the file. Making `SAVEHIST` smaller than `HISTSIZE` silently loses history on
exit, and macOS's pairing avoids that. Also, zoxide and fzf keep their own
recall stores, so my "I did that before" convenience does not lean on Zsh
history anyway. If I ever tune it, the change goes at the top of `~/.zshrc`.

## Configuring Completion

Completion is initialized bare, no framework:

```zsh
ZSH_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/zsh"
mkdir -p "$ZSH_CACHE_DIR"

autoload -Uz compinit

ZSH_COMPDUMP="$ZSH_CACHE_DIR/zcompdump"

if [[ ! -s "$ZSH_COMPDUMP" ]]; then
  compinit -d "$ZSH_COMPDUMP"
else
  compinit -d "$ZSH_COMPDUMP" -C
fi
```

`compinit` scans `fpath` (Zsh's search path for completion functions) and writes
an index of what completes what into a dump file. The next start can skip the
scan and load the dump.

The branch decides which happens:

- If the dump does not exist or is empty, run full `compinit` and build it.
- Otherwise run `compinit -C`, which loads the dump without re-scanning.

`-C` has a consequence worth knowing: it skips the check for _new_ completion
files. Install a tool with a completion after the dump exists and it will not
show up until the dump is deleted. Mine was built a while ago and still resolves
everything I use, so it has only needed rebuilding when I added a new tool and
wanted its completions immediately. Then: delete the cache file, restart the
shell, done. Accept a stale dump, or pay the scan on every start.

`-C` also skips compinit's security check (the one that asks about `fpath`
directories not owned by root or the current user). Fine on a single-user Mac
where the completion dirs are Homebrew-owned. I would think twice on a shared
box.

The tools below call `compdef`, so compinit has to run before them.

## Configuring the Prompt

Powerlevel10k, installed through Homebrew, generated config in `~/.p10k.zsh`,
rendered in two stages. First the cached instant prompt:

```zsh
# Load instant prompt
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi
```

The instant prompt is p10k's best feature. The first render caches itself to a
file named after the current user. That is what the `-${(%):-%n}` expands to.
Later starts source it before anything else, so a usable prompt appears while
the rest of the shell warms up. The `[[ -r ... ]]` guard makes it a no-op if the
cache is not there yet.

The theme and its config load later:

```zsh
[[ -f "$P10K_SOURCE" ]] &&
  source "$P10K_SOURCE"

[[ -f ~/.p10k.zsh ]] &&
  source ~/.p10k.zsh
```

Both lines are guarded with `[[ -f ... ]]` so a machine without Powerlevel10k
skips them instead of erroring during startup. The config file loads after the
theme because the theme defines the `POWERLEVEL9K_*` parameters the config
overrides.

`~/.p10k.zsh` is the 1,709-line output of `p10k configure`. Most of that is
commentary about segments I do not use. The active left prompt is: `dir`
(current directory, truncated with `truncate_to_unique`), `vcs` (Git status via
the `gitstatusd` daemon that ships with the Homebrew package), and
`prompt_char`. The right side shows `status`, `command_execution_time`,
`background_jobs`, and `time`.

The generated file looks busier than the rendered prompt. The right prompt list
has dozens of uncommented entries including `direnv`, `asdf`, `pyenv`, `nvm`,
and `kubecontext`. But those segments only render when their tool is installed,
and none are on this machine. The `context` segment is additionally suppressed
by an explicit empty expansion, so it only shows in SSH or as root. The wizard
pre-wires everything; the absent tools simply never appear.

`vcs` has one quirk worth knowing: it depends on `gitstatusd`, and running the
shell under `zsh -i -c 'exit'` can print "gitstatus failed to initialize"
because the daemon cannot attach in that harness. It works fine in a real
terminal. I mention this because the message looks like a broken prompt and it
is not.

## Integrating Tools

```zsh
if command -v zoxide >/dev/null 2>&1; then
  eval "$(zoxide init zsh --cmd cd)"
fi
```

zoxide is `cd` with memory: visit a directory, then jump to it with a fuzzy
match. `zoxide init` emits the hook that records `cd`s, a replacement `cd`
function, and a completion, and I `eval` that output. `--cmd cd` makes it
replace `cd` outright instead of adding a separate `z` command, so my muscle
memory does not change.

Two details matter. First, the generated init calls `compdef` only if that
function exists. If compinit has not run, the completion silently does not
register. That is why compinit sits earlier in the file. Second, this is
generated code running on every start. It is small, and the `command -v` guard
keeps it from even evaluating on machines without zoxide, but it is a per-shell
cost I accept.

Then pnpm:

```zsh
case ":$PATH:" in
  *":$PNPM_HOME/bin:"*) ;;
  *) export PATH="$PNPM_HOME/bin:$PATH" ;;
esac
```

pnpm's standalone install puts its shims in `$HOME/Library/pnpm/bin`. The `case`
over `:$PATH:` checks whether that directory is already present as a complete
path element (the colons keep a prefix string from false-matching) and prepends
only if it is not. This runs alongside `typeset -U`; the flag is the safety net,
the `case` avoids the churn of an assignment. Why `bin` and not `PNPM_HOME`
itself: the shims are `pnpm`, `pnpx`, `pn` in `bin`; the parent holds the store
and global links.

I do not initialize Neovim, Node, or any runtime in the shell. They are plain
binaries on `PATH`. No nvm, no pyenv, no version-manager wrappers with their
per-shell cost and ordering bugs.

## Defining Aliases

```zsh
alias ll='eza --long --all --git --icons --time-style=iso --group --classify=auto'
alias tree='eza --all --tree --icons --ignore-glob="node_modules|.git|.jj"'

alias tmux-s="$HOME/env/shared/scripts/bin/tmux"

alias bs='cargo run --quiet --manifest-path "$HOME/Developer/beanstats/Cargo.toml" -- "$@"'
```

`ll` and `tree` are both `eza`. `--git` annotates files with Git status,
`--icons` gives Nerd Font glyphs, `--time-style=iso` sortable timestamps. The
`tree` variant skips `node_modules`, `.git`, and `.jj` so the listing is not all
dependency folders.

Two things are easy to trip on. `--git` shows status but does _not_ hide
gitignored files. That is the separate `--git-ignore` flag, which `ll` does not
pass, so heavy `.gitignore`s still get listed. And eza 0.23.5 made `--classify`
take an optional argument; the old bare `--classify` broke `ll /some/path`
because eza parsed the path as the value. `--classify=auto` fixed it, and is
what I use now.

`tmux-s` is an alias to a wrapper script in `~/env`, not an inline function,
because the logic is multi-step: create a persistent `dev` session with a main
pane and two thin splits if it does not exist, attach to it, or switch to it if
already inside tmux. It lives in `~/env/shared/scripts/bin` so it is versioned
and portable, and it runs under `bash` regardless of the interactive shell.

`bs` runs the beanstats project, the Rust analytics CLI this blog uses:
`cargo run --quiet` against a hardcoded `Cargo.toml`, arguments passed through.
It is machine-specific. It needs that checkout at that exact path, and it goes
through the build system every call. When beanstats ships real binaries, this
becomes a `PATH` entry and I delete the alias.

## Why the Ordering Matters

The load order is:

```zsh
1. env.zsh
2. instant prompt
3. shell defaults
4. completion
5. tool initialization
6. PATH additions
7. aliases
```

Only a few of these are real dependencies. `env.zsh` first, because it defines
the source paths and `PNPM_HOME` later lines consume. `compinit` before zoxide,
because the completion needs `compdef`. `PNPM_HOME/bin` after `PNPM_HOME`
exists. Everything else would survive reordering.

## Startup Performance

`time zsh -i -c 'exit'` lands around 60-80 ms on this machine, wandering run to
run. The shape of the work matters more than the number:

- **Completion cache.** `compinit -C` skips the `fpath` re-scan when the dump
  exists. This is the big win.
- **Instant prompt.** The cached prompt renders immediately; the full theme
  loads afterward.
- **Guarded init.** zoxide, plugins, and prompt config all sit behind
  `command -v` or `[[ -f ]]` tests, so missing tools cost nothing.
- **No framework.** No Oh My Zsh, no plugin manager hauling in a hundred
  functions per start.

I am not claiming every cost is gone. The `zoxide init` eval and the two
Homebrew plugin sources run every start; I never isolated their individual
costs, but they are the bulk of what remains after the cache hits. That is where
I would look if I wanted to shave more.

## Tradeoffs and Caveats

The `bs` is a small Rust tool I use to pull the Cloudflare and web analytics
data that I use for this blog. The alias runs it directly from my local checkout
with cargo run, which is convenient while I'm developing it.

I'm not trying to optimize this down to zero. zoxide initialization and the
plugin sources still run on every interactive start, but the startup time is
already low enough that I don't care about squeezing out the last few
milliseconds. If that changes, those are the first places I'd investigate.

## What Comes Next

This covered the shell. Next up is tmux, including the shared scripts I keep in
`~/env`. After that, I'll get into the Neovim setup that EDITOR points at.

---
title: 'My Minimal Zsh Configuration, Designed for Predictability'
description:
  'A walkthrough of my minimal, framework-free Zsh configuration on macOS,
  focusing on explicit dependencies, startup cost, portability, and the
  tradeoffs behind keeping shell configuration simple.'
published: September 4, 2026
updated: September 10, 2026
---

I keep `~/.zshrc` small because a short file is readable as a whole. Navigation
is zoxide, listing is eza, the prompt is Powerlevel10k, and Homebrew handles
packages. The shell config just wires those pieces together.

I want to know what runs at startup and which orderings actually matter. When
something misbehaves, I want to know where to look.

Everything here is specific to this machine, running macOS on Apple Silicon with
Zsh 5.9 as the default shell. Where something depends on a particular version or
machine, I call it out.

## TL;DR

There isn't much to it. `~/.zshrc` loads the environment from `~/env`, sets up
completion and the prompt, initializes zoxide and pnpm, and defines a handful of
aliases. No framework, no plugin manager. The machine-specific bits stay in
`env.zsh`, so moving to a new machine only changes that one file.

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

Everything that differs between machines lives in `env.zsh`. Add a Linux box
later and I write a `~/env/linux/env.zsh`. `~/.zshrc` stays untouched.

`return`, not `exit`, is deliberate. `~/.zshrc` is sourced, not executed, so
`return` stops this file and leaves the shell alive. `exit` would end the whole
login process.

## Environment and Shell Behavior

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

In Zsh, `path` is the array form of `PATH` and the two stay in sync. Prepend one
and the other follows. That matters on Apple Silicon, where Homebrew's
`/opt/homebrew/bin` is not on the default `PATH`. With it first, Homebrew
binaries like `git`, `nvim`, and `eza` win any name collision.

I store the plugin paths in variables instead of sourcing them here. The instant
prompt has to render before the plugins load, so those `source` calls happen
later in `~/.zshrc`. The `Brewfile` declares the packages, so `brew bundle`
keeps the paths valid on a new machine.

Back in `~/.zshrc`:

```zsh
export PATH
export PNPM_HOME
```

These two lines look redundant and aren't, in different ways. `export PATH` is
harmless belt-and-suspenders. `path` was mutated by the array assignment, and
the tied `PATH` keeps its inherited export attribute on its own.
`export PNPM_HOME` is load-bearing. `env.zsh` only assigns a scalar, and a plain
`VAR=value` assignment stays unexported in Zsh, so child processes would see
nothing for `PNPM_HOME`.

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
`path` changes. env.zsh prepends Homebrew and `~/.zshrc` later prepends
`PNPM_HOME/bin`, so without it re-sources would pile up duplicates.

## History

I don't configure history at all. `~/.zshrc` never touches `HISTSIZE` or
`SAVEHIST`. macOS's `/etc/zshrc` supplies the defaults (`HISTSIZE=2000`,
`SAVEHIST=1000`), and they have worked well enough that I've never had a reason
to override them. This is inertia rather than a design principle, and I'm fine
with that.

## Completion

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

`compinit` scans `fpath` and writes an index of what completes what into a dump
file. With the dump present, the `else` branch runs `compinit -C`, which loads
the dump and skips the re-scan.

`-C` also skips the check for _new_ completion files. Install a tool with a
completion after the dump exists and it won't show up until the dump is deleted.
Mine was built a while ago and still resolves everything I use. I only rebuild
when I add a tool and want its completions now. Rebuilding means deleting the
cache file and restarting the shell. Accept the stale dump, or pay the scan on
every start.

Same deal with the security check, which asks about `fpath` directories not
owned by root or the current user. Fine on a single-user Mac where Homebrew owns
the completion directories. On a shared box I'd think twice.

The tools below call `compdef`, so compinit has to run before them.

## Prompt

Powerlevel10k, installed through Homebrew, generates `~/.p10k.zsh`. It renders
in two stages. First the cached instant prompt:

```zsh
# Load instant prompt
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi
```

The first render caches itself to a file named after the current user. That's
what `-${(%):-%n}` in the filename expands to. Later starts source that cached
file before anything else, so a usable prompt shows up while the rest of the
shell warms up. The `[[ -r ... ]]` guard makes it a no-op until the cache
exists.

The theme and its config load later:

```zsh
[[ -f "$P10K_SOURCE" ]] &&
  source "$P10K_SOURCE"

[[ -f ~/.p10k.zsh ]] &&
  source ~/.p10k.zsh
```

Both lines sit behind `[[ -f ... ]]`, so a machine without Powerlevel10k skips
them instead of erroring at startup. `~/.p10k.zsh` loads after the theme because
the theme defines the `POWERLEVEL9K_*` parameters the config overrides.

`~/.p10k.zsh` is the 1,709 lines that `p10k configure` generates, and almost all
of it is commentary about segments that never render, because a segment only
shows up when its tool is installed. The file is large, but most of those 1,709
lines don't affect what I see. What actually renders is `dir` (truncated with
`truncate_to_unique`), `vcs`, and `prompt_char` on the left, with `status`,
`command_execution_time`, `background_jobs`, and `time` on the right.

`vcs` uses `gitstatusd`, the daemon that ships with the Homebrew package. It has
one quirk. Running the shell under `zsh -i -c 'exit'` can print "gitstatus
failed to initialize" because the daemon can't attach in that harness. It works
fine in a real terminal. I mention it because the message looks like a broken
prompt and it isn't.

## Tool Initialization

```zsh
if command -v zoxide >/dev/null 2>&1; then
  eval "$(zoxide init zsh --cmd cd)"
fi
```

zoxide is `cd` with memory. Visit a directory once, then jump to it with a fuzzy
match later. `--cmd cd` replaces `cd` outright instead of adding a separate `z`
command, so my muscle memory stays the same.

The generated init calls `compdef` only if that function exists. If compinit has
not run, the completion silently doesn't register, which is why compinit sits
earlier in the file. This is also generated code evaluated on every start. It's
small, and the `command -v` guard skips it entirely on machines without zoxide,
but I don't pretend it's free.

Then there's pnpm.

```zsh
case ":$PATH:" in
  *":$PNPM_HOME/bin:"*) ;;
  *) export PATH="$PNPM_HOME/bin:$PATH" ;;
esac
```

pnpm needs its `bin` directory on `PATH`. I add it here rather than in `env.zsh`
because `PNPM_HOME` is defined there first. The `case` over `:$PATH:` prepends
only when that directory isn't already a complete path element. The colons keep
a prefix string from matching a longer path. `typeset -U` already guarantees
uniqueness, so this is mostly about avoiding the churn of reassigning the same
value on every start. And it's `bin`, not `PNPM_HOME`, because the shims
(`pnpm`, `pnpx`, `pn`) live there. The parent directory holds the store and
global links.

I don't initialize Neovim, Node, or any runtime in the shell. They're plain
binaries on `PATH`. No nvm, no pyenv, no wrapper that replaces a binary with a
shell function.

## Aliases

```zsh
alias ll='eza --long --all --git --icons --time-style=iso --group --classify=auto'
alias tree='eza --all --tree --icons --ignore-glob="node_modules|.git|.jj"'

alias tmux-s="$HOME/env/shared/scripts/bin/tmux"

alias bs='cargo run --quiet --manifest-path "$HOME/Developer/beanstats/Cargo.toml" -- "$@"'
```

`--git` shows status but does not hide gitignored files. That's the separate
`--git-ignore` flag, which `ll` doesn't pass, so directories with heavy
`.gitignore`s still get listed. And eza 0.23.5 made `--classify` take an
optional argument. The old bare `--classify` broke `ll /some/path`, because eza
parsed the path as the flag's value. `--classify=auto` fixed it.

`tmux-s` points at a wrapper script in `~/env` rather than an inline function.
The script creates a persistent `dev` session with a main pane and two thin
splits if there isn't one, then attaches. If I'm already inside tmux, it
switches instead. It lives in `~/env/shared/scripts/bin` so it's versioned with
the rest of the config, and it runs under bash regardless of the interactive
shell.

`bs` runs the Rust analytics CLI this blog uses. It's `cargo run --quiet`
against a hardcoded `Cargo.toml`, arguments passed through. It's tied to this
machine, knowingly. The checkout has to exist at that exact path, and every call
goes through the build system. When beanstats ships real binaries, this becomes
a `PATH` entry and I delete the alias.

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

Only three orderings actually matter. `env.zsh` has to come first, since it
defines the paths and `PNPM_HOME` used later. compinit has to precede zoxide,
because zoxide's init registers its completion with `compdef`. And
`PNPM_HOME/bin` has to be added after `PNPM_HOME` exists.

## Startup Performance

`time zsh -i -c 'exit'` lands around 60-80 ms on this machine, wandering run to
run. The number varies. What matters more to me is where the time goes:

- **Completion cache.** With the dump present, `compinit -C` loads it and skips
  the `fpath` re-scan.
- **Guarded init.** zoxide, the plugins, and the prompt all sit behind
  `command -v` or `[[ -f ]]` tests, so a missing tool skips its initialization
  instead of paying for a source or eval.
- **No framework.** Nothing to initialize. The files that run are the ones
  listed above.

Not every cost is gone. The `zoxide init` eval and the two Homebrew plugin
sources run every start. I never isolated their individual costs, but they're
the bulk of what remains after the cache hits. They're where I'd look first to
shave more. For now, 60-80 ms is a baseline for noticing regressions, not a
number to minimize.

## Tradeoffs

Some of this only makes sense on a single-user Mac. `compinit -C` skips the
ownership check on `fpath` directories, which you can get away with when
Homebrew owns them. On a shared box I'd drop the flag, or at least check who
writes to the completion directories. The Homebrew paths in `env.zsh` are
macOS-specific in the same way.

The completion dump goes stale. New completions don't show up until I rebuild
it, and rebuilding is mechanical but easy to forget. Generated behavior can
churn too. `ll` already had to adapt when eza 0.23.5 changed `--classify`, and
nothing will warn me the next time a version changes something.

The generated prompt config is the part I'd defend least. It's 1,709 lines for a
prompt that uses a handful of segments, and finding where a behavior is set
means knowing the segment name. `bs` is the same tradeoff at the other end. A
hardcoded checkout path, the build system on every call, and it only works on
this machine. Fine daily, knowingly not portable.

I'm also not optimizing this down to zero. The zoxide init and the plugin
sources still run on every start. Startup is already fast and predictable, and
shaving the last few milliseconds would make the readable parts unreadable for a
gain I can't feel.

## My Point

I keep this setup because I can still hold most of it in my head. When something
breaks, I don't have to wonder which framework, plugin, or generated layer is
responsible. I can start at `env.zsh`, walk through `~/.zshrc`, and usually find
the problem quickly. That's enough for me.

---
title: 'The Zsh Configuration I Can Reason About'
description:
  'A walkthrough of my minimal, framework-free Zsh configuration on macOS,
  focusing on explicit dependencies, startup cost, portability, and the
  tradeoffs behind keeping shell configuration simple.'
published: September 4, 2026
updated: November 14, 2026
tags: ['zsh', 'shell', 'macos']
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

There isn't much to it. One 73-line `~/.zshrc` sets the environment, history,
and `PATH`, initializes completion, loads zoxide, Powerlevel10k, and
zsh-autosuggestions, and defines a handful of aliases. No framework, no plugin
manager, no files to chase. Startup lands around 30 ms.

## Configuration Layout

Three files matter.

```
~/.zshrc                      # the whole config, symlinked from my dotfiles repo
~/.zshenv                     # one line that loads cargo
~/.p10k.zsh                   # Powerlevel10k prompt config (generated)
```

`~/.zshrc` is a symlink into `~/dotfiles-macos`, which is its own Git repo
managed with GNU Stow. Shell config, scripts, docs, and a Homebrew `Brewfile`
all live there, and a fresh machine gets the links with one command.

```bash
stow .
```

There is no platform switch anymore. An earlier version split machine-specific
bits into a separate file behind a `uname` check. I deleted that because I only
use one platform, and a branch that never runs is something I'd have to remember
exists. If I add a Linux box, I'll deal with it then.

`~/.zshenv` is the one file outside the repo. Its entire contents are
`. "$HOME/.cargo/env"`, which puts `~/.cargo/bin` on `PATH` for Rust tooling.
Zsh reads it for every shell, so it's easy to forget it's there.

## Environment

```zsh
export HOMEBREW_PREFIX="/opt/homebrew"

export EDITOR="nvim"
export VISUAL="nvim"
export SUDO_EDITOR="nvim"
export BAT_THEME="ansi"
```

I set `HOMEBREW_PREFIX` by hand instead of running `brew shellenv`, because
`shellenv` forks a subprocess on every start. The tradeoff is that this value is
hardcoded for Apple Silicon. On an Intel Mac it would be wrong.

`EDITOR`, `VISUAL`, and `SUDO_EDITOR` all point at Neovim so Git, `sudo -e`, and
other CLIs open the editor I actually use. `BAT_THEME` keeps `bat` output
readable without fighting the prompt's palette.

## History

```zsh
HISTFILE="$HOME/.zsh_history"
HISTSIZE=10000
SAVEHIST=10000

setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_SAVE_NO_DUPS
setopt HIST_REDUCE_BLANKS
```

I used to leave history alone and live with macOS's defaults from `/etc/zshrc`,
which are 2000 lines in memory and 1000 saved. Now I keep 10,000 of each.

`SHARE_HISTORY` writes each command as I run it and pulls in commands from my
other open sessions. Without it, Zsh only writes history when a shell exits, so
a pile of tmux panes means a pile of sessions that don't know about each other.

The four `HIST_*` options are about duplicates and whitespace. I'll be honest
that they overlap. `HIST_IGNORE_ALL_DUPS` already drops older copies of a
repeated command, which covers what `HIST_IGNORE_DUPS` (consecutive repeats) and
`HIST_SAVE_NO_DUPS` (no duplicates in the file) do. I kept all three because
they don't conflict, and I haven't felt the need to prune them.
`HIST_REDUCE_BLANKS` trims extra spaces before a command is stored.

## PATH

```zsh
typeset -U path PATH

export PNPM_HOME="$HOME/Library/pnpm"
path=(
  "$PNPM_HOME/bin"
  "$HOMEBREW_PREFIX/bin"
  "$HOMEBREW_PREFIX/sbin"
  $path
  "$HOME/.local/bin"
  "$HOME/.local/share/nvim/mason/bin"
)
```

In Zsh, `path` is the array form of `PATH` and the two stay in sync. Assign the
array and the string follows.

`typeset -U` makes the array unique. Duplicate entries get dropped every time
`path` changes, so re-sourcing the file doesn't pile up copies.

The order is deliberate. pnpm and Homebrew go in front of the inherited `$path`,
so their binaries win any name collision. That matters on Apple Silicon, where
`/opt/homebrew/bin` isn't on the default `PATH`. With it first, `git`, `nvim`,
and `eza` come from Homebrew instead of the system.

`~/.local/bin` and the Mason bin directory go after `$path`, so they're a
fallback and never shadow anything. `~/.local/bin` is there because `uv` kept
going missing without it. Mason's directory is where Neovim installs its
language servers and formatters.

`PNPM_HOME` is `export`ed because pnpm and its child processes read it. It's
`bin` that goes on `PATH`, since the shims live there.

## Completion

Completion is initialized bare, no framework.

```zsh
ZSH_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/zsh"
[[ -d "$ZSH_CACHE_DIR" ]] || mkdir -p "$ZSH_CACHE_DIR"

fpath=("$HOMEBREW_PREFIX/share/zsh/site-functions" $fpath)

autoload -Uz compinit
compinit -C -d "$ZSH_CACHE_DIR/zcompdump"
```

`compinit` scans `fpath` and writes an index of what completes what into a dump
file. The `fpath` line adds Homebrew's completion directory so installed tools
can be found.

`-C` loads an existing dump and skips the re-scan. If the dump doesn't exist
yet, `compinit -C` builds it anyway, which I tested in a clean directory. So
there is no first-run branch to maintain.

`-C` also skips the check for _new_ completion files. Install a tool with a
completion after the dump exists and it won't show up until the dump is deleted.
I only rebuild when I add a tool and want its completions now. Rebuilding means
deleting the cache file and restarting the shell. Accept the stale dump, or pay
the scan on every start.

Same deal with the security check, which asks about `fpath` directories not
owned by root or the current user. Fine on a single-user Mac where Homebrew owns
the completion directories. On a shared box I'd think twice.

The tool below calls `compdef`, so compinit has to run before it.

## Prompt

Powerlevel10k, installed through Homebrew, generates `~/.p10k.zsh`. It renders
in two stages. First the cached instant prompt.

```zsh
P10K_INSTANT_PROMPT="${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
[[ -r "$P10K_INSTANT_PROMPT" ]] && source "$P10K_INSTANT_PROMPT"
```

The first render caches itself to a file named after the current user. That's
what `${(%):-%n}` in the filename expands to. Later starts source that cached
file early, so a usable prompt shows up while the rest of the shell warms up.
The `[[ -r ... ]]` guard makes it a no-op until the cache exists.

It isn't the very first line in the file. `export HOMEBREW_PREFIX` sits above
it, and that's fine because it prints nothing. The rule is that nothing before
the instant prompt may write to the terminal.

The theme and its config load later.

```zsh
[[ -f "$HOMEBREW_PREFIX/share/powerlevel10k/powerlevel10k.zsh-theme" ]] &&
  source "$HOMEBREW_PREFIX/share/powerlevel10k/powerlevel10k.zsh-theme"

[[ -f ~/.p10k.zsh ]] &&
  source ~/.p10k.zsh
```

Both sit behind `[[ -f ... ]]`, so a machine without Powerlevel10k skips them
instead of erroring at startup. `~/.p10k.zsh` loads after the theme because the
theme defines the `POWERLEVEL9K_*` parameters the config overrides.

`~/.p10k.zsh` is the 1,709 lines that `p10k configure` generates, and almost all
of it is commentary about segments that never render, because a segment only
shows up when its tool is installed. What actually renders is `dir` (truncated
with `truncate_to_unique`), `vcs`, and `prompt_char` on the left, with `status`,
`command_execution_time`, `background_jobs`, and `time` on the right.

`vcs` uses `gitstatusd`, the daemon that ships with the Homebrew package. It has
one quirk. Running the shell under `zsh -i -c 'exit'` prints "gitstatus failed
to initialize" because the daemon can't attach in that harness. It works fine in
a real terminal. I mention it because the message looks like a broken prompt and
it isn't.

## Tool Initialization

```zsh
(( $+commands[zoxide] )) && eval "$(zoxide init zsh --cmd cd)"

[[ -f "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh" ]] &&
  source "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
```

zoxide is `cd` with memory. Visit a directory once, then jump to it with a fuzzy
match later. `--cmd cd` replaces `cd` outright instead of adding a separate `z`
command, so my muscle memory stays the same. I checked, and `cd` is now a shell
function.

The generated init calls `compdef` only if that function exists. If compinit has
not run, the completion silently doesn't register, which is why compinit sits
earlier in the file. This is also generated code evaluated on every start. It's
small, and the `$+commands[zoxide]` check skips it entirely on machines without
zoxide, but I don't pretend it's free.

zsh-autosuggestions is the only plugin I load. It shows the rest of a command in
grey, pulled from history, and I accept it with the right arrow. It's sourced
behind a file check like everything else.

I don't initialize Neovim, Node, or any runtime in the shell. They're plain
binaries on `PATH`. No nvm, no pyenv, no wrapper that replaces a binary with a
shell function.

## Aliases

```zsh
alias vim="nvim"
alias tmux-s="$HOME/dotfiles-macos/scripts/tmux-sessionaire.sh"

if (( $+commands[eza] )); then
  alias ll='eza --long --all --git --icons --time-style=iso --group --classify=auto'
  alias tree='eza --all --tree --icons --ignore-glob="node_modules|.git|.jj|target"'
fi
```

`vim` is `nvim`, so a reflex typo costs nothing.

The two eza aliases only exist when eza does. `--git` shows status but does not
hide gitignored files. That's the separate `--git-ignore` flag, which `ll`
doesn't pass, so directories with heavy `.gitignore`s still get listed. And eza
0.23.5 made `--classify` take an optional argument. The old bare `--classify`
broke `ll /some/path`, because eza parsed the path as the flag's value.
`--classify=auto` fixed it. `tree` shadows the Homebrew `tree` binary, which is
also in my `Brewfile`, and it skips `node_modules`, `.git`, `.jj`, and `target`.

`tmux-s` points at a wrapper script in the dotfiles repo rather than an inline
function. The script creates a persistent `dev` session with a main pane and two
thin splits if there isn't one, then attaches. If I'm already inside tmux, it
switches instead. It runs under bash regardless of the interactive shell.

## Why the Ordering Matters

The load order, top to bottom, is below.

```zsh
1. environment
2. instant prompt
3. history
4. PATH
5. completion
6. zoxide
7. prompt theme, autosuggestions, p10k config
8. aliases
```

Only a couple of orderings actually matter. compinit has to precede zoxide,
because zoxide's init registers its completion with `compdef`. And the
Powerlevel10k theme has to load before `~/.p10k.zsh`, because the config
overrides parameters the theme defines. The rest is grouping I find easier to
read.

## Startup Performance

`zsh -i -c 'exit'` has a median around 31 ms on this machine, across 30 runs
that ranged from about 30 to 35 ms. Your machine will differ. What matters more
to me is where the time goes.

- **Completion cache.** With the dump present, `compinit -C` loads it and skips
  the `fpath` re-scan.
- **Guarded init.** zoxide, the plugin, and the prompt all sit behind
  `$+commands[...]` or `[[ -f ]]` tests, so a missing tool skips its
  initialization instead of paying for a source or eval.
- **No framework.** Nothing to initialize. The files that run are the ones
  listed above.

Not every cost is gone. The `zoxide init` eval and the plugin sources run every
start. I never isolated their individual costs, but they're where I'd look first
to shave more. For now, 30 ms is a baseline for noticing regressions, not a
number to minimize.

## Tradeoffs

Some of this only makes sense on a single-user Mac. `compinit -C` skips the
ownership check on `fpath` directories, which you can get away with when
Homebrew owns them. On a shared box I'd drop the flag, or at least check who
writes to the completion directories. The hardcoded `HOMEBREW_PREFIX` is
macOS-specific in the same way, and Apple Silicon-specific on top of that.

The completion dump goes stale. New completions don't show up until I rebuild
it, and rebuilding is mechanical but easy to forget. Generated behavior can
churn too. `ll` already had to adapt when eza 0.23.5 changed `--classify`, and
nothing will warn me the next time a version changes something.

The history options overlap, as I said above. It works, but it's more lines than
the behavior needs.

The generated prompt config is the part I'd defend least. It's 1,709 lines for a
prompt that uses a handful of segments, and finding where a behavior is set
means knowing the segment name.

I'm also not optimizing this down to zero. The zoxide init and the plugin source
still run on every start. Startup is already fast and predictable, and shaving
the last few milliseconds would make the readable parts unreadable for a gain I
can't feel.

## My Point

I keep this setup because I can still hold all of it in my head. When something
breaks, I don't have to wonder which framework, plugin, or generated layer is
responsible. I can open one file, read it top to bottom, and usually find the
problem quickly. That's enough for me.

## Related Posts

- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Eight Lines of WezTerm Configuration](/posts/terminal/forty-eight-lines-of-wezterm-configuration/)

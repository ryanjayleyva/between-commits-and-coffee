---
title: 'Organizing Tmux Configuration by Reason for Change'
description:
  'A walkthrough of my small, plugin-free tmux configuration on macOS with tmux
  3.7c from Homebrew, split into five files by reason for change, including the
  scripts that turn tmux into a persistent workspace and the tradeoffs behind
  keeping it simple.'
published: September 7, 2026
updated: September 16, 2026
---

My tmux configuration is five small files, and the split is by reason for
change. Keys live in `bindings.conf`, looks in `statusline.conf`, behavior in
`options.conf`. When I want to change how a key behaves I know the file before I
open an editor. The edit loop is find the file, change a line, press `C-a r`.

This is not a big config. The five files add up to about seventy lines, one
screen you could read top to bottom. Splitting it is not about escaping an
unmanageable file. It is a structure I carry through `~/env`, where the shell
config and the scripts follow the same rule: small files, one concern each,
shipped with `stow`.

This runs on macOS with tmux 3.7c from Homebrew. Where something is
version-dependent or machine-specific, I say so. There is no plugin manager
involved and no plugin at all.

## TL;DR

There isn't much to my tmux configuration. A five-line `tmux.conf` sources four
files (options, terminal, bindings, status line) and `~/.config/tmux/tmux.conf`
is a Stow symlink to it, so tmux finds it through its normal config discovery.

I don't use a plugin manager, and there are no plugins. Two scripts in
`~/env/shared/scripts/bin/` round out the workflow: a wrapper that builds a
three-pane workspace, and a shared agent-popup helper that two keys use to raise
a persistent agent session without leaving the current pane.

It's not meant to be a universal tmux setup. It's the multiplexer shaped to make
this particular machine comfortable to work in, and the files are split so that
shape stays easy to edit.

## Configuration Layout

The source of truth lives inside the `~/env` repo, in the `shared` tree:

```bash
~/env/shared/.config/tmux/
├── tmux.conf          # thin orchestrator
├── options.conf       # session and input behavior
├── terminal.conf      # terminal capabilities
├── bindings.conf      # keys
└── statusline.conf    # status line
```

`~/.config/tmux/` holds Stow symlinks, so tmux's own config discovery lands on
`tmux.conf`. There is no `~/.tmux.conf`, and `XDG_CONFIG_HOME` is not set.
`~/.config/tmux/tmux.conf` is one of the configuration files tmux loads, and on
this machine it is the only one of those locations that exists, so the symlink
is the config tmux reads.

The orchestrator is the whole config set:

```conf
# Load shared portable config files
source-file ~/env/shared/.config/tmux/options.conf
source-file ~/env/shared/.config/tmux/terminal.conf
source-file ~/env/shared/.config/tmux/bindings.conf
source-file ~/env/shared/.config/tmux/statusline.conf
```

The orchestrator does nothing but list the files in order. I source the real
paths in `~/env`, not the symlinked copies. That keeps one source of truth, so
`C-a r` always reloads the versioned files.

## Configuring Options

`options.conf` sets session and input behavior:

```conf
# Configure general session and window behavior
set -g base-index 1
set -g renumber-windows on
set -g extended-keys on
set -g extended-keys-format csi-u

# Configure key and input behavior
set -g mode-keys vi
set -s escape-time 10

# Configure mouse and focus handling
set -g mouse off
set -g focus-events on
```

Windows start at 1 with `base-index`, not the default 0. `renumber-windows`
closes the gap when you kill a window, so your `C-a <number>` habit stays
accurate.

`extended-keys` needs a recent tmux (3.2 or newer), and `extended-keys-format`
is a later addition. With the `csi-u` format, terminal apps get distinct key
events instead of losing modifiers. The same keystroke that means Enter in one
app and `C-j` in another stays tellable. That matters since `C-j`, `C-h`, and
friends do real work in the bindings below, and is the reason the config
requires a recent tmux.

`escape-time` is the milliseconds tmux waits to tell an Escape from the start of
an escape sequence. Ten is the value I want, and it is also the default in tmux
3.7c, so the line makes that explicit rather than lowering anything. It's the
number Neovim users tend to land on. I keep it for the editor, not for tmux.

`mouse off` and `mode-keys vi` set the tone. Everything in this config is
keyboard-driven. Panes are resized, selected, and copied entirely by key, so the
mouse is dead weight once it is off. Mouse is off by default in tmux. I keep the
line because it is a statement of intent.

`focus-events` forwards focus in and out to the pane. Terminal apps like Neovim
can then react to the terminal losing focus instead of assuming the window is
gone.

## Configuring the Terminal

`terminal.conf` is about what the terminal underneath can actually do:

```conf
# Enable undercurl and terminal color support
set -su terminal-overrides
set -as terminal-overrides ',*:Smulx=\E[4::%p1%dm'
set -as terminal-overrides ',*:Setulc=\E[58::2::%p1%{65536}%/%d::%p1%{256}%/%{255}%&%d::%p1%{255}%&%d%;m'

set -g default-terminal "tmux-256color"
set -as terminal-overrides ',xterm-256color:RGB'
```

The `Smulx` and `Setulc` entries are the undercurl. `Smulx` is the styled
underline capability and `Setulc` supplies its color. Neovim renders diagnostics
with curly underlines today, and without these overrides tmux can mangle or drop
them.

`set -su` resets the override list to its default and `set -as` appends, so this
file builds the effective list in order, and order matters within it. This is
the one place in the whole config where ordering is a real dependency.

`default-terminal "tmux-256color"` is the TERM every app inside tmux sees. The
last override adds the `RGB` capability to `xterm-256color` so tmux knows
truecolor can pass through. Without it, colors silently degrade to the 256-color
palette.

This file exists so the editor renders correctly, not so tmux looks good. The
undercurls and truecolor are for the Neovim config that `EDITOR` points at.

## Configuring Bindings

`bindings.conf` is where the muscle memory lives:

```conf
# Set prefix key
set -g prefix C-a
unbind C-b
bind-key C-a send-prefix

# Create window splits
unbind %
bind | split-window -h
unbind '"'
bind - split-window -v

# Reload configuration
unbind r
bind r source-file ~/env/shared/.config/tmux/tmux.conf

bind -r y run-shell -b $HOME/env/shared/scripts/bin/opencode
bind -r u run-shell -b $HOME/env/shared/scripts/bin/pi

# Resize panes with prefix
bind j resize-pane -D 5
bind k resize-pane -U 5
bind l resize-pane -R 5
bind h resize-pane -L 5
bind m resize-pane -Z
unbind M-c

# Prefix-based pane switching (use with prefix key, e.g. C-a C-h)
bind C-h select-pane -L
bind C-j select-pane -D
bind C-k select-pane -U
bind C-l select-pane -R
bind C-\\ select-pane -l

# Configure copy mode bindings
bind -T copy-mode-vi C-h select-pane -L
bind -T copy-mode-vi C-j select-pane -D
bind -T copy-mode-vi C-k select-pane -U
bind -T copy-mode-vi C-l select-pane -R
bind -T copy-mode-vi C-\\ select-pane -l
```

The prefix moves from `C-b` to `C-a`. `C-b` is a stretch. `C-a` sits under the
left hand. The cost is that a literal Ctrl-A in an app needs two presses, so
`C-a C-a` reaches readline's move-to-line-start. I paid that cost years ago and
never went back.

Splits read like their shape. `|` goes vertical side-by-side and `-` stacks
horizontally, matching the character you press. These bindings split the pane
you are currently in, so the flow is split, work, split. The wrapper below is
where the main pane is targeted: it names the original `main` pane explicitly
when it builds the initial layout.

`C-a r` re-sources the orchestrator, which pulls all four files again. Editing
`bindings.conf` then reloading once is the entire edit loop. No server restart,
no plugin manager, no rehash.

The `-r` flags on `y` and `u` make them repeatable, so one prefix press lets you
re-trigger either popup. `run-shell -b` runs the script in the background
instead of pausing the pane while it works. Both point at scripts I'll get to
shortly.

Resize keys mirror Vim. `j`/`k`/`l`/`h` nudge panes in the obvious directions by
five cells, and `m` toggles zoom. `unbind M-c` pins Alt-c as unbound so nothing
can land on it later. Pane jumping uses Ctrl-modified `h`/`j`/`k`/`l`, and `C-\`
flips back to the last pane. Both the prefix table and the copy-mode-vi table
get the same pane-switch set, so navigation works whether you are at a prompt or
busy selecting text.

## Configuring the Status Line

`statusline.conf` keeps the chrome honest:

```conf
# Configure status line and window styling
set -g status-position top
set -g status-justify absolute-centre
set -g status-style "bg=default"
set -g window-status-current-style "fg=yellow bold"
set -g status-right ""
set -g status-left ""
```

The status line sits at the top, not the bottom. In the wrapper layout below,
the bottom edge of the main pane is given over to a scratch strip, so the top is
where the status line is allowed to live.

`bg=default` makes it transparent, which means it blends with the terminal
background instead of drawing a bar. The current window is bold yellow, and the
left and right sides carry no clock, no hostname, and no session name. The only
thing on screen is which window you are in.

## The Wrapper Session

The `tmux-s` alias points at `~/env/shared/scripts/bin/tmux`:

```bash
#!/usr/bin/env bash

set -euo pipefail

SESSION_NAME="${SESSION_NAME:-dev}"
WINDOW_NAME="${WINDOW_NAME:-main}"

command -v tmux &>/dev/null || {
  printf '%s\n' 'Not found: tmux' >&2
  exit 1
}

if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux new-session -d -s "$SESSION_NAME" -n "$WINDOW_NAME"
  main_pane_id="$(tmux display-message -t "$SESSION_NAME":"$WINDOW_NAME" -p '#{pane_id}')"
  tmux split-window -h -p 10 -t "$main_pane_id"
  tmux split-window -v -p 10 -t "$main_pane_id"
  tmux select-pane -t "$main_pane_id"
fi

if [[ -n "${TMUX:-}" ]]; then
  tmux switch-client -t "$SESSION_NAME"
else
  tmux attach-session -t "$SESSION_NAME" || {
    printf 'tmux attach failed for session %s\n' "$SESSION_NAME" >&2
    exit 1
  }
fi
```

It is a bash script, not a tmux config hook, because it is multi-step and has to
run before tmux attaches. It lives in `~/env/shared/scripts/bin` so it is
versioned and portable, and it runs under `bash` regardless of the interactive
shell.

On first run it creates a `dev` session with a `main` window, then splits off
two thin panes from the main pane: a 10% strip on the right and a 10% strip
along the bottom. The main pane stays selected.

The layout is the point of the script. One big pane owns the work, the right
rail is a good place for something like a test runner or log stream, and the
bottom strip is a scratch shell. The script only builds the geometry. What you
put in the rails is your business.

If you are already inside tmux it switches to `dev`. Otherwise it attaches.
Session and window names are env-overridable, but I have never needed to change
them.

This lives behind the alias and nowhere else. Plain tmux keeps its default
behavior, so the opinionated layout only shows up when I ask for it.

## The Agent Popups

`y` and `u` from the bindings point at two thin wrappers, `opencode` and `pi`.
Both resolve their own directory and exec the same helper with an agent name:

```bash
#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$script_dir/../libexec/agent-popup.sh" opencode
```

The helper, `libexec/agent-popup.sh`, does the actual work:

```bash
#!/usr/bin/env bash

set -euo pipefail

agent_name="${1:-}"

if [[ -z "$agent_name" ]]; then
  printf '%s\n' "Usage: $0 <agent-name>" >&2
  exit 1
fi

pane_path="$(tmux display-message -p -F '#{pane_current_path}' 2>/dev/null)" || exit 0

if command -v md5sum &>/dev/null; then
  path_hash="$(printf '%s' "$pane_path" | md5sum 2>/dev/null | cut -d' ' -f1 | cut -c1-8)"
else
  path_hash="$(printf '%s' "$pane_path" | md5 -q 2>/dev/null | cut -c1-8)"
fi

session="$agent_name-$path_hash"

if ! tmux has-session -t "$session" 2>/dev/null; then
  tmux new-session -d -s "$session" -c "$pane_path" "$agent_name" &>/dev/null || exit 0
fi

tmux display-popup -w 80% -h 80% -E "tmux attach-session -t \"$session\"" 2>/dev/null || exit 0
```

The trick is the session name. It hashes the current directory, so the session
is `opencode-<hash>` or `pi-<hash>` keyed to where the pane is. First press in a
directory creates a detached session that starts the agent there. Every later
press in the same directory attaches to the same session. The agent keeps its
state, the popup reappears over your panes, and nothing is spawned into the
working pane.

The hash is computed portably. The script prefers `md5sum` when it is available,
otherwise it uses macOS's `md5 -q`, and takes the first eight hex characters in
either case. Only eight are used, which is plenty for directory uniqueness in
practice.

`display-popup` opens 80% wide and 80% tall, centered over everything. When I
close the popup the agent session stays alive in the background, detached. That
is a feature and a cost. State survives, but so does the session. They sit
around until killed by hand, one per directory that has ever spawned one.

## Tradeoffs and Caveats

**The prefix is `C-a`, and that costs you an app key.** A literal Ctrl-A in a
shell or in readline takes two presses (`C-a` then `C-a`). The escape hatch is
firmly in place, but it is a thing you must get used to.

**Mouse is entirely off.** No drag-selecting, no mouse wheel scrollback inside
panes, no click-to-focus. Keyboard only. That is a deliberate choice, and some
people will rightly hate it.

**The wrapper is opinionated about layout.** `tmux-s` always gives you the main
pane plus two thin rails. It is a workspace shape, not a terminal. When you want
a plain pane, plain tmux is still there, untouched.

**The status line tells you almost nothing.** No clock, no hostname, no session
name. The only glanceable data is the highlighted current window. Useful signals
were traded away for a quiet screen.

**Agent popups leave sessions behind.** Every directory with a `y` or `u` press
owns a detached session forever. They are cheap and invisible, but they
accumulate, and the cleanup is manual.

**This config assumes a recent tmux.** `extended-keys` and
`extended-keys-format` are recent additions, and `focus-events` is older but not
universal. I do not guard any of them. On an old distro tmux this config would
error at startup, which is fine for my machines and worth knowing before you
copy it.

## Where I Landed

The load order is:

```
1. options
2. terminal
3. bindings
4. statusline
```

Nothing here reads a value that an earlier file wrote, except `terminal.conf`,
where the overrides have to build up in order. The same is mostly true of load
order in the shell post. Only a few lines are real dependencies, and everything
else would survive reordering.

I won't pretend the split is required. tmux would load a single `~/.tmux.conf`
with the same result, and at seventy lines you could read it all in one screen.
One file is the reasonable default, and I have no argument against it for a
config that small.

I keep five files anyway, for three reasons that hold even at this size.

The first is diff scoping. A change to keys touches `bindings.conf` and nothing
else, so every commit and every git log entry names the concern that moved. That
stays useful no matter how small the config is.

The second is consistency with the rest of `~/env`. The shell config and the
scripts follow the same shape, small files, one concern each, shipped through
stow. When the tmux files follow the same rule, the structure of the whole
environment is learnable once.

The third is that the split is nearly free. Reloading re-parses all five files
in a blink, and the orchestrator is five obvious lines, so the cost is the tiny
mental jump from one file to another. I would merge the files back if the
equation ever flips. If the config shrank further or I stopped editing keys, the
extra structure might no longer be worth it. So far, the seams keep paying.

This is small enough to understand, structured enough that I know where to edit
it, and opinionated enough to make my workflow comfortable.

That's really the point of the configuration. The five files aren't necessary,
but each concern has a predictable home, and that makes the whole thing easier
for me to change without having to think about where something lives.

## Related Posts

- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)

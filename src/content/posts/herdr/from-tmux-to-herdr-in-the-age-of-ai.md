---
title: 'From tmux to herdr in the Age of AI'
description:
  "Why I'm moving from tmux to herdr, not because tmux is bad, but because my
  work changed, AI agents changed my terminal, and I'd rather adopt a tool than
  keep maintaining my own."
published: November 2, 2026
updated: November 18, 2026
tags: ['tmux', 'herdr', 'agentic-workflow']
---

I used to enjoy perfecting my terminal. I customized tmux, wrote Bash scripts,
refined my Neovim configuration, and added shortcuts until everything worked the
way I wanted. For a long time, tuning the environment was part of the fun.

My work has changed since then, and so has my relationship with development. AI
has brought me closer to it again, but my priorities are different. I'm moving
from tmux to [herdr](https://github.com/herdrdev/herdr), not because tmux is
bad, but because I'm starting to value different things.

## Why My Workflow Changed

I'm no longer a software developer. I'm an Adoption Specialist, and I help
customers understand, adopt, and get the most out of integration solutions.

AI brought me closer to development again. I use it to prepare demo
presentations and to troubleshoot integration errors. With tools like Celigo
CLI, I've been opening my old Neovim configuration, spending more time in the
terminal, and enjoying understanding what happens under the hood again.

It also changed how I use the terminal. Sometimes I troubleshoot an integration
issue while building a custom agentic workflow or an MCP server that a customer
requested. That can mean one terminal session investigating an error, another
working on the solution, and another experimenting with an AI agent.

My tmux setup was built around how I worked as a software developer. Now I work
alongside several AI agents, and I want terminal sessions, agents, and my own
decisions to fit together more naturally.

## The Friction I Couldn't Ignore

This wasn't a decision I made overnight. It started with small things in my
daily work. I kept jumping between tabs and creating tmux panes by hand.

My usual shortcuts were:

- `tmux-s` to open a tmux session with three panes.
- `C-a |` to split the current pane vertically.
- `C-a -` to split it horizontally.
- `C-a y` to raise a persistent pi session in a popup.

`tmux-s` is an alias in my `.zshrc` for
[tmux-sessionaire](https://github.com/ryanjayleyva/tmux-sessionaire), a small
Bash script of mine. It creates a `dev` session with a main pane, a narrow pane
on the right, and a short pane below, then attaches to it.

```bash
#!/usr/bin/env bash

set -euo pipefail

SESSION_NAME="${SESSION_NAME:-dev}"
WINDOW_NAME="${WINDOW_NAME:-main}"

command -v tmux &>/dev/null || {
  printf '%s\n' 'Not found: tmux' >&2
  exit 1
}

if ! tmux has-session -t "=$SESSION_NAME" 2>/dev/null; then
  main_pane_id="$(tmux new-session -d -s "$SESSION_NAME" -n "$WINDOW_NAME" -P -F '#{pane_id}')"
  tmux split-window -h -l 10% -t "$main_pane_id"
  tmux split-window -v -l 10% -t "$main_pane_id"
  tmux select-pane -t "$main_pane_id"
fi

if [[ -n "${TMUX:-}" ]]; then
  tmux switch-client -t "=$SESSION_NAME"
else
  exec tmux attach-session -t "=$SESSION_NAME"
fi
```

The layout is only built when the session doesn't exist yet. The two small panes
are 10% each, split off the main pane.

`C-a y` is a Bash script too, `pi-launcher.sh`. It raises pi in a popup over
whatever I'm doing.

```bash
#!/usr/bin/env bash

set -euo pipefail

pane_path="$(tmux display-message -p '#{pane_current_path}')"
path_hash="$(printf '%s' "$pane_path" | md5 -q | cut -c1-8)"
session="pi-$path_hash"

if ! tmux has-session -t "$session" 2>/dev/null; then
  tmux new-session -d -s "$session" -c "$pane_path" pi
fi

tmux display-popup -w 80% -h 80% -E "tmux attach-session -t $session"
```

The session name is a hash of the current directory, so each directory gets its
own pi session. The first press creates a detached session running pi there.
Every later press attaches to the same one, so pi keeps its state. I wrote more
about it in
[Restructuring My Tmux Configuration by Reason for Change](/posts/tmux/restructuring-my-tmux-configuration-by-reason-for-change/).

Both scripts work, and I don't have a complaint about either. The friction shows
up when I use them together with several agents.

The popup sits over my panes, so I press `C-a d` to minimize it and `C-a y`
again to restore it. And `tmux-s` is designed to initialize my session, not
create the same layout in every new window. Once I'm inside tmux, opening
another tab means creating the panes manually with `C-a |` and `C-a -`.

Each of these is a small problem, but they add up. Instead of focusing on the
problem I was solving, I was thinking about how to organize my terminal
sessions.

Around then I came across
[a video about herdr](https://www.youtube.com/watch?v=2CR9tDNAzB0) and
[another where I first heard about rex](https://www.youtube.com/watch?v=TJg1J9X_-Ps).
I could have fixed my existing setup or written yet another Bash script.
Instead, I decided to try herdr.

## Why herdr Feels Different

herdr doesn't eliminate the operational friction I had with tmux. There's no
alias that creates three panes when I launch it, so I still arrange multiple
panes manually. In that regard, my workflow hasn't changed much.

Still, it feels more natural, and I don't feel lost. I think the difference is
between two kinds of friction:

- **Operational friction** is the number of steps it takes to get a layout. By
  that measure, herdr and tmux are about the same for me.
- **Cognitive friction** is how hard it is to keep track of where everything is.
  That's where herdr feels lighter.

The sidebar is a big part of that. It's a visual cue of what's going on per AI
agent and per workspace. That's my experience, not a benchmark. herdr doesn't
reduce what I have to do, but it makes it easier to understand where I am and
move around.

I'm a minimalist Neovim user. I generally prefer keeping my environment simple,
without unnecessary visual distractions, but I find this sidebar genuinely
useful. Most of the time I don't expand it, and I rarely open it. Collapsed, it
shows a number for each workspace (1, 2, 3, and so on) instead of the workspace
name, and that is enough for me.

I don't use tabs very often either. A single tab with multiple workspaces is
enough for my work today. If I were still working as a developer, I can imagine
using a workspace per part of a monorepo, one each for `apps/client`,
`apps/server`, and `shared`, and orchestrating different agents across them.

I'll cover my herdr configuration and workflow in a follow-up post, "Setting Up
herdr for Agentic Development."

## The Hidden Cost of Perfecting Your Tools

Session persistence is one of the things I like most about herdr. Being able to
return to my previous workspace without rebuilding everything makes a difference
in my daily workflow.

My tmux setup is plugin-free, so I don't have this. tmux does have plugins that
persist sessions, so I could resume my work after moving to another machine. I
just never added one. Technically, I could still add one now. Then I listed what
I already maintain:

- Neovim configuration.
- tmux configuration and custom scripts.
- split keyboard's Fifi QMK configuration.
- other CLI tools and personal automations.

Every custom tool I build is also something I have to keep working. A plugin
would mean one more moving part to maintain. That isn't worth it when herdr
already provides what I'm looking for.

I still enjoy customization. What I question more now is whether maintaining
every part of my environment is worth the time. I've long believed in building
things myself only when existing solutions don't provide what I need. If a
well-built, ready-made tool already solves the problem, I use it.

Technology, especially AI, is also moving fast. A few years ago, spending
significant time on a Neovim setup, tmux customization, and your own CLI tooling
made sense, and I still think that time was well spent. But new tools keep
showing up, and perfecting one setup may no longer be the best investment for
me.

## Craftsmanship in the Age of AI

None of this makes technical craftsmanship less important. Knowing how to build
something from scratch is still valuable. Understanding your tools, knowing how
they work, and being able to customize them are skills I'm glad I have.

What I'm noticing is that craftsmanship now includes identifying the right
problem, choosing the right tools, evaluating the results, and knowing when not
to build. Sometimes the best engineering decision isn't writing more code. It's
choosing the right tool and moving on.

That's how I think about adopting herdr. I didn't have to build anything. I had
to recognize what was getting in my way and pick something that fit.

## Knowing When to Move On

I'm not abandoning everything I built with tmux. Those years taught me a lot,
and I still appreciate the flexibility it offers. For now, herdr fits. It gives
me more room for the actual work, like solving integration problems, building
solutions, and collaborating with AI agents.

I'll keep exploring, and I'm curious about rex, so I'll probably try it next.
Maybe I'll return to tmux. Maybe I'll find something better. I'm not declaring a
winner.

What I've learned is when to build, when to adopt, and when to move on. The
tools should serve the work, not become the work.

Thank you, [Nicholas Marriott](https://github.com/nicm). See you around, tmux.
It's been quite a journey.

Nice to meet you, [Can Celik](https://github.com/ogulcancelik).

## Related Posts

- [Restructuring My Tmux Configuration by Reason for Change](/posts/tmux/restructuring-my-tmux-configuration-by-reason-for-change/)
- [The Zsh Configuration I Can Reason About](/posts/zsh/the-zsh-configuration-i-can-reason-about/)
- [Forty-Eight Lines of WezTerm Configuration](/posts/wezterm/forty-eight-lines-of-wezterm-configuration/)
- [Setup Neovim from Scratch with Native vim.pack and LSP](/posts/neovim/setup-neovim-from-scratch-with-native-vim-pack-and-lsp/)

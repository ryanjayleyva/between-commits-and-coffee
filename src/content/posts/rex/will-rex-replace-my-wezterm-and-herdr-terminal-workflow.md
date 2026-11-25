---
title: 'Will Rex Replace my WezTerm and Herdr Terminal Workflow?'
description:
  "After a couple of hours with Rex, I really enjoy it. I compare my fifty-five
  lines of Rex configuration to my WezTerm and herdr setup, and explain why I'm
  still undecided."
published: November 23, 2026
updated: November 25, 2026
tags: ['rex', 'herdr', 'wezterm']
---

I ended
[my last post about herdr](/posts/herdr/from-tmux-to-herdr-in-the-age-of-ai/) by
saying I was curious about rex and would probably try it next. I did, and this
post is about that, with a limit I want to state first. I've had a couple of
hours with it. This is a first impression, not a verdict.

My takeaway is simple, I really enjoy it. The friction came from somewhere I
didn't expect, and it's the reason I ended up writing a config file at all.

The question is whether Rex can replace my WezTerm and herdr setup. The answer
depends on what each file in my environment actually does, so I'll start there.

## TL;DR

Rex is both halves of my current stack, a terminal that draws the window and a
multiplexer that owns sessions, tabs, and panes. I enjoy it, but its default
keybindings felt like stepping into a different environment after herdr, so I
wrote a fifty-five-line Lua config that makes them feel like herdr again. The
upside is that one file could replace both WezTerm and herdr. I'm not ready to
say it does, and I haven't moved it into my dotfiles yet.

## What I'm Trying to Replace

Two tools do two jobs today.

- **WezTerm** draws the window. My
  [forty-eight-line config](/posts/wezterm/forty-eight-lines-of-wezterm-configuration/)
  sets a font, a palette, scrollback, and removes the title bar and tab bar. It
  binds no keys.
- **herdr** owns the work inside the window. My
  [config.toml](/posts/herdr/setting-up-herdr-for-agentic-development/) keeps
  the `Ctrl+a` prefix, maps `prefix+1..9` to workspaces, and shows agent state
  in a collapsed sidebar.

WezTerm decides how it looks, and herdr decides how I move. That split is why
the two files never overlap, and it's also why a single tool that does both is
an interesting question and not an obvious upgrade.

## Why Rex Is a Different Kind of Replacement

herdr is a multiplexer that lives inside my terminal. Rex is a different shape.
According to its docs, Rex runs a server that owns your sessions and a client,
like the Mac app, that shows them. The server is the part that reads `init.lua`,
and it runs on Linux and FreeBSD as well as macOS.

I haven't read everything about that model yet, and I don't want to describe
what I haven't verified. What matters for this post is simpler. The Mac client
hosts terminal panes itself, so Rex takes over the job WezTerm does today, and
it multiplexes, so it takes over the job herdr does today.

## Where the Friction Came From

Adopting herdr felt seamless. I kept the `Ctrl+a` prefix, and herdr's defaults
already felt familiar. Rex didn't. Its default keybindings are quite different,
and I felt that right away. It's like stepping into a completely different
environment.

Rex works out of the box, so reconfiguring is entirely optional. I still did it.
I also had to hide or tweak a number of UI settings to make it feel familiar
again, but the biggest part by far was the keybindings.

I'll be honest about the irony. I adopted herdr partly so I could stop
maintaining my own environment, and here I am writing another config. There's a
difference this time. It's one file, and if Rex works out, it replaces the two I
maintain today, WezTerm and herdr.

Because I'm not decided, I didn't push any of this to my dotfiles. I created a
separate repo for the experiment,
[rex-config](https://github.com/ryanjayleyva/rex-config), and that's what the
rest of this post walks through.

## The Configuration

The entry point is one line.

```lua
require("config.keymaps")
```

Everything else is in `config/keymaps.lua`, and it's all `rex.bind` calls. Rex
reads a single `init.lua` and gives you Lua 5.1 with a `rex` table, so splitting
a config into modules works the way it would in any Lua project. I split it on
purpose, and not only because I want `init.lua` to read like a table of
contents, the same reason my Zsh file is short. Right now the only chapter is
key bindings, but I'm hoping Rex will let me configure the UI from Lua soon.
When it does, I'd like to add something like `config/ui.lua` next to it and have
nothing to untangle. I'm writing a table of contents with room for chapters Rex
hasn't let me write yet.

My repo is as small as the config suggests.

```text
init.lua            # entry point, loads the modules under config/
config/keymaps.lua  # key bindings
```

### Unbinding First

```lua
for _, k in ipairs({
  "cmd+t",
  "cmd+w",
  "cmd+d",
  "shift+cmd+d",
  "cmd+n",
}) do
  rex.unbind(k)
end
```

The first thing the file does is remove five of the client's default `cmd`
shortcuts. Shortcut priority in Rex runs from client defaults, to the config
file, to shortcuts set in the app, so the config can remove a default instead of
fighting it.

I left `cmd+k` alone. It's the client's session switcher, and it does the job of
the `Ctrl+a k` chord I first bound for it, so I dropped the chord and kept the
default.

I did this for the same reason I keep the `Ctrl+a` prefix. My hands already know
one set of keys, and I don't want a second set that works by accident. That's
the same argument from the herdr post, applied one level up.

### The Prefix

```lua
rex.bind("ctrl+a>t", "client.tab.new")
rex.bind("ctrl+a>n", "client.tab.next")
rex.bind("ctrl+a>p", "client.tab.previous")
```

Rex writes a chord with `>`, so `ctrl+a>t` is `Ctrl+a`, then `t`. There's no
`prefix` setting like herdr has, so the prefix is repeated in every binding.
That is more typing, and it also means the file says exactly what each key does
without any indirection. Given how small it is, I don't mind.

Sessions, windows, tabs, and panes each get a block.

| Area     | Binding                                     | Action                                  |
| -------- | ------------------------------------------- | --------------------------------------- |
| Sessions | `s` `]` `[`                                 | new, next, previous                     |
| Sessions | `shift+r` `shift+q`                         | rename, close                           |
| Sessions | `cmd+k`                                     | switch (client default)                 |
| Windows  | `shift+n` `shift+x` `f`                     | new, close, toggle fullscreen           |
| Tabs     | `t` `n` `p` `shift+m`                       | new, next, previous, move to new window |
| Panes    | `shift+\` (`\|`) `-`                        | split right, split down                 |
| Panes    | `ctrl+a>h` `ctrl+a>j` `ctrl+a>k` `ctrl+a>l` | focus left, down, up, right             |

Two of those are worth a closer look.

### Splits Keep Their Familiar Shape

```lua
rex.bind("ctrl+a>shift+\\", "pane.split", { direction = "right" })
rex.bind("ctrl+a>-", "pane.split", { direction = "down" })
```

`C-a |` and `C-a -` are the keys I've used for years, and herdr moved me to
`prefix+v` and `prefix+minus`. Here I'm back to the old ones. The Lua string
needs `\\` to write a backslash, and the chord needs `shift` to reach `|`, which
is the kind of detail I would have gotten wrong without `rex config check`.

### Focus Keeps the Prefix

```lua
rex.bind("ctrl+a>h", "pane.focus.left")
rex.bind("ctrl+a>j", "pane.focus.down")
rex.bind("ctrl+a>k", "pane.focus.up")
rex.bind("ctrl+a>l", "pane.focus.right")
```

This matches herdr, where focus is `prefix+h/j/k/l`. It didn't start this way. I
first moved focus to bare `Ctrl+h/j/k/l` so moving between panes cost one chord
instead of two, and it had a price. Those four keys belonged to Rex before
anything running in the pane saw them, which clashed with vim-tmux-navigator in
Neovim, and `Ctrl+l` is how a shell clears the screen. Putting focus back behind
the prefix costs a second keypress, and nothing in the pane loses a key.

### Resize Mode

```lua
rex.bind("ctrl+a>r", "client.mode.enter", { name = "resize" })
rex.bind("ctrl+q", "client.mode.exit")

rex.bind("resize/h", "pane.resize", { direction = "left" })
rex.bind("resize/l", "pane.resize", { direction = "right" })
rex.bind("resize/k", "pane.resize", { direction = "up" })
rex.bind("resize/j", "pane.resize", { direction = "down" })
```

herdr has a resize mode too, and `prefix+r` enters it by default, so this is the
same idea I already use. A mode is a named set of shortcuts that only applies
while the mode is active. In Rex I press `Ctrl+a r`, then `h/j/k/l` as many
times as I need, then `Ctrl+q` to leave.

My herdr config never touches resize, so I never chose those keys. In Rex I had
to write them, and I picked `h/j/k/l` and `Ctrl+q` so the mode reads like the
rest of my keys. Writing the mode out made me notice how much of herdr's
behavior I rely on without ever having configured it.

### The Literal Prefix

```lua
rex.bind("ctrl+a>ctrl+a", "pane.send_key", { key = "ctrl+a" })
```

Taking `Ctrl+a` as a prefix means the shell loses `Ctrl+a` as "go to the start
of the line." The usual answer is pressing it twice, and I carried that over by
sending a literal `Ctrl+a` to the pane.

## The Theme

I use the
[kasumi](https://github.com/ryanjayleyva/kasumi.nvim/blob/main/extras/ghostty/kasumi)
theme, and you can import it into Rex.

In WezTerm, the whole palette is Lua in a file I version. In Rex, according to
the docs, the palette is a setting in the app's Themes page that can import
Ghostty and iTerm themes. There's no `colors` block in `init.lua`.

## What Carries Over, and What Doesn't

Here is the honest accounting, line by line against what I use today.

**Carries over:**

- The `Ctrl+a` prefix, and every chord that starts with it.
- Splits, and `h/j/k/l` for focus.
- Tabs, which I barely use.
- Sessions with next, previous, and the `cmd+k` switcher. That last one is the
  nearest thing to herdr's workspace jumping.

**Doesn't carry over, at least not in this file:**

- **Workspace numbers.** My herdr config maps `prefix+1..9` to workspaces and
  shows the number in a collapsed sidebar. My Rex config has no numeric binding,
  only next, previous, and a switcher.
- **A sidebar with a middle setting.** In herdr I collapse the sidebar until
  it's just a column of numbers. It takes almost no space, and it still tells me
  where I am and how many workspaces I have open. Rex gives me `cmd+/`, which
  shows or hides the sidebar completely. That's a light switch when I want a
  dimmer. Hidden, I lose the map, and shown, I pay for the full width. The
  middle setting is the one I used all day, and it's the one Rex doesn't have.
- **Agent status.** This is the one that matters. herdr's whole argument, in my
  first post, was cognitive friction, meaning seeing at a glance which agent is
  working, waiting, or done. Nothing in my Rex config does that.

Rex does have an agent story. It ships a skill and a session-start hook for
Claude Code, Codex, OpenCode, and Pi, so an agent can open tabs, split panes,
and read the screen. That's a different idea from herdr's. herdr shows me what
my agents are doing, and Rex lets the agents drive the terminal. I haven't set
it up, and I can't say which is more useful for how I work.

## Small Things I Noticed

- **Reload is manual.** WezTerm watches its file and reloads on save. Rex
  doesn't. After an edit I run `rex config reload` from the terminal or
  `:term rex config reload` inside Neovim , and it must run on the server's
  machine.
- **A bad line doesn't take the file down.** `rex config check` loads the file
  without applying it and reports counts for bindings, removals, modes, and
  actions. A bad `rex` call is skipped, a Lua syntax error fails the whole load,
  and the server keeps the last good config.
- **I added a commit hook for it.** The repo has a `.githooks/pre-commit` that
  runs `rex config check` on the repo's own `init.lua` and blocks the commit if
  it fails. It checks the repo's own `init.lua`, not whatever happens to be
  running. It's nineteen lines of Bash, and it's the same instinct as the tests
  I run on my theme.

## What I Can't Say Yet

This post has gaps, and I'd rather list them than hide them.

- **I've had a couple of hours.** Muscle memory takes longer than that, and so
  does finding out what annoys me.
- **Rex is in beta.** The macOS app and the Linux and FreeBSD servers are open
  to testers, and I have beta access, so some of what I describe may change.

## So, Will It Replace Them?

I don't know yet. I really enjoy Rex, and that matters more to me than any
feature list. The keys weren't hard to fix. Fifty-five lines got me back to
something that feels like my herdr setup.

What would settle it is the part the config doesn't cover:

- A way to see agent state at a glance, or a good reason I don't need one.
- A sidebar I can shrink to numbers, not just show or hide.
- My palette and font in a file I version, or an app setting I can live with.
- A few weeks of daily use without wanting to go back.

If I get those, replacing two tools with one is appealing for the same reason I
adopted herdr. Fewer parts to maintain means more room for the actual work. I
wrote forty-eight lines for WezTerm and forty-one for herdr, and I'd gladly give
up a file if the one that remains does both jobs.

For now, WezTerm and herdr stay in my dotfiles, and Rex lives in its own repo
until I'm sure. I'll come back to this after a month, and if it wins, I'll say
so.

Thank you to Superlogical for the
[Rex](https://www.superlogical.com/rex/docs/installation) beta access.

## Related Posts

- [From tmux to herdr in the Age of AI](/posts/herdr/from-tmux-to-herdr-in-the-age-of-ai/)
- [Setting Up herdr for Agentic Development](/posts/herdr/setting-up-herdr-for-agentic-development/)
- [Forty-Eight Lines of WezTerm Configuration](/posts/wezterm/forty-eight-lines-of-wezterm-configuration/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/tmux/restructuring-my-tmux-configuration-by-reason-for-change/)

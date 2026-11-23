---
title: 'Setting Up herdr for Agentic Development'
description:
  'A step-by-step walkthrough of my herdr config.toml, where I keep the tmux
  prefix, navigate by workspace, quiet the interface, and make agent states
  visible.'
published: November 19, 2026
updated: November 23, 2026
tags: ['herdr', 'agentic-workflow', 'terminal']
---

When I wrote
[From tmux to herdr in the Age of AI](/posts/herdr/from-tmux-to-herdr-in-the-age-of-ai/),
I promised a follow-up on my herdr configuration. Here it is, and it's a short
one.

It isn't about installing or configuring agents. It's about configuring herdr so
that working with several agents at once is more comfortable. I'll go through my
`config.toml` and what each setting does, so you can keep what works for you and
drop the rest.

I'll be honest up front. Most of this file is about getting out of the way. It
has no agent orchestration, no layouts, and no scripts. That's one of the things
I like about herdr. It works out of the box, so I don't have to spend time
building and maintaining the environment around it. I only change what makes my
workflow more comfortable.

## What I Wanted From It

I had a few goals:

- Keep the familiar tmux prefix, `Ctrl+a`.
- Use workspaces as the primary navigation.
- Make pane navigation and management predictable.
- Remove interface elements I don't need.
- Make agent states visible through status indicators.
- Keep herdr looking like the rest of my terminal.

## Where the File Lives

herdr reads `~/dotfiles-macos/.config/herdr/config.toml` by default, so there is
nothing to link or load. I edit it with Neovim:

```bash
nvim ~/dotfiles-macos/.config/herdr/config.toml
```

I'll go through the file one piece at a time, and the complete file is further
down.

While writing this post, I noticed that a lot of this file restates defaults.
According to the
[herdr configuration reference](https://herdr.dev/tui/docs/config-reference/),
`prefix+c`, `prefix+n`, `prefix+p`, `prefix+v`, `prefix+minus`, and
`prefix+h/j/k/l` are already the defaults. I wrote them down anyway. I'd rather
have the file say what my keys are than depend on what I remember about the
defaults. I'll flag which settings are defaults and which are my changes as I
go.

## Going Through the File

### Keeping My tmux Muscle Memory

```toml
[keys]
prefix = "Ctrl+a"
```

The default prefix is `Ctrl+b`. I changed it to `Ctrl+a`, the same prefix I used
in tmux, so every shortcut I listed in the first post still starts the way my
hands expect.

This is the cheapest line in the file, and it probably did the most for how
natural herdr felt on day one. Switching tools was one problem. Switching tools
and every shortcut would have been two.

### Workspaces First

```toml
# Rebind prefix+1..9 to workspaces because I rarely open new tabs
# Switch tabs with prefix+n and prefix+p instead
switch_workspace = "prefix+1..9"

# Tabs
new_tab = "prefix+c"
next_tab = "prefix+n"
previous_tab = "prefix+p"
```

`switch_workspace` is the line I changed on purpose rather than by habit. In
tmux, `C-a 1` through `C-a 3` switched windows, and I'm used to number keys
meaning "go to that thing." In herdr, I want them to go to workspaces, because a
workspace is the thing I move between most. The docs show `prefix+shift+1..9` as
their example, and I dropped the shift so it's a single keypress after the
prefix.

Tabs still work, and the three tab bindings are defaults. `prefix+c` creates a
tab, and `prefix+n` and `prefix+p` move between them. I just don't need them
often. As I wrote in the first post, a single tab with multiple workspaces is
enough for my work today, so the common move gets the short key.

The numbers also line up with the sidebar. With the sidebar collapsed (more on
that below), herdr shows a number for each workspace instead of its name. I see
a `2`, I press `prefix+2`.

### Splitting and Moving Between Panes

```toml
split_vertical = "prefix+v"
split_horizontal = "prefix+minus"

focus_pane_left = "prefix+h"
focus_pane_down = "prefix+j"
focus_pane_up = "prefix+k"
focus_pane_right = "prefix+l"
```

All six of these are herdr defaults.

In tmux, I split with `C-a |` and `C-a -`. herdr uses `v` for a side-by-side
split and `minus` for a stacked one. The `-` carried over, and `|` became `v`.
Both are easy to remember, so I didn't change them.

The focus keys are `h`, `j`, `k`, and `l`, the same motions I use in Neovim.
That's the part I appreciate most. I don't think about moving between panes any
more than I think about moving between lines.

As I said in the first post, herdr doesn't remove the manual work. I still
arrange my panes by hand. These keys make that work quick, but they don't make
it disappear.

### Zoom Instead of a Popup

```toml
# Maximize/Minimize pane
zoom = "prefix+m"
```

The default zoom key is `prefix+z`. I use `m` because I think of it as maximize
and minimize, which is what the comment says.

This one replaces a piece of my tmux friction. In tmux, I raised pi in a popup
with `C-a y`, minimized it with `C-a d`, and restored it with `C-a y` again. In
herdr, an agent is just a pane. When I want to focus on it, I zoom it. When I'm
done, I press the same key and the layout comes back as I left it. Nothing sits
on top of anything.

herdr isn't managing the agent here. Zoom is a pane operation, and it works the
same on any pane.

### Taking Things Away

```toml
onboarding = false

[ui]
pane_gaps = false
pane_borders = "off"
hide_tab_bar_when_single_tab = true
sidebar_start_collapsed = true
sidebar_width = 25

[ui.sound]
enabled = false
```

Most of the remaining file is subtraction. I'm a minimalist Neovim user, and I
prefer fewer visual distractions.

- `onboarding = false` skips the first-run setup. herdr writes this line itself
  once you continue past onboarding, so it isn't really a choice.
- `pane_gaps = false` removes the space between split panes, so they share a
  divider instead of floating apart.
- `pane_borders = "off"` turns the borders off. The default, `"auto"`, draws
  them on split panes.
- `hide_tab_bar_when_single_tab = true` hides the tab row when there is only one
  tab. Since I'm usually in a single tab, that row would be empty space.
- `sidebar_start_collapsed = true` starts the sidebar collapsed, which is what
  gives me the workspace numbers from earlier.
- `sidebar_width = 25` only matters on the few occasions I open the sidebar. The
  default is 26, so this is hardly a decision.
- `enabled = false` under `[ui.sound]` turns off the sounds herdr plays when an
  agent changes state in a background workspace. The default is on.

I should be careful here. Fewer borders and gaps mean less visual separation
between panes, and that's a real tradeoff. It works for me for now. If I ever
feel lost in a crowded workspace, borders are one line away.

### Seeing What the Agents Are Doing

```toml
[ui]
status_indicators = "symbols"
```

This is the only line in the file that is directly about agents. The default,
`"dots"`, shows compact colored dots. `"symbols"` shows distinct static symbols
for agent states instead.

This is my cognitive friction argument from the first post in one line. I'm not
trying to reduce how many steps it takes to do something. I want to know, at a
glance where each agent is, whether it's working, waiting, or done.

I haven't compared the two options over time, and I can't say symbols are better
for everyone. That's my experience, not a benchmark.

### Theme and Copy Behavior

```toml
[theme]
name = "terminal"
auto_switch = false

[ui]
copy_on_select = false
```

The default theme is `catppuccin`. I use `terminal`, which makes herdr's colors
follow my terminal's ANSI palette. That means herdr looks like the rest of my
terminal, and the palette stays in one place, my
[WezTerm configuration](/posts/wezterm/forty-eight-lines-of-wezterm-configuration/).
If I change a color there, herdr follows.

`auto_switch = false` is the default. It would switch themes when my system
changes between light and dark, but with `terminal` there is nothing to switch
between. I keep the line so the intent is written down.

By default, herdr copies text as soon as I select it with the mouse. I turned
that off with `copy_on_select = false`. With it disabled, `Ctrl+C` or a
forwarded `Cmd+C` copies the selection, so copying becomes a decision instead of
a side effect. This is a preference, and I don't have a strong argument for it.

## Complete Configuration

This is the whole file, exactly as it sits on disk.

```toml
onboarding = false

[theme]
name = "terminal"
auto_switch = false

[ui]
status_indicators = "symbols"
pane_gaps = false
pane_borders = "off"
hide_tab_bar_when_single_tab = true
copy_on_select = false
sidebar_start_collapsed = true
sidebar_width = 25

[ui.sound]
enabled = false

[keys]
prefix = "Ctrl+a"

# Rebind prefix+1..9 to workspaces because I rarely open new tabs
# Switch tabs with prefix+n and prefix+p instead
switch_workspace = "prefix+1..9"

# Tabs
new_tab = "prefix+c"
next_tab = "prefix+n"
previous_tab = "prefix+p"

# Splits and panes
split_vertical = "prefix+v"
split_horizontal = "prefix+minus"

focus_pane_left = "prefix+h"
focus_pane_down = "prefix+j"
focus_pane_up = "prefix+k"
focus_pane_right = "prefix+l"

# Maximize/Minimize pane
zoom = "prefix+m"
```

## Applying and Checking It

I reload the file with:

```bash
herdr server reload-config
```

A few settings only apply on the next launch, so if something doesn't change, I
restart herdr before assuming the config is wrong.

Then I walk through it:

- **Prefix:** `Ctrl+a` is recognized, and `Ctrl+b` no longer is.
- **Workspaces:** `prefix+1` through `prefix+9` switch workspaces.
- **Tabs:** `prefix+c` creates a tab, and `prefix+n` and `prefix+p` move between
  tabs.
- **Panes:** `prefix+v` and `prefix+minus` split, and `prefix+h/j/k/l` move
  focus.
- **Zoom:** `prefix+m` zooms a pane, and pressing it again restores the layout.
- **Status indicators:** with an agent running, I see symbols instead of dots.
- **Appearance:** no pane borders or gaps, no tab bar with a single tab, and a
  collapsed sidebar showing workspace numbers.

## What This Configuration Doesn't Do

The cost of this file is how little it does.

- There's no layout in it, so I still arrange my panes manually, the same as in
  the first post.
- There is no agent-specific orchestration. I don't tell herdr which agents I
  run or where.
- Several keybindings restate herdr defaults, so they aren't my decisions.
- Some preferences are subjective, like no borders, symbols over dots, and no
  copy on select. The `terminal` theme also depends on a palette I maintain
  somewhere else.

This is a deliberately minimal configuration, not a comprehensive
agent-management solution. I think that's fine. The file is short enough to read
in a minute, and every line that isn't a default has a reason I can explain. I
don't have to maintain anything beyond it, which was the whole point of adopting
herdr in the first place.

## Related Posts

- [From tmux to herdr in the Age of AI](/posts/herdr/from-tmux-to-herdr-in-the-age-of-ai/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/tmux/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Eight Lines of WezTerm Configuration](/posts/wezterm/forty-eight-lines-of-wezterm-configuration/)
- [The Zsh Configuration I Can Reason About](/posts/zsh/the-zsh-configuration-i-can-reason-about/)

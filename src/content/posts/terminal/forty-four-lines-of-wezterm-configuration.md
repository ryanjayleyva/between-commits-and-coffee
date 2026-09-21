---
title: 'Forty-Four Lines of WezTerm Configuration'
description:
  'A walkthrough of my WezTerm configuration in Lua, covering fonts, colors,
  scrollback, window decorations, and why tmux handles my shortcuts.'
published: September 11, 2026
updated: September 21, 2026
tags: ['wezterm', 'terminal', 'macos']
---

My WezTerm configuration is one Lua file, forty-four lines long. It picks a font
and a size, sets a color scheme, decides how much scrollback to keep, and
removes the title bar and the tab bar. It binds no keys. WezTerm's defaults
still exist, but the shortcuts I reach for are tmux's, so the file is left with
the window itself.

Every choice in the file keeps the window out of the way of the code. Tabs and
title bars are useful, but I do not need their controls visible all the time. I
can still open another tab or window when I need one. tmux is where I do most of
my grouping, so the tab bar does not need to occupy screen space.

## TL;DR

The config is one Lua file that returns a table. The table carries the font and
the zenbones palette, sets the scrollback to one thousand lines, and hides the
title bar and the tab bar. No keys are bound here. tmux owns the shortcuts and
the grouping, so the file only describes what the window looks like.

## How the File Is Organized

WezTerm evaluates the config file as Lua and uses the table it returns as the
configuration. The whole file is the config, shown here exactly as it sits on
disk:

```lua
local wezterm = require("wezterm")

local M = {}

M.spec = {
	enable_tab_bar = false,
	font_size = 18,
	font = wezterm.font_with_fallback({ "CaskaydiaCove Nerd Font" }),
	window_decorations = "RESIZE",
	scrollback_lines = 1000,
	colors = {
		foreground = "#B4BDC3",
		background = "#1C1917",
		cursor_bg = "#B4BDC3",
		cursor_border = "#B4BDC3",
		cursor_fg = "#1C1917",
		selection_bg = "#34302E",
		selection_fg = "#B4BDC3",
		scrollbar_thumb = "#34302E",
		split = "#34302E",
		ansi = {
			"#1c1917",
			"#7f6f72",
			"#727b6d",
			"#827968",
			"#6f7d89",
			"#7d7580",
			"#6f7f7d",
			"#b4bdc3",
		},
		brights = {
			"#4a4542",
			"#8a787b",
			"#7c8675",
			"#8d846f",
			"#7b8996",
			"#887f8c",
			"#7c8d8b",
			"#ced4d3",
		},
	},
}

return M.spec
```

The `M.spec` shape is just the convention the rest of my `~/env` follows.

WezTerm watches the file and reloads it on change. Editing is writing a line and
looking at the window. This config keeps no state between reloads. It builds a
table and returns it.

## One Opaque Surface

The window is fully opaque by default, so there is no line for it in the config.
That default suits me. I used to run a translucent window, and even slightly
transparent, the desktop behind it was enough to catch my eye. A moving browser
tile, a notification, a bright patch of wallpaper.

## Appearance

The colors are the largest block in the file. The palette is zenbones, a warm,
desaturated scheme: background `#1C1917`, a warm near-black gray, and foreground
`#B4BDC3`, a light gray.

The cursor uses the foreground color for its fill and border and the background
color for the text inside it. It is the two colors the file already has,
inverted.

Selection works the same way. The selected text is the foreground color, and the
highlight behind it is `#34302E`, a warm dark gray that sits between the
background and the text. The scrollbar thumb and the split separator use that
color too.

I keep the sixteen ANSI colors muted. The normal eight sit close to the
background, and the brights step up a little without jumping to full saturation.

Color comes from the tools inside, the tmux status line and the eza listings,
and I leave those alone.

## Window Decorations

`window_decorations = "RESIZE"` removes the title bar and keeps a resizable
border. The default is `TITLE | RESIZE`, so this is a one-flag change, and
RESIZE is the value WezTerm's docs recommend when you only want the title bar
gone.

In exchange for the title text and a drag handle, I get a row of pixels at the
top of every screenful, which in a terminal is text space. I do not miss the
title. In a window that mostly shows tmux, it was rarely the information I
wanted. I rarely open a second WezTerm window at all. When I want another view,
I reach for tmux, and the `tmux-s` alias builds the session and its panes.

## The Tab Bar

`enable_tab_bar = false` hides the bar. I rarely use the WezTerm tabs
themselves. tmux owns the grouping I care about. My tmux prefix is `C-a`:
`C-a c` creates a window, `C-a 1` through `C-a 3` switch by number, and the
`tmux-s` alias lays out the session's panes. A WezTerm tab bar would be a second
way to group the same sessions, and if I did not run a multiplexer I would
probably keep it.

## Font

A Nerd Font is a practical choice in my setup: eza and my prompt emit icon
glyphs that a stock monospace face does not carry, so I picked CaskaydiaCove
Nerd Font to make those render. `font_size = 18` is the size I read comfortably
at, and I do not scale it per platform.

`font_with_fallback` takes a list of faces in priority order. Today the list has
one entry.

## Scrollback

`scrollback_lines = 1000` sets how much WezTerm keeps of what scrolled off the
window. The default is 3,500, and I keep the buffer tighter because I never
scroll back through WezTerm's own history. tmux keeps its own per-pane history,
which I browse in copy mode, and I leave tmux's `history-limit` at its default.
A smaller buffer uses less memory and has less history to shed when a command
floods output.

The cost shows up with long output. When a build produces more output than the
terminal's scrollback history holds, the oldest lines fall out and stay out.
Scrollback is not logging.

For output I want to keep, I run `make 2>&1 | tee build.log` and search the file
instead. I type that command rather than alias it. Aliases have made me forget
the command underneath them in the past, so I accept the cost of typing the
whole command.

## Tradeoffs

The cost is location cues. With no title bar and no tab strip on screen, nothing
reminds me which directory I am in, and I created files in the wrong place more
than once before I got used to it. Three years in, the mistake is rare, but the
cost is real.

This is the smallest file in my environment, and I want to keep it that way. The
shell config initializes tools, the tmux config binds keys and builds sessions.
WezTerm just describes a window, and a window description does not need much
more than this.

The file is a set of preferences, stated plainly, short enough that changing any
of them is a line edit. That convenience has been the real payoff.

## Related Posts

- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)

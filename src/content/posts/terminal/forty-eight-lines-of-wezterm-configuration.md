---
title: 'Forty-Eight Lines of WezTerm Configuration'
description:
  'A walkthrough of my WezTerm configuration in Lua, covering fonts, colors,
  scrollback, window decorations, and why tmux handles my shortcuts.'
published: September 7, 2026
updated: November 14, 2026
tags: ['wezterm', 'terminal', 'macos']
---

My WezTerm configuration is one Lua file, forty-eight lines long. It picks a font
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
the cutiepro palette, sets the scrollback to ten thousand lines, and hides the
title bar and the tab bar. No keys are bound here. tmux owns the shortcuts and
the grouping, so the file only describes what the window looks like.

## How the File Is Organized

WezTerm evaluates the config file as Lua and uses the table it returns as the
configuration. The whole file is the config, shown here exactly as it sits on
disk.

```lua
local wezterm = require("wezterm")

return {
	enable_tab_bar = false,
	font_size = 18,
	font = wezterm.font_with_fallback({ "CaskaydiaMono Nerd Font" }),
	window_background_opacity = 1,
	window_decorations = "RESIZE",
	scrollback_lines = 10000,

	colors = {
		foreground = "#d5d0c9",
		background = "#181716",

		cursor_bg = "#e5a1a3",
		cursor_fg = "#181716",
		cursor_border = "#e5a1a3",
		compose_cursor = "#caa2ca",

		selection_fg = "#d5d0c9",
		selection_bg = "#383838",

		scrollbar_thumb = "#383838",
		split = "#2e2a27",

		ansi = {
			"#000000",
			"#f56e7f",
			"#bec975",
			"#f58669",
			"#42d9c5",
			"#d286b7",
			"#37cb8a",
			"#88847f",
		},

		brights = {
			"#2e2a27",
			"#e5a1a3",
			"#e8d6a7",
			"#f3b061",
			"#80c5de",
			"#c3a6cb",
			"#9ed7a8",
			"#d7c3ba",
		},
	},
}
```

It is a plain `return` of a table, with no helpers and no modules beyond
`wezterm` itself. The file lives in my `~/dotfiles-macos` repo and
`~/.wezterm.lua` is a symlink to it.

WezTerm watches the file and reloads it on change. Editing is writing a line and
looking at the window. This config keeps no state between reloads. It builds a
table and returns it.

## One Opaque Surface

`window_background_opacity = 1` makes the window fully opaque. That is also
WezTerm's default, but I state it anyway so the intent is on the page. I used to
run a translucent window, and even slightly transparent, the desktop behind it
was enough to catch my eye. A moving browser tile, a notification, a bright
patch of wallpaper.

I don't want any blur either, for the same reason. The config has no blur
setting, so nothing in the window is frosted or softened.

## Appearance

The colors are the largest block in the file, and they come from cutiepro. It
is a color scheme I made for Neovim, and I switched the terminal to it because I
am testing it there too. Running it in the place I look at all day is the
fastest way to find what needs refining. The project is
[cutiepro.nvim](https://github.com/ryanjayleyva/cutiepro.nvim) on GitHub.

The file sets the foreground and background, the cursor, the selection, the
scrollbar thumb, the split separator, and all sixteen ANSI colors, the normal
eight and the brights. Nothing relies on WezTerm's built-in scheme, so the
palette is whatever the file says it is.

## Window Decorations

`window_decorations = "RESIZE"` removes the title bar and keeps a resizable
border. The default is `TITLE | RESIZE`, so this is a one-flag change, and
RESIZE is the value WezTerm's docs recommend when you only want the title bar
gone.

In exchange for the title text and a drag handle, I get a row of pixels at the
top of every screenful, which in a terminal is text space. In a window that
mostly shows tmux, the title was rarely the information I wanted. I rarely open
a second WezTerm window at all. When I want another view, I reach for tmux, and
the `tmux-s` alias builds the session and its panes.

## The Tab Bar

`enable_tab_bar = false` hides the bar. I rarely use the WezTerm tabs
themselves. tmux owns the grouping I care about. My tmux prefix is `C-a`, so
`C-a c` creates a window, `C-a 1` through `C-a 3` switch by number, and the
`tmux-s` alias lays out the session's panes. A WezTerm tab bar would be a second
way to group the same sessions, and if I did not run a multiplexer I would
probably keep it.

## Font

A Nerd Font is a practical choice in my setup. eza and my prompt emit icon
glyphs that a stock monospace face does not carry, so I picked CaskaydiaMono
Nerd Font to make those render. It is installed through the `Brewfile`.
`font_size = 18` is the size I read comfortably at, and I do not scale it per
platform.

`font_with_fallback` takes a list of faces in priority order. Today the list has
one entry.

## Scrollback

`scrollback_lines = 10000` sets how much WezTerm keeps of what scrolled off the
window. The default is 3,500, so I keep nearly three times that. Lately I find
the extra history useful, so I raised it. The cost is memory, since a bigger
buffer holds more lines, and I have not measured how much that is.

tmux keeps its own per-pane history, which I browse in copy mode, and I leave
tmux's `history-limit` at its default of 2000. So this number is about what
WezTerm itself holds, and the two limits are independent.

The cost shows up with long output. When a build produces more output than the
terminal's scrollback history holds, the oldest lines fall out and stay out.
Scrollback is not logging.

For output I want to keep, I run `make 2>&1 | tee build.log` and search the file
instead. I type that command rather than alias it. Aliases have made me forget
the command underneath them in the past, so I accept the cost of typing the
whole command.

## Tradeoffs

The cost is location cues. With no title bar and no tab strip on screen, nothing
in the window chrome tells me which directory I am in. The prompt still shows
it, so the information is there, just not where a title bar would put it.

This is the smallest file in my environment, and I want to keep it that way. The
shell config initializes tools, the tmux config binds keys and builds sessions.
WezTerm just describes a window, and a window description does not need much
more than this.

The file is a set of preferences, stated plainly, short enough that changing any
of them is a line edit. That convenience has been the real payoff.

## Related Posts

- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Setup Neovim from Scratch with Native vim.pack and LSP](/posts/neovim/setup-neovim-from-scratch-with-native-vim-pack-and-lsp/)

---
title: 'How I Structure My Neovim Configuration by Concern'
description:
  'How I structure my Neovim configuration by concern, splitting options,
  keymaps, and autocommands into separate modules behind one entry point, with
  one ordering dependency that matters.'
published: September 13, 2026
updated: September 21, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

This post covers the base of my Neovim configuration, the part that is Neovim
itself. It is split by reason for change into three concerns, options, keymaps,
and autocommands, and `init.lua` is the entry point that composes them. One
ordering dependency ties the base together. The leader must be set before
keymaps are created. Nothing in the base comes from a plugin. The plugin layer,
loaded by `vim.pack`, is a separate subject with its own post. This is the
configuration I am carrying into 2027, and every layer above it builds on this
foundation.

The base is structured around four paths, `init.lua`, `lua/config/options.lua`,
`lua/config/keymaps/`, and `lua/config/autocmds/`. `init.lua` sits at the root
and does the loading. The other three live under `lua/config/`, one file for
options and one directory each for keymaps and autocommands. Each directory
holds an aggregator plus files split by concern.

All of this is a personal setup on one machine, macOS on Apple Silicon with a
recent stable Neovim from Homebrew, and `~/.config/nvim` is a Stow symlink into
`~/env/shared` along with my shell and terminal configs. Version-sensitive lines
are called out where they appear.

## TL;DR

The base of the Neovim setup is four paths. `init.lua` loads three modules with
`setup()` and `lua/config/` holds a file of options, a directory of keymaps, and
a directory of autocommands. None of it needs a plugin.

There is one ordering dependency in the base. The leader must be set before
keymaps are created. The autocommands sit last and depend on nothing.

## init.lua

Neovim evaluates `~/.config/nvim/init.lua` at startup on macOS. Mine is a
loader. The whole base reduces to three calls.

```lua
require('config.options').setup()
require('config.keymaps').setup()
require('config.autocmds').setup()
```

Everything that makes the editor behave is delegated out, which is what keeps
`init.lua` a loader instead of a config file. The real file continues below
these three lines with the plugin setup, which is outside this post's scope and
is not needed to understand any of this.

Each `require` resolves to a file under `lua/` in the config directory. Neovim
adds every `lua/` directory on its runtimepath to the Lua module search path,
and dots in a module name become separators. `require('config.options')` loads
`lua/config/options.lua`, and `require('config.keymaps')` loads
`lua/config/keymaps/init.lua`, because requiring a directory runs its
`init.lua`. So module names match the file layout exactly, and I never have to
think about where a `require` goes.

Each of these modules returns a table with the same `setup()` convention. A bare
`require` loads the file but runs nothing, since the functions inside only get
defined. Calling `.setup()` is what makes the module do its work, and it keeps
one entry point across every level of the configuration.

## lua/config/options.lua

Options were the first thing to leave `init.lua` when the configuration outgrew
one file, because they are the settings I touch most. The module groups them by
area, one function per concern.

```lua
local M = {}

function M.leader()
	vim.g.mapleader = ' '
end

function M.ui()
vim.opt.mouse = ''
	vim.opt.number = true
	vim.opt.relativenumber = true
	vim.opt.wrap = false
	vim.opt.termguicolors = true
	vim.opt.laststatus = 1
	vim.opt.conceallevel = 0
	vim.opt.signcolumn = 'yes:1'
	vim.opt.scrolloff = 8
	vim.opt.tabstop = 2
	vim.opt.winborder = 'rounded'
	vim.opt.expandtab = true
	vim.opt.shiftwidth = 2
	vim.opt.smartindent = true
end

function M.behavior()
	vim.opt.list = false
	vim.opt.spelllang = { 'en' }
	vim.opt.splitright = true
	vim.opt.splitbelow = true
end

function M.search()
	vim.opt.hlsearch = true
	vim.opt.ignorecase = true
	vim.opt.inccommand = 'split'
	vim.opt.smartcase = true
end

function M.shell()
	vim.opt.shell = vim.env.SHELL or 'zsh'
	vim.opt.clipboard = vim.env.SSH_TTY and '' or 'unnamedplus'
	vim.opt.completeopt = 'menu,menuone,noselect'
end

function M.misc()
	vim.opt.formatoptions:append('r')
	vim.opt.path:append('**')
	vim.opt.wildignore:append('*/node_modules/*')
	vim.opt.wildmode = 'longest:full,full'
	vim.opt.backspace = { 'start', 'eol', 'indent' }
	vim.opt.backup = false
	vim.opt.swapfile = false
	vim.opt.shortmess:append('WI')
	vim.g.deprecation_warnings = true
end

function M.setup()
	M.leader()
	M.ui()
	M.behavior()
	M.search()
	M.shell()
	M.misc()
end

return M
```

`M.setup()` runs the domain functions in a deliberate order. `M.leader()` comes
first because it assigns `vim.g.mapleader`, and `<leader>` in a mapping is
expanded when the mapping is created, not when it is pressed. The keymaps run
later, so the value has to exist before they do. The rest of `setup()` is just
the order I want the settings applied.

The assignments themselves are plain `vim.opt` lines grouped by what they
change. `ui()` owns numbers, wrapping, and the window. `search()` owns how
searches behave. `shell()` owns what child processes see. `misc()` owns file
handling. When I am looking for one setting I open the one function and nothing
else in the file.

A few entries deserve a closer look. `relativenumber` displays the absolute line
number on the current line and relative numbers everywhere else, so one option
covers both. `signcolumn = 'yes:1'` holds the sign column at a fixed
one-character width, which keeps diagnostics and marks from nudging the text
sideways. `inccommand = 'split'` shows substitution matches live in a split, and
`winborder = 'rounded'` styles floating windows and needs a recent Neovim, so on
an older install that single line can be removed without consequence.

Two of the functions carry decisions worth naming. In `search()`, `ignorecase`
with `smartcase` makes searches case-insensitive only while you type lowercase,
and an uppercase letter reverts to exact matching. `hlsearch` keeps the last
match highlighted until the `<leader>cs` mapping clears it. In `shell()`, the
editor runs with the shell from the environment, zsh as the fallback, so
commands invoked through `:!` match the shell I work in, and the clipboard line
enables `unnamedplus` locally while leaving the option empty over SSH, because
there is no local clipboard to use on a remote session.

`splitright` and `splitbelow` open new splits to the right and below, so the
buffer I am working in stays put. `misc()` turns off backup and swap files, so
the editor leaves no artifacts next to the files it opens. The trade is that a
hard crash can lose an unsaved buffer with no swap file to recover from.

Mouse is off, matching the tmux config. The line sets the option directly,
`vim.opt.mouse = ''`, and Neovim's current default is the opposite, mouse on
across all modes, so this line actually changes behavior rather than documenting
intent.

## lua/config/keymaps/

Keymaps have their own directory because that is where I look when a key does
the wrong thing. The structure mirrors the rest of the base, an aggregator that
lists two files.

`lua/config/keymaps/init.lua` is that aggregator.

```lua
local M = {}

function M.setup()
	require('config.keymaps.general').setup()
	require('config.keymaps.diagnostics').setup()
end

return M
```

`general.lua` holds the everyday keys.

```lua
local M = {}

function M.setup()
	-- Exit insert mode with jk
	vim.keymap.set('i', 'jk', '<ESC>')

	-- Increment and decrement numbers
	vim.keymap.set('n', '<leader>+', '<C-a>')
	vim.keymap.set('n', '<leader>-', '<C-x>')

	-- Clear search highlights
	vim.keymap.set('n', '<leader>cs', vim.cmd.nohlsearch)

	-- Save and source current file
	vim.keymap.set('n', '<leader>us', ':update<CR> :source<CR>')
end

return M
```

`jk` is the insert-mode escape, two keys under the home row instead of a reach.
The leader-prefixed plus and minus run the stock increment and decrement
commands. `<leader>cs` clears search highlights through `vim.cmd.nohlsearch`.
`<leader>us` writes and sources the current file, which is the loop I use to
apply edits to this configuration as I make them. Sourcing the aggregators or
`init.lua` reruns each `setup()`, which is why the autocommands below are
idempotent.

`diagnostics.lua` lives apart because its bindings come from `vim.diagnostic`,
part of Neovim core, and they stay useful once a language server attaches.
`setqflist` fills the quickfix list with the current buffer's diagnostics, and
`setloclist` fills the current window's location list instead.

```lua
local M = {}

function M.setup()
	-- Send diagnostics to quickfix list
	vim.keymap.set('n', '<leader>xq', vim.diagnostic.setqflist)

	-- Send diagnostics to location list
	vim.keymap.set('n', '<leader>xl', vim.diagnostic.setloclist)

	-- Toggle diagnostic virtual text
	vim.keymap.set('n', '<leader>xt', function()
		local current_status = vim.diagnostic.config().virtual_text
		vim.diagnostic.config({ virtual_text = not current_status })
		-- Uncomment vim.notify for toggle feedback
		-- vim.notify(
		-- 	'Diagnostics virtual text: ' .. (current_status and 'OFF' or 'ON')
		-- )
	end)
end

return M
```

The lists these bindings fill are empty before any language server is attached,
and that is fine, because the bindings are already in place when the data shows
up. The `<leader>xt` toggle reads whether virtual text is currently enabled,
flips it, and reapplies the diagnostic config. The `vim.notify` feedback is
commented out, which I consider the quieter choice.

None of these mappings carry a `desc`. Nothing in the base setup displays
mapping descriptions yet, and a comment per map already says what each one does.

## lua/config/autocmds/

The autocommand directory holds two events behind an aggregator.

`lua/config/autocmds/init.lua` is that aggregator.

```lua
local M = {}

function M.setup()
	require('config.autocmds.highlight_yank').setup()
	require('config.autocmds.text_wrap_spell').setup()
end

return M
```

`highlight_yank.lua` handles the yank highlight.

```lua
local M = {}

function M.setup()
	vim.api.nvim_create_autocmd('TextYankPost', {
		group = vim.api.nvim_create_augroup('YankHighlight', { clear = true }),
		callback = function()
			-- TODO: Replace vim.hl.on_yank() with vim.hl.hl_op() when Neovim 0.13 is released.
			vim.hl.on_yank({ timeout = 150 })
		end,
	})
end

return M
```

`TextYankPost` fires after an operation writes text to a register. The callback
calls `vim.hl.on_yank`, another piece of Neovim core, so the yank flash needs no
plugin. The TODO inside notes the planned move to `vim.hl.hl_op` once Neovim
0.13 releases, and this post targets a current stable where that swap has not
happened yet.

`text_wrap_spell.lua` turns on wrap and spell for text files.

```lua
local M = {}

function M.setup()
	-- Enable wrap and spell for text files
	vim.api.nvim_create_autocmd('FileType', {
		group = vim.api.nvim_create_augroup('TextWrapSpell', { clear = true }),
		pattern = {
			'gitcommit',
			'markdown',
			'text',
		},

		callback = function()
			vim.opt_local.wrap = true
			vim.opt_local.spell = true
		end,
	})
end

return M
```

`FileType` fires each time a filetype is detected. Matching three patterns, git
commits, Markdown, and plain text, the callback turns on wrap and spell. The
settings are applied with `vim.opt_local`, which changes the option for the
current buffer only. That contrast with `vim.opt` in `options.lua` is why these
rules are autocommands in the first place, since code buffers should never
inherit them.

Both autocommands register under a named augroup with `clear = true`. Without a
group, re-running `setup()` would stack a second copy of each callback and both
would fire. `clear = true` empties the group first, so reloading the base
mid-session does not double up.

## Load Order and Dependencies

Across the base there is one ordering dependency. The leader must be set before
keymaps are created. `setup()` in `init.lua` already runs the modules in that
order, so the constraint is enforced by the file layout rather than by a
comment.

The autocommands sit last because they read nothing at load time. Their
callbacks run on events, so their position in `init.lua` is a formality.

## The Resulting Layout

Copy the four paths and this is what the config directory looks like.

```bash
~/.config/nvim/
├── init.lua
└── lua/
    └── config/
        ├── autocmds/
        │   ├── init.lua
        │   ├── highlight_yank.lua
        │   └── text_wrap_spell.lua
        ├── keymaps/
        │   ├── init.lua
        │   ├── general.lua
        │   └── diagnostics.lua
        └── options.lua
```

Creating these files and launching Neovim produces the setup as described. The
editor starts with the base options applied, the bound keys active, and both
autocommands running. Nothing here requires a plugin to be installed.

On this machine the whole tree is a Stow symlink into `~/env/shared`, so every
file in it is versioned with the rest of the environment.

## Why I Split the Configuration

Everything above would also work from a single `init.lua`. Neovim does not care
how many files the configuration spans, and one file is easier to diff. The
split is not a correctness requirement.

It earns its place when I edit. A key that misbehaves points at
`keymaps/general.lua` before I have opened anything. A window that looks wrong
points at one named function inside `options.lua`. The git history of each
directory reads as the history of one concern, and small diffs are a side effect
of that rather than a goal.

The trade is a taller module graph. Every concern needs a path, and every file
needs its `setup()` call to trace. For a configuration this size I have decided
that is worth it, and the fixed order at the top of `init.lua` means the mental
model does not grow with the files.

## Conclusion

This is a small configuration that stays small for a specific reason. Options,
keymaps, and autocommands each know where they live, and the file boundaries
match the reasons I edit them. The cost is a handful of extra files and one
extra call per module, which is cheap next to never having to re-derive the
layout from scratch. That is the trade, and it is the whole story of the
structure.

Plugins are a separate subject, and the configuration that loads them has its
own post. Everything in this post runs on Neovim alone.

## Related Posts

- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

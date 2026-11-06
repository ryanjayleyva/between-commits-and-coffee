---
title: 'How I Configure Formatting in Neovim'
description:
  'How I wire formatting in Neovim with conform.nvim, mapping filetypes to
  command-line formatters on save. A closer look at StyLua and the committed
  stylua.toml explains the formatting rules for Lua.'
published: October 7, 2026
updated: October 14, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

Formatting in this configuration runs through one plugin,
`lua/plugins/conform.lua`, and the language servers that could also format those
buffers are kept off that path. The only formatter-specific configuration file
in this Neovim configuration is `stylua.toml`, so the Lua half of the setup has
rules of its own. That makes Lua the natural example: one filetype, `lua`, from
the entry point to the tool to the output, then the rest of the table in one
pass.

## TL;DR

Formatting runs through `conform.nvim`: one save hook, one filetype table, and
command-line formatters. The table maps twenty filetypes to tools, and `lua`
maps to `stylua`. StyLua reads a committed `stylua.toml` that fixes tabs, an
eighty-column target, single quotes where they do not need escaping, parentheses
on the calls that can omit them, and sorted require runs. Formatters run on the
write, and the configuration defines no other way to format.

## The File

`lua/plugins/conform.lua` is thirty-three lines: one plugin, one `setup()` call,
and two tables.

```lua
vim.pack.add({
	{ src = 'https://github.com/stevearc/conform.nvim' },
})

require('conform').setup({
	format_on_save = {
		lsp_format = 'never',
		timeout_ms = 5000,
	},

	formatters_by_ft = {
		astro = { 'prettier' },
		css = { 'prettier' },
		graphql = { 'prettier' },
		html = { 'prettier' },
		javascript = { 'prettier' },
		javascriptreact = { 'prettier' },
		json = { 'prettier' },
		jsonc = { 'prettier' },
		markdown = { 'prettier' },
		rust = { 'rustfmt' },
		toml = { 'taplo' },
		typescript = { 'prettier' },
		typescriptreact = { 'prettier' },
		yaml = { 'yamlfmt' },
		go = { 'goimports', 'gofmt' },
		lua = { 'stylua' },
		python = { 'isort', 'black' },
		sh = { 'shfmt' },
		sql = { 'sqlfmt' },
	},
})
```

The `format_on_save` table turns formatting on. Without it, conform would format
only when something calls `conform.format()`, and nothing else in this
configuration does. The two keys set how the automatic path behaves.
`lsp_format = 'never'` tells conform not to hand a write to a language server,
and `timeout_ms = 5000` bounds how long a write can wait on a formatter. The
ceiling is five seconds because conform's own default is one.

`never` is also conform's default for `lsp_format`, so the line pins behavior
that already holds. It matters because language servers are enabled for many of
these filetypes, and the option is what keeps a write from falling through to
one.

The second table is the policy, each key a Neovim filetype, each value the
formatters to run for it. This post follows `lua = { 'stylua' }`.

## Lua Goes to StyLua

A write to a Lua buffer makes its way to `stylua` through two decisions that
keep anything else out. One is conform's `lsp_format = 'never'`, which keeps the
attached server from getting a turn, whatever it advertises. The other is the
server's own. `lsp/lua_ls.lua`, the spec for the one server that covers `lua`
files, disables the formatter lua_ls carries. Its settings table puts
`format = { enable = false }` under `Lua`, so the server would not format even
if it were asked.

StyLua itself is a binary outside Neovim, and it brings its own configuration
lookup. It searches for a file named `stylua.toml` or `.stylua.toml` starting at
the file's directory and walking upward, so every Lua file inside this
configuration resolves to the single `stylua.toml` at the configuration root.

## The StyLua Configuration

`stylua.toml` is nine lines and holds every formatting decision for this
configuration's Lua.

```toml
column_width = 80
line_endings = "Unix"
indent_type = "Tabs"
indent_width = 2
quote_style = "AutoPreferSingle"
call_parentheses = "Always"

[sort_requires]
enabled = true
```

Every example below was produced or checked with the installed stylua, version
2.5.2, under this file.

`column_width = 80` is the wrapping target, and it is a soft one. StyLua treats
it as a guide and will exceed it rather than break a line where the break would
not help. What happens at the edge shows in a long concatenation, which comes
back with the operator leading each continuation, one tab of indentation deep:

```lua
local joined = 'aaaa'
	.. 'bbbb'
	.. 'cccc'
	.. 'dddd'
```

`line_endings = "Unix"` forces the LF newline. A file handed to stylua with CRLF
endings came back with LF, so the setting overrides whatever the input used.

`indent_type = "Tabs"` makes the indentation characters tabs, as the wrapped
example shows. `indent_width = 2` does not set the width of a tab. It is
stylua's count of one level of indentation when it decides where lines wrap, so
it reads alongside `column_width` rather than alongside the editor. The editor
happens to agree anyway. `lua/config/options.lua` sets `tabstop` to 2, so a tab
renders two columns wide and what stylua writes matches what the buffer shows.

`quote_style = "AutoPreferSingle"` prefers single quotes and falls back to
double quotes when they avoid an escape. `local s = "double"` comes back as
`local s = 'double'`, and a string that contains a single quote keeps its double
quotes rather than escaping into `'it\'s'`. The preference is decided per
string, not per file.

`call_parentheses = "Always"` sets the rule for Lua's shorthand call syntax,
where a single string or single table argument can appear without parentheses.
`Always` writes the parentheses in, so `print "hi"` becomes `print('hi')` and
`require "mod"` becomes `require('mod')`, the shape the plugin files in this
configuration already use. Calls that already carry parentheses are left alone.
It is also stylua's default, so the line makes the intended style explicit
rather than overriding the default.

The last block sorts. With `[sort_requires] enabled = true`, stylua reorders
runs of consecutive `local` assignments to a `require()` call, lexicographically
by the assigned name. Two requires written out of order:

```lua
local b = require('b')
local a = require('a')
```

come back reordered:

```lua
local a = require('a')
local b = require('b')
```

The sort applies only to that shape, and only within a run. Any line that is not
a local require assignment ends the run, so a run on the far side of a break
sorts on its own. A bare `require()` call is that other shape, and stylua leaves
it where it is regardless.

The configuration has both shapes. `lua/plugins/nvim-cmp.lua` carries a
consecutive pair, `local cmp = require('cmp')` and
`local luasnip = require('luasnip')`, already in the order sorting produces. On
the other side, the autocmds module makes two bare calls back to back:

```lua
local M = {}

function M.setup()
	require('config.autocmds.highlight_yank').setup()
	require('config.autocmds.text_wrap_spell').setup()
end

return M
```

They are consecutive, and sorting leaves them alone, because neither is a
`local` assignment. A `--check` run of stylua 2.5.2 over this file and the
others quoted here reports them all as already formatted.

## The Rest of the Table

Everything else in `formatters_by_ft` is the same mechanism under other tools.
Twelve of the twenty entries name `prettier`, covering astro, css, graphql,
html, javascript, json, jsonc, markdown, svelte, typescript, and both React
variants. Eight more name a program of their own: `rustfmt`, `taplo`, `yamlfmt`,
`stylua`, `shfmt`, `sqlfmt`, and the two pairs for Go and Python.

Two filetypes run more than one tool. Go maps to `goimports` then `gofmt`, and
Python to `isort` then `black`. conform runs the list in order from first to
last, and with `stop_after_first` unset, both entries run. A filetype the table
does not mention gets nothing. The configuration supplies no formatter for it,
and with `lsp_format = 'never'` Conform does not fall back to a language server.

Where the tools come from is `lua/plugins/mason.lua`. `mason-tool-installer` is
configured to install the command-line programs, thirteen in its list, and nine
of those are names this table uses: `prettier`, `stylua`, `shfmt`, `sqlfmt`,
`taplo`, `yamlfmt`, `isort`, `black`, and `goimports`. Two more are not in the
list. `gofmt` ships with the Go toolchain and `rustfmt` with Rust, so the table
expects them on the path from outside Mason. conform resolves each name against
what is available before a run, so a missing binary drops that entry rather than
failing the write.

## The Boundaries

The wiring ends at the write. No mapping in `lua/config/keymaps/` formats a
buffer, nothing in the tree calls `conform.format()` by hand, and there is no
binding for `vim.lsp.buf.format()`, so the save hook is the only trigger the
configuration installs. One option shares the word without sharing the
mechanism. `formatoptions` carries an `'r'` flag from `lua/config/options.lua`
that continues comment leaders while typing, and conform does not touch it.

The evidence here is of two kinds. The output blocks ran stylua 2.5.2 directly
on small inputs under this `stylua.toml`, and the `--check` results point the
same version at copies of real files. I did not save a file through Neovim and
watch conform run, so the save path rests on the configuration and conform's
documented behavior, not on an observed run.

## Conclusion

Formatting is configured through one save hook and one filetype table, with
StyLua as the detailed example. The formatter outputs and the `--check` results
were produced with the installed stylua and the committed config, leaving only
the integrated Neovim save path inferred from the configuration and Conform's
behavior.

## Related Posts

- [How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/)
- [How I Wire Completion with nvim-cmp in Neovim](/posts/neovim/how-i-wire-completion-with-nvim-cmp-in-neovim/)
- [How I Configure Lua Language Server with Mason in Neovim](/posts/neovim/how-i-configure-lua-language-server-with-mason-in-neovim/)
- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)
- [How I Configure Linting in Neovim](/posts/neovim/how-i-configure-linting-in-neovim/)
- [How I Load Plugins with vim.pack in Neovim](/posts/neovim/how-i-load-plugins-with-vim-pack-in-neovim/)
- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

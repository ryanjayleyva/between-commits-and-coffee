---
title: 'How I Wire Completion with nvim-cmp in Neovim'
description:
  'How I wire completion and snippets onto one key with nvim-cmp in Neovim: the
  four sources, the Tab chain that decides between them, and the snippet engine
  this file borrows from another module.'
published: October 1, 2026
updated: October 4, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

`lua/plugins/nvim-cmp.lua` is eighty-two lines and it is the file under
`lua/plugins/` that departs furthest from the convention the rest of them share.
Most of them call a plugin's `setup()` and return nothing. Seven never call one
at the module level, and they are not all in the same shape: three of them,
`nvim-surround.lua`, `plenary.lua`, and `schemastore.lua`, install a plugin and
stop, two more set a keymap or a colorscheme at the top level, and only
`nvim-lint.lua` and `vim-dadbod.lua` do their work at an event. Those last two
are the closest to this file's shape. This one configures the completion engine
at the top level of the module and defines no named function and no `setup()`.
That break is what makes the file read top to bottom, and it is worth opening
the file for, because the previous post measured what this one receives and
stopped there.

[How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/)
spent its longest section diffing two capability tables and concluded that the
client advertises the base plus six completion refinements. Those six belong to
`cmp-nvim-lsp`, and `lua/core/lsp.lua` only chooses between two tables: Neovim's
`make_client_capabilities()`, or whatever `cmp_nvim_lsp.default_capabilities()`
returns. The `pcall` on line twelve of that file is what makes the choice safe,
and the order in `init.lua` is what keeps the choice from being needed. This is
the module that `pcall` is looking for, and `init.lua` loads it on line
twenty-two, five lines before `core.lsp` on line twenty-seven.

The base is
[How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/),
and the first tenant is
[How I Configure Lua Language Server with Mason in Neovim](/posts/neovim/how-i-configure-lua-language-server-with-mason-in-neovim/).
Same machine as both, macOS on Apple Silicon with a current stable
[Neovim](https://github.com/neovim/neovim) from Homebrew at 0.12.5 as of this
writing, and `~/.config/nvim` a Stow symlink into `~/env/shared`. The `lsp/`
convention the previous post depends on landed in 0.11, along with
`vim.lsp.enable()`, so this post assumes at least that. Every plugin version
here is pinned in `nvim-pack-lock.json` and installed at that revision, which is
what lets me write down line numbers. The repository is at
https://github.com/ryanjayleyva/env under `shared/.config/nvim/`.

## TL;DR

The file installs five plugins and configures one. Four completion sources are
declared, LSP, snippets, paths, and the current buffer, and the buffer source is
switched off above five thousand lines. The snippet expansion engine is
replaced, because the stock default on 0.10 and up hands the body to
`vim.snippet.expand` and this configuration runs LuaSnip instead.

The mapping is `cmp.mapping.preset.insert` with seven keys layered over it. Six
of those seven are not in the preset. `<Tab>` is the one that matters, and it is
a three-way chain rather than a selection step, which is the whole reason
snippets and completion can share one key.

The file depends on a sibling module it does not install. It calls
`require('luasnip')` on line ten, and the `vim.pack.add` that puts LuaSnip on
the runtimepath is in `lua/plugins/luasnip.lua`.

## The File

```lua
vim.pack.add({
	'https://github.com/hrsh7th/nvim-cmp',
	'https://github.com/hrsh7th/cmp-nvim-lsp',
	'https://github.com/hrsh7th/cmp-path',
	'https://github.com/hrsh7th/cmp-buffer',
	'https://github.com/saadparwaiz1/cmp_luasnip',
})

local cmp = require('cmp')
local luasnip = require('luasnip')

cmp.setup({
	snippet = {
		expand = function(args)
			luasnip.lsp_expand(args.body)
		end,
	},

	mapping = cmp.mapping.preset.insert({
		['<C-b>'] = cmp.mapping.scroll_docs(-4),
		['<C-f>'] = cmp.mapping.scroll_docs(4),
		['<C-Space>'] = cmp.mapping.complete(),
		['<C-e>'] = cmp.mapping.abort(),
		['<CR>'] = cmp.mapping.confirm({ select = true }),

		['<Tab>'] = cmp.mapping(function(fallback)
			if cmp.visible() then
				cmp.select_next_item()
			elseif luasnip.expand_or_locally_jumpable() then
				luasnip.expand_or_jump()
			else
				fallback()
			end
		end, { 'i', 's' }),

		['<S-Tab>'] = cmp.mapping(function(fallback)
			if cmp.visible() then
				cmp.select_prev_item()
			elseif luasnip.jumpable(-1) then
				luasnip.jump(-1)
			else
				fallback()
			end
		end, { 'i', 's' }),
	}),

	sources = cmp.config.sources({
		{ name = 'nvim_lsp' },
		{ name = 'luasnip' },
		{ name = 'path' },
		{
			name = 'buffer',
			option = {
				get_bufnrs = function()
					local buf = vim.api.nvim_get_current_buf()
					return vim.api.nvim_buf_line_count(buf) > 5000 and {} or { buf }
				end,
			},
		},
	}),

	window = {
		completion = cmp.config.window.bordered(),
		documentation = cmp.config.window.bordered(),
	},

	formatting = {
		fields = { 'kind', 'abbr', 'menu' },
		format = function(entry, vim_item)
			local source_names = {
				nvim_lsp = '[LSP]',
				luasnip = '[Snip]',
				buffer = '[Buf]',
				path = '[Path]',
				['vim-dadbod-completion'] = '[DB]',
			}
			vim_item.menu = source_names[entry.source.name]
				or ('[' .. entry.source.name .. ']')
			return vim_item
		end,
	},
})
```

Read the shape before the details. There is no local table, no `M`, no
`setup()`. The module body runs once when `init.lua` requires it, and what it
leaves behind is state inside two plugins.

It is worth being precise about how much of it is mine, because the answer is
less than the file's structure suggests. nvim-cmp's README has a section called
_Recommended Configuration_, and it contains `luasnip.lsp_expand(args.body)`,
`cmp.config.window.bordered()` for both windows, and five of the seven mapping
overrides below: `scroll_docs(-4)`, `scroll_docs(4)`, `complete()`, `abort()`,
and `confirm({ select = true })`. The README also marks the snippet engine as
required, so `snippet.expand` is a field the documented setup insists on rather
than a replacement for something the plugin already had.

Four things here are not in that block. The `<Tab>` and `<S-Tab>` chains replace
preset entries that do not exist in the first place. `formatting` is absent. The
buffer source carries a `get_bufnrs` that decides whether it indexes anything.
And `path` is not in the insert setup at all: the README declares three sources
there, `nvim_lsp`, a snippet source, and `buffer`, and it reaches for `path`
only under `cmp.setup.cmdline`. The logic worth reading the file for is the two
chains and the `format` function, and none of the three has a configuration
equivalent.

## Why nvim-cmp at All

The commit that added this file gives the reasoning, and one sentence of it is
wrong, though not the way the argument usually goes. It says none of the
built-in surfaces reach language server items or snippet jumps. On the version
this post runs, the second half is a stale worry rather than an error. Neovim
did not ship a snippet-jump key before 0.11;
`runtime/lua/vim/_core/defaults.lua` grew a `set_snippet_jump` block in 0.11
that maps `<Tab>` and `<S-Tab>` in insert and select mode to
`vim.snippet.active`. The commit never named `<Tab>` among the surfaces it was
reasoning about, so the sentence is not strictly false, but the gap it was
arguing for has since been filled natively. Later in this post that same mapping
turns out to be the one `<Tab>`'s `fallback()` lands on.

The LSP half was never true. `vim.lsp` sets `v:lua.vim.lsp.omnifunc` on the
buffer when a client attaches, and it did so well before 0.11, so the stock
`<C-x><C-o>` route does reach a server. The condition is `is_empty_or_default`,
and it is narrower than it sounds: the option has to be empty, or its last
setter has to be a script living under `$VIMRUNTIME`. A filetype plugin that
assigns its own `omnifunc` is not counted as replaceable, so `vim.lsp` steps
aside and leaves the value in place.

What the built-ins do not have is a source model. They present one surface. That
surface will not autotrigger, because `autotrigger` defaults to `false` in
`vim.lsp.completion` and calling `enable()` does not change that; it has to be
asked for per buffer. It does not read snippet files, buffer words, or paths.

The honest version of this argument is not that they cannot reach a server. It
is that they reach exactly one, on a keypress, and that the `lsp/` convention
means a language is added by writing one spec file and adding one string to a
list. Nothing in the `vim.lsp` path is keyed by filetype, because there is only
the one surface. A language that wanted a third there would have to set its own
`omnifunc` per filetype, and since `is_empty_or_default` reads that as a
non-runtime value, the client stops installing its own and the route survives
only by losing the built-in LSP one. That is a third place to touch for the same
language, and it is a subtraction rather than an addition, which breaks the
property the previous post spent its closing section on.

This file has no filetype-keyed entry point either, which is the point. nvim-cmp
has one — `cmp.setup.filetype` — and this configuration does not use it. Sources
are declared once and each one asks the buffer's filetype questions itself.

## The Snippet Engine Is Borrowed

`snippet.expand` overrides the one behavior that would otherwise be handled by
Neovim core. The default, on 0.10 and up, is `vim.snippet.expand(args.body)`,
and below 0.10 it raises `snippet engine is not configured.` rather than doing
nothing. `vim.snippet` takes a single string in the LSP snippet syntax. It has
four public functions — `expand`, `jump`, `active`, `stop` — and no trigger
matching and no file loader, so a VS Code snippet file has nowhere to come from.
LuaSnip's `lsp_expand` takes the same body and routes it through LuaSnip's own
parser, so a snippet that arrives from a server and a snippet that arrives from
a snippet file end up in the same session state.

That matters because snippet items reach nvim-cmp by two different routes and
only one of them passes through the block above. A `luasnip`-source entry is
expanded by `cmp_luasnip`, whose `execute` calls `luasnip.snip_expand` itself.
The current version never sets `insertTextFormat` on anything it returns, so it
never arrives at `snippet.expand` at all. An LSP CompletionItem with
`insertTextFormat` of Snippet does go through the block, and without the
override it would land in `vim.snippet`. That is what puts both routes into the
same session state, which is what lets the `<Tab>` chain see a snippet either
way.

`cmp_luasnip` is installed here and the snippet files are loaded from a
different module, `lua/plugins/luasnip.lua`, which lazy-loads
`friendly-snippets` for sixteen filetypes. The `enable_autosnippets` it
configures does nothing for those. The VS Code loader hands the autosnippets
table to `add_file_snippets` as `{}`, and the Lua loader is the one that passes
a real table. The hook still runs: `luasnip.config.setup` installs an
`InsertCharPre` autocmd that calls `expand_auto()` on every keystroke, and
`expand_auto` matches against the autosnippets table. There is simply nothing in
it to match.

The override also drops the second argument. `luasnip.lsp_expand` takes a body
and an optional table that it passes straight to `snip_expand`; this call site
gives it only the body, so nothing here can set a trigger or a capture
environment. The stock default drops more — `vim.snippet.expand` takes one
parameter, so `insert_text_mode` goes unused there too. Nothing in the
configuration needs either, and the LSP spec does not send them.

The edge is the require. Line ten is `require('luasnip')`, and the
`vim.pack.add` that puts LuaSnip on the runtimepath is not in this file. It is
in `lua/plugins/luasnip.lua`, and `init.lua` loads that module on line
twenty-one and this one on line twenty-two. Delete the require from `init.lua`,
or reorder these two lines, and this file raises a module-not-found error at
startup. I checked that by swapping them: the other order fails at
`nvim-cmp.lua:10` with `module 'luasnip' not found`. That is the opposite of the
quiet degradation the previous post described, and the ordering rule the series
has accumulated so far is entirely about failures that stay quiet.

## What the Preset Does Not Give You

`cmp.mapping.preset.insert` supplies six keys. `<Down>` and `<Up>` move the
selection with the `Select` behavior, `<C-n>` and `<C-p>` move with `Insert` and
call `cmp.complete()` when the menu is closed, `<C-y>` confirms with
`select = false`, and `<C-e>` aborts. Five of the seven overrides below are
straight out of the README block, which is a fair signal that they are the
sensible defaults rather than a personal scheme.

`<C-b>` and `<C-f>` scroll the documentation window by four lines each, which is
literal — the current `docs_view.scroll` shifts the window's `topline` by the
delta and clamps it to the content. With no documentation window open,
`cmp.scroll_docs` returns false and the mapping falls back instead of scrolling.
`<C-Space>` forces completion open, and never falls through: `cmp.complete`
returns true unconditionally, so its fallback is unreachable. `<CR>` confirms
with `select = true`.

One is a duplicate. `<C-e>` appears on both sides and both sides bind it to
`cmp.mapping.abort()`. `preset.insert` calls `merge_keymaps(override, preset)`,
and `misc.merge` returns its first argument on a conflict, so the file's copy is
the one that ends up bound. It is harmless and it is also a line that could be
deleted with no observable change, which is the kind of thing I would rather
write down than leave for the next person on this machine to wonder about.

`select = true` on `<CR>` pairs with a setting that is not in this file.
nvim-cmp has its own `completion.completeopt`, default `menu,menuone,noselect`,
and this configuration never sets it. The `noselect` check that decides whether
the first entry is highlighted when the menu opens is read from that field.
Separately, `lua/config/options.lua` sets `vim.o.completeopt` to the same
string, and that one belongs to Neovim; nvim-cmp touches it in exactly one
place, while temporarily swapping Neovim's own popup menu, which this
configuration does not use. So the base post describes a choice that agrees with
an upstream default, and `<CR>` is what makes it coherent. With `select`, a
confirm takes the highlighted entry or the first one when nothing is
highlighted, so a single press is enough to accept a result.

## The Tab Chain

`<Tab>` is the reason this file exists in the shape it has. A selection step
does not compose with a snippet engine, because the two want the same key at
different moments, and the moment is the only thing that tells them apart.

The branch order answers the question in order. `cmp.visible()` is true when
nvim-cmp's menu is up, and also when Neovim's own popup menu is, so the first
branch covers both. When it is true, `<Tab>` moves down the list and LuaSnip is
never consulted. When it is false, `luasnip.expand_or_locally_jumpable()`
decides, and that function answers true for either of two situations. It is true
when a snippet can be expanded at the cursor, and it is true when the cursor is
inside a snippet and the current node can be jumped forward from. The current
LuaSnip hardcodes the forward direction in that second test, which is why
`<S-Tab>` cannot use the same function. Both cases get `expand_or_jump`, which
does the right one.

So `<Tab>` is three behaviors stacked on one key: move through the menu while
one is open, expand a snippet at a trigger when one is not, and step to the next
tab stop when the cursor is already inside an expanded snippet.

The `fallback()` in the third branch is the interesting part, because on 0.11
and up it has somewhere specific to go. nvim-cmp captures whatever `<Tab>` was
mapped to before it took over, and replays it. On this version that is Neovim's
own snippet-jump mapping, an `expr` map that calls `vim.snippet.active` and
jumps if a native snippet is running. Because `snippet.expand` is LuaSnip here,
no native snippet is ever active, so the check returns false and the key lands
as a literal `<Tab>`. The chain is not only overriding a selection step. It is
sitting on top of a native snippet engine that has nothing to drive it, which is
the gap the commit message was written before 0.11 filled.

`<S-Tab>` is the same chain pointed backwards, with one asymmetry. It tests
`luasnip.jumpable(-1)` rather than the combined function. There is no backwards
equivalent of expanding a snippet, because expansion is a forward event, so the
third branch has nothing to expand and does not need the combined test.

The `cmp.mapping` call takes a second argument, `{ 'i', 's' }`, and that is not
the preset's shape. The preset binds its keys as a table keyed by mode, insert
only. I confirmed that every key in this file resolves to insert mode alone
except these two, which resolve to both. `cmp.mapping` has a metatable that
turns a function and a list of modes into that shape. Tab stepping through
snippet placeholders while a selection is active is the reason the second mode
is there.

## Sources, and the One With a Condition

Four sources, declared once, with no filetype table anywhere. `nvim_lsp` is the
bridge to the sixteen servers the previous post enabled, and it is the source
that reads the capabilities `core.lsp` selects. `luasnip` is the bridge to the
snippet files. `path` is filesystem paths. `buffer` is words already in the
current buffer. `cmp.config.sources` builds that list; it does not extend
anything.

The buffer source carries the only conditional in the file that governs a
source. The others are the branch conditions in the two mapping chains, which
decide a key rather than a source. `cmp-buffer`'s `get_bufnrs` returns the
buffers it should index, and its own default is the current buffer alone. This
configuration returns an empty list when the buffer is over five thousand lines.
In the current cmp-buffer that means no indexer is built: the buffer objects are
constructed inside the same loop that reads the list, so an empty list skips
construction, the indexing timer, and the buffer watcher, and `complete` then
returns no items. The list is read again on every `complete`, so a buffer that
was indexed once already keeps its object and its timer in `source.buffers`
until the close callback retires it. Only a buffer that was never indexed stays
that way for the whole session. cmp-buffer's own README documents the option and
offers this exact recipe as its large-file example, with a byte count in place
of the line count. nvim-cmp's README does not mention it, which is the part
worth knowing when you are reading the file rather than the docs.

The comparison is `> 5000`, so a file of exactly five thousand lines is still
indexed. The reason is cost, and the commit message states the rule plainly:
"Buffer completion is skipped when the file exceeds 5000 lines." A buffer that
large is not one I am reading, it is one I opened to look at something in it,
and indexing every word of it to complete from is work spent on a buffer that is
about to be closed. The threshold is a round number rather than a measured one,
and I have not profiled where the actual cost starts.

## The Menu Label Scheme

`formatting.fields` reorders the columns, and the renderer walks that list in
order, so the order here is the order on screen. The default is
`{ 'abbr', 'icon', 'kind', 'menu' }`. This file puts `kind` first, keeps `abbr`
second, drops `icon`, and puts `menu` last. Kind first is the decision, and the
kind is the full LSP name — a `kind` of 3 renders as `Function`, a `kind` of 22
as `Struct`, which reads the same without a glyph in front of it.

The icon is worth a note, because dropping it changes nothing here. nvim-cmp
looks icons up through `lspkind` when it is installed, and falls back to an
empty string when it is not. `lspkind` is not in this configuration and not in
the lockfile, so the icon is already empty before it reaches the column list. If
I install `lspkind` later, this line is what will start mattering.

`formatting.format` then replaces the menu text. The default returns the item
untouched, which leaves the source's own description there. This one overwrites
it with a bracketed tag, `[LSP]`, `[Snip]`, `[Buf]`, `[Path]`, and the fallback
`'[' .. entry.source.name .. ']'` for anything not in the table.

The fifth tag is the interesting one, because the source it names is not
declared in this file. `vim-dadbod-completion` is registered per buffer in
`lua/plugins/vim-dadbod.lua`, which opens a `cmp.setup.buffer` override on the
`sql`, `mysql`, `plsql`, and `graphql` filetypes and lists that source first. So
the label table carries an entry for a source that only exists in SQL buffers,
and it is reachable rather than dead. I confirmed it by opening a `sql` buffer
and checking that the global `format` function is still the one in force. Two
files cooperating on one label is a coupling, and it is the sort of thing that
is invisible until someone removes the dadbod tag and wonders why SQL
completions go unlabeled.

That override has a cost worth stating. It replaces the source list wholesale
rather than extending it, because the merge that produces a buffer's
configuration takes the buffer's list over the global one rather than combining
them. The `buffer` entry it passes has no `option` block, so the
five-thousand-line guard does not apply in a SQL buffer. The guard lived on the
entry this file declares and the override declares its own. The `mapping` table
is not affected, and neither is `formatting`, because only the keys a buffer
declares get replaced; I checked that the SQL buffer still resolves all twelve
mappings and this file's `format`. `cmp.config.window.bordered()` is worth
understanding the same way. It merges over the defaults rather than replacing
them, so `winblend`, `max_width`, and `max_height` survive. What actually
changes is `winhighlight`, which stops pointing at the `Pmenu` groups and points
at `Normal`, `FloatBorder`, and `Visual` instead, plus a `zindex` of 1001. That
`zindex` only bites on the documentation window, which falls back to 50 when
nothing sets it; the completion window already resolved to 1001 inside
`custom_entries_view`, so `bordered()` restates a number that was already there.
The border style itself is not nvim-cmp's: `bordered()` copies whatever
`vim.o.winborder` holds, on 0.11 and up, and `lua/config/options.lua` set that
to `rounded` on line eighteen, which `init.lua` requires on line eight, before
this file loads. I have not measured whether the source swap matters for a query
file.

## What I Actually Get

Open a Lua file inside the environment repository and lua_ls attaches, rooted
where the previous post says it roots. Completion items arrive from the
`nvim_lsp` source and are labeled `[LSP]`, which is the same server those six
capability refinements are there to make possible. Type a snippet trigger and
LuaSnip's own files offer `[Snip]` entries, which `<Tab>` expands and then steps
through. `<C-b>` and `<C-f>` scroll the documentation window the same source
fills, when it is open.

Open a file over five thousand lines and the buffer source contributes nothing.
Everything else behaves identically, which is the point of making the cutoff a
return value rather than a condition around the whole source list.

Open a `.sql` buffer and a fifth source appears that no other filetype sees, and
the large-buffer guard stops applying.

## Conclusion

Eighty-two lines, and the reason they do not match the shape of the twenty-two
files beside them is that this one is not a table. It replaces a snippet engine,
it wires two behaviors onto one key, and it decides what a fifth source is
called in a menu that a different file also writes to.

The cost is that the conventions in the series have stopped applying. `core.lsp`
is a module with a `setup()` because nothing in it has to make a decision at
require time. This file is a sequence of side effects, which is why it reads top
to bottom, and why the one thing it borrows across a file boundary is a
`require` rather than an exported table. Those are not failures of the
convention. They are what the convention looks like at the point where the work
stops being configuration.

## Related Posts

- [How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/)
- [How I Configure Lua Language Server with Mason in Neovim](/posts/neovim/how-i-configure-lua-language-server-with-mason-in-neovim/)
- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)
- [How I Configure Formatting in Neovim](/posts/neovim/how-i-configure-formatting-in-neovim/)
- [How I Configure Linting in Neovim](/posts/neovim/how-i-configure-linting-in-neovim/)
- [How I Load Plugins with vim.pack in Neovim](/posts/neovim/how-i-load-plugins-with-vim-pack-in-neovim/)
- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

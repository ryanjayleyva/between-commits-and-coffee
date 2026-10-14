---
title: 'How I Configure Lua Language Server with Mason in Neovim'
description:
  'How I configure the Lua Language Server end to end in Neovim, from the Mason
  install on the PATH to the spec file Neovim evaluates, with the settings that
  make it useful on the config it serves.'
published: September 15, 2026
updated: September 28, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

lua_ls is the server that serves the configuration being written. Its root
resolves to the environment repository, and it reads my `lua/config` modules as
its own workspace. This post is one file end to end, `lsp/lua_ls.lua`, and the
few things it depends on.

The server lives in a directory I never `require`, `lsp/`, one file per server.
The other sixteen follow the same shape and stay in the repository at
https://codeberg.org/rjl/env under `shared/.config/nvim/lsp/`. The shared LSP
module this file borrows from is covered in
[How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/),
and the base this configuration sits on comes from an earlier post,
[How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/).

Same machine as the earlier post, macOS on Apple Silicon with a current stable
[Neovim](https://github.com/neovim/neovim) from Homebrew at version 0.12 as of
this writing, and `~/.config/nvim` is a Stow symlink into `~/env/shared`. The
config discovery used here, the `lsp/` directory and `vim.lsp.enable`, landed in
Neovim 0.11, so this post assumes at least that.

## TL;DR

Mason installs the
[`lua-language-server`](https://github.com/LuaLS/lua-language-server) binary, a
shim lands in `~/.local/share/nvim/mason/bin`, and Mason prepends that directory
to the PATH Neovim sees. Neovim reads `lsp/lua_ls.lua` off the runtimepath when
`vim.lsp.enable` runs, then merges it with a wildcard config when a client
starts. The spec picks a root from the nearest git boundary or a stylua dotfile,
turns its own formatter off, points the server at the runtimepath so `vim.*` and
the `nvim_*` API carry definitions, and loosens two of the strictest type
checks. Formatting on save comes from stylua through conform, not from the
server.

The only load-order rule is where `core.lsp` sits in `init.lua`. It runs after
the plugin requires, and `init.lua` says so in a comment. More on why below.

## The lua_ls Spec File

`lsp/lua_ls.lua` is the whole story for this server.

```lua
local lsp = require('core.lsp')

local root_markers = {
	'.git',
	'.stylua.toml',
}

local fallback_to_cwd = false

local M = {}

M.spec = {
	cmd = {
		'lua-language-server',
	},

	filetypes = { 'lua' },

	root_dir = lsp.make_root(root_markers, fallback_to_cwd),

	settings = {
		Lua = {
			telemetry = {
				enable = false,
			},

			format = {
				enable = false,
			},

			completion = {
				autoRequire = false,
				callSnippet = 'Replace',
				displayContext = 12,
			},

			diagnostics = {
				globals = { 'vim' },
			},

			hint = {
				arrayIndex = 'Enable',
				enable = true,
				setType = true,
			},

			runtime = {
				version = 'LuaJIT',
				path = {
					'lua/?.lua',
					'lua/?/init.lua',
					'?.lua',
					'?/init.lua',
				},
			},

			semantic = {
				keyword = true,
			},

			type = {
				castNumberToInteger = false,
				inferParamType = true,
				weakNilCheck = true,
				weakUnionCheck = true,
			},

			workspace = {
				checkThirdParty = false,
				library = vim.list_extend(vim.api.nvim_get_runtime_file('', true), {
					'${3rd}/luv/library',
					'${3rd}/busted/library',
				}),
			},
		},
	},
}

return M.spec
```

The file returns a table, `M.spec`. Four top-level keys are set. `cmd` is the
launch line, `filetypes` tells Neovim which buffer types attach, `root_dir`
comes from the shared resolver, and `settings` holds lua-language-server
specifics. The rest of this post walks each one and the reasoning behind it.

## How Neovim Finds It

The base modules under `lua/config/` are loaded by `require`. The server specs
live in a directory nothing ever requires, `lsp/`, sitting at the config root
next to `init.lua`. That difference is the point. Neovim reads `lsp/*.lua` from
the runtimepath by convention, one file per server, named after the string you
pass to `vim.lsp.enable`. The server called `lua_ls` has a file called
`lsp/lua_ls.lua` and nothing else maintains it.

Evaluation happens when `core.lsp.setup()` runs. `vim.lsp.enable` resolves each
name, and that resolution loads the matching file from the runtimepath. The
merge is separate and happens later, when a client starts, as a
`vim.tbl_deep_extend` with force semantics. The order is fixed, in increasing
priority: `vim.lsp.config['*']` is the base, `lsp/` overrides it, `after/lsp/`
overrides that, and an explicit `vim.lsp.config(name)` call wins over all of
them. Errors in a spec file surface at startup rather than on the first buffer,
because the file is read during that resolution and a throw propagates out of
`core.lsp.setup()`. That eager read is why `init.lua` puts `core.lsp` after the
plugin requires and why the comments there say so.

The only load-order rule comes from two dependencies. `core.lsp` asks for the
`cmp_nvim_lsp` module behind a `pcall`, so a failed require cannot break
startup, but the fallback is a real downgrade. Loaded after `core.lsp`, nvim-cmp
is not there yet and the server gets plain protocol capabilities instead of the
composed ones, so [nvim-cmp](https://github.com/hrsh7th/nvim-cmp) goes first and
the fallback never fires. Mason has to be set up before the first client starts,
for the reason the next section gives.

## Why Mason Owns the Binaries

[Mason](https://github.com/mason-org/mason.nvim) owns the editor tooling on this
machine, and that separation is why `lsp/lua_ls.lua` says
`cmd = { 'lua-language-server' }` and no path anywhere. The lists below are
trimmed to lua_ls and stylua, the two tools this post is about.

```lua
--[=[
Manage LSP binaries with mason-lspconfig, external tooling with mason-tool-installer.
mason-lspconfig - LSP server binaries (linked to Neovim's LSP client)
mason-tool-installer - Non-LSP CLI tools (formatters, linters, debug adapters)
Auto-detect LSP servers via `vim.lsp.enable()` with `lsp/*.lua` configs.
Consume non-LSP tools through conform.nvim, nvim-lint, nvim-dap, etc.
]=]

vim.pack.add({
	{ src = 'https://github.com/mason-org/mason.nvim' },
	{ src = 'https://github.com/mason-org/mason-lspconfig.nvim' },
	{ src = 'https://github.com/WhoIsSethDaniel/mason-tool-installer.nvim' },
})

require('mason').setup()

require('mason-lspconfig').setup({
	ensure_installed = {
		'lua_ls',
	},
	automatic_enable = false,
})

require('mason-tool-installer').setup({
	ensure_installed = {
		'stylua',
	},
	run_on_start = true,
})
```

[mason-lspconfig](https://github.com/mason-org/mason-lspconfig.nvim) asks for
the binary and Mason's registry installs it. The config pins the server in an
`ensure_installed` list, the registry fetches the release tarball for this
platform, and a shim lands in `~/.local/share/nvim/mason/bin`. The PATH
modification is worth being precise about, because it does not wait for a
download. `mason.setup()` calls its install location's `set_env`, which writes
the bin directory to the front of the session PATH, and that happens during the
require in `init.lua`. The directory is on PATH whether or not anything is
installed yet. When Neovim decides to attach, it validates the launch line
first, and the check is `vim.fn.executable()` on the first element of `cmd`, run
per buffer as the attach is attempted. That is why the spec file never says
where the binary lives, which is the point.

Those two plugins divide by tool kind. mason-lspconfig fetches language servers,
and stylua arrives through
[mason-tool-installer](https://github.com/WhoIsSethDaniel/mason-tool-installer.nvim)
because a formatter is not a language server. The split also separates
installing from activating. mason-lspconfig runs with
`automatic_enable = false`, so it only fetches binaries, and activation is
`vim.lsp.enable`, which this config keeps in one list. The installer never turns
a server on and the enable list never installs anything. The two concerns cross
only at the bare command name, which is what keeps the specs portable.

## Choosing the Project Root

A spec that does not constrain its workspace can allow the server to start for
Lua buffers outside an actual project root. `root_dir` is where the config
refuses that. The shared resolver, `M.make_root` in `lua/core/lsp.lua`, is short
and is the only piece of `core.lsp` this file needs to read.

```lua
function M.make_root(root_markers, fallback_to_cwd)
	return function(bufnr, set_root)
		local buf_path = vim.api.nvim_buf_get_name(bufnr)
		if buf_path == '' then
			return
		end

		local root = vim.fs.root(buf_path, root_markers)

		if not root and fallback_to_cwd then
			root = vim.uv.cwd()
		end

		if root then
			set_root(root)
		end
	end
end
```

It returns a function with the shape Neovim asks of a `root_dir`, which the 0.12
docs type as `fun(bufnr: integer, on_dir: fun(root_dir?: string))`. The
resolver's `set_root` is that `on_dir` under a clearer name, and the contract is
strict in a way that matters. The docs are explicit that the function form must
call the callback or the server is not activated for that buffer, which is how a
`root_dir` function doubles as a per-buffer on switch. `vim.fs.root` climbs from
the buffer's path toward a directory holding one of the markers, and `set_root`
is called if one turns up. If none does and the server allows a cwd fallback,
the current working directory steps in. Otherwise nothing fires and no client
starts.

There is a real seam in the markers for this server. The config identifies a
project by a `.git` directory or a `.stylua.toml` dotfile. On this machine a
config buffer resolves through the symlink to its real path inside the
environment repository, which is what puts the git boundary in reach at all.
`vim.fs.root` does not walk symlinks, so handed the literal
`~/.config/nvim/lsp/lua_ls.lua` path it climbs to `/Users/rjleyva` and finds
nothing. The buffer name is already resolved, and from there the climb finds
`~/env/.git` and sets the root to `~/env`, so the server treats the whole
environment as its workspace. The stylua marker waits for projects outside git
that version their formatting config as a dotfile. My own stylua file is
`stylua.toml` without a leading dot, so it never picks this directory up. I keep
both because dropping one would not change behavior here but would change it on
the next machine.

`fallback_to_cwd` is false, the deliberate choice for this server. A thrown
together Lua script with no project behind it should not attach a client pointed
at whatever directory happened to host it. No root, no server, and the buffer is
left to Neovim core.

## Making lua_ls Understand Neovim

The settings table is where lua_ls stops being a file and starts being
conversant with this config. The two settings that matter most sit in the
runtime and workspace blocks.

`runtime.version` is `LuaJIT`, the runtime Neovim embeds, so lua_ls diagnoses
against the interpreter that will actually run the code. The default is Lua 5.4
and the mismatch would show up as suggestions about a runtime this machine never
uses. The two mechanisms that make the editor namespace known are separate and
worth keeping separate. `runtime.path` is the list of require patterns, and
adding `lua/?.lua` and `lua/?/init.lua` to the default `?.lua` and `?/init.lua`
is what lets `require('config.options')` resolve to `lua/config/options.lua`,
the same file Neovim loads. `workspace.library` is a list of roots, and it is a
different job.

`vim.api.nvim_get_runtime_file('', true)` returns the root path of every
directory on the runtimepath, and on this machine that is 53 entries, most of
them installed plugins. Feeding the list to lua_ls as `workspace.library` does
not copy files, it points the server at the places those files live, which is
what the setting wants. Two of those roots matter. The Neovim runtime supplies
the `vim.*` modules and the generated `lua/vim/_meta/api.gen.lua` that declares
the `nvim_*` API as annotated stubs, which is how those strings become
definitions. The config directory supplies the `lua/` tree the require patterns
walk. `checkThirdParty` is false, which stops the server from sniffing the
workspace for libraries it recognizes and prompting to enable their addons,
where the default is to ask.

The `${3rd}` entries are the documented way to reach the server's own bundled
addons, and `${3rd}` resolves to the `meta/3rd` directory inside the installed
lua-language-server. Both paths exist. Worth being honest about what they do for
this config. The luv annotations describe the C binding's types, which is the
right reference for the `vim.uv` calls in the other server specs, since `vim.uv`
is that same library exposed by Neovim. The busted annotations are for a test
framework this config does not use, the adapters here are vitest and jest, and
the entry is harmless rather than load-bearing. I keep both because the pair
costs nothing, though a real adoption would also need `${3rd}/luassert/library`,
which is what busted's own annotations require and the server does not add on
its own.

`diagnostics.globals = { 'vim' }` is the partner to that library. Every line of
this config references `vim`, and without the declaration lua_ls flags it as an
undefined global. The library answers that with types.

## Completion, Diagnostics, Hints, and Types

The rest of the settings table is a set of small corrections toward how this
config is written.

`completion.autoRequire` is false, and the default is true. lua_ls by default
turns a typed module name into a `require`, and I do not want that. Requires
here are written by hand, and an automatic around them guesses wrong often
enough to be noise. `callSnippet` set to `Replace` shows only the call snippet,
dropping the bare function name the `Disable` default would leave you with, and
`displayContext` at 12 previews lines around the definition, where the default
is 0 and off.

The hint block enables inlay hints, which is a separate `hint.enable` and is
false by default, pushes array indices with `arrayIndex = 'Enable'` where the
`Auto` default would only hint on tables longer than three items, and adds a
hint for the type at an assignment with `setType`. `semantic.keyword` adds
semantic highlighting for keywords, literals, and operators, which the editor
already colors, so this entry is the closest thing to redundant in the file.
Neither block is on by default, and both render as annotations in the buffer
rather than diagnostics.

The type block is the deliberate lenience. `weakNilCheck` and `weakUnionCheck`
are on, which relaxes the strictest checks. With them, a `number|nil` value can
be used where `number` is expected and a union that partially matches assigns
cleanly. That is weaker than the default, not stricter, and it matches how this
config is written, where a checked field can stay nil in places the checker
cannot prove safe. `inferParamType` infers parameter types from call sites
instead of leaving them `any`, and `castNumberToInteger` is false, which is the
default and keeps integer and number from being conflated. These are character
decisions on a checker, and each one is a small admission about how the config
is really written.

## Formatting and Telemetry

`format.enable` is false because
[conform.nvim](https://github.com/stevearc/conform.nvim) owns formatting in this
setup, with stylua for Lua installed by mason-tool-installer. Two formatters for
one language means two opinions about the same file.
[stylua](https://github.com/JohnnyMorganz/StyLua) already matches the machine,
since the config itself is formatted with it. One owner, no contest.

The telemetry entry is the most honest line in the file, and also the most
outdated. The upstream docs are blunt about it. The `telemetry` group is marked
deprecated, the note reads that telemetry has been removed since v3.6.5, and
`telemetry.enable` is typed `boolean | null` with a default of `null` rather
than `false`. So this line is not disabling anything. It is a key that no longer
has a reader, set to the value it would have had. I keep it anyway. The file
should say no before some future build decides to ask.

## What I Actually Get

The observable behavior is worth stating plainly. Open a Lua file inside the
environment repository and lua_ls attaches, rooted at `~/env`, with the whole
runtimepath as library. `vim` and the `nvim_*` API autocomplete with real
definitions. `require('config.options')` resolves and is type-checked like
project code. Inlay hints annotate array indices and assignment types,
diagnostics report against LuaJIT with `vim` never flagged undefined, and
formatting comes from stylua rather than the server.

Open a Lua script in a directory with no git boundary and no stylua dotfile, and
none of that happens. No root, no client, no diagnostics. The buffer is plain
Lua through Neovim core, which is what the config asked for.

There is one honest edge case, and it is a startup race rather than a config
choice. Neovim validates the launch command with `vim.fn.executable()` at attach
time, so on a machine where Mason has not fetched the binary yet the first
attach attempt finds nothing and returns without starting a client. The install
is not synchronous with setup. mason-lspconfig defers its `ensure_installed`
work into a `vim.schedule_wrap` callback that fires after `registry.refresh`
completes, so the fetch can be in flight while the first Lua buffer already asks
to attach. A later buffer retries, since the attach runs from a `FileType`
autocmd rather than once at startup, so the likely recovery is opening another
file. How long the fetch actually takes I have not measured, so treat a restart
as the guaranteed fix. Headless runs are separate, since mason-lspconfig skips
`ensure_installed` entirely when it detects a headless session.

## Where the Shared Module Lives

This post is one tenant. `lua/core/lsp.lua` owns the shared policy, the wildcard
capabilities, the root resolver, and the single enable list, and
[How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/)
covers that system in detail. What this file holds is what is specific to
lua_ls, which is why it reads as a data file rather than plumbing.

## Conclusion

lua_ls is one small file, and that is the argument for this whole approach. The
shared decisions live in `core.lsp`, the per-server decisions live in the spec,
and every server uses the same bones, so a new language is a new data file
rather than a new pile of plumbing. Formats come from conform, completion comes
from nvim-cmp, and the server only decides how it attaches and what it reports.

## Related Posts

- [How I Wire Completion with nvim-cmp in Neovim](/posts/neovim/how-i-wire-completion-with-nvim-cmp-in-neovim/)
- [How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/)
- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)
- [How I Configure Formatting in Neovim](/posts/neovim/how-i-configure-formatting-in-neovim/)
- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

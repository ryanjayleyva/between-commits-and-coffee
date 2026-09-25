---
title: 'How I Configure Lua Language Server with Mason in Neovim'
description:
  'How I configure the Lua Language Server end to end in Neovim, from the Mason
  install on the PATH to the spec file Neovim evaluates, with the settings that
  make it useful on the config it serves.'
published: September 15, 2026
updated: September 25, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

`lua_ls` is the server that serves the configuration being written. Its root
resolves to the environment repository, it reads my `lua/config` modules as its
own workspace, and it is the file I edit most often or least, depending on how
bored I get. This post is one file end to end, `lsp/lua_ls.lua`, and the few
things it depends on.

The server lives in a directory I never `require`, `lsp/`, one file per server.
The other sixteen follow the same shape and stay in the repository at
https://codeberg.org/rjl/env under `shared/.config/nvim/lsp/`. The general
machinery this file borrows from is the shared LSP architecture this post
explains, and the base this configuration sits on comes from an earlier post,
[How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/).

This is the same machine from the earlier post, macOS on Apple Silicon with a
current stable [Neovim](https://github.com/neovim/neovim) from Homebrew at
version 0.12 as of this writing, and `~/.config/nvim` is a Stow symlink into
`~/env/shared`. The config discovery used here, the `lsp/` directory and
`vim.lsp.enable`, landed in Neovim 0.11, so this post assumes at least that.

## TL;DR

Mason installs the
[`lua-language-server`](https://github.com/LuaLS/lua-language-server) binary, a
shim lands in `~/.local/share/nvim/mason/bin`, and Mason prepends that directory
to the PATH Neovim sees. Neovim evaluates `lsp/lua_ls.lua` from the runtimepath
at enable time and merges it with a wildcard config. The spec picks a root from
the nearest git boundary or a stylua dotfile, turns its own formatter off,
declares the runtimepath as workspace library so `vim.*` and the `nvim_*` API
carry definitions, and loosens two of the strictest type checks. Formatting on
save comes from stylua through conform, not from the server.

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
name it is given, and that lookup loads the matching file from the runtimepath
and merges it with the wildcard config via a deep extend. The merge order is
fixed. `vim.lsp.config['*']` is the base, the file from `lsp/` overrides it, and
an explicit `vim.lsp.config(name)` call overrides the file. Errors in a spec
file surface at startup, not on the first buffer a server would attach to. That
eager lookup is why `init.lua` puts `core.lsp` after the plugin requires and why
the comments there say so.

The only load-order rule comes from two dependencies. `core.lsp` asks for the
`cmp_nvim_lsp` module behind a `pcall` and falls back to plain capabilities if
the require fails, so [nvim-cmp](https://github.com/hrsh7th/nvim-cmp) has to be
loaded before it. Mason has to be loaded before the first client starts, for the
reason the next section gives. `core.lsp` runs after the plugin requires and
both orders hold.

## Why Mason Owns the Binaries

On this machine, package ownership is split by domain. Homebrew owns the
system-level packages, npm owns the global Node CLIs, and
[Mason](https://github.com/mason-org/mason.nvim) owns the tooling around Neovim,
JavaScript and TypeScript included. Most language servers are installed by Mason
too. That separation is why `lsp/lua_ls.lua` says
`cmd = { 'lua-language-server' }` and no path anywhere. The lists below are
trimmed to lua_ls and stylua, the two tools this post is about. The full lists
live in the repository.

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
platform, and a shim lands in `~/.local/share/nvim/mason/bin`. Mason's setup
then prepends that `bin` directory to the PATH Neovim sees. When Neovim decides
to attach a client, it validates the launch line by asking if the command is
executable, and that check passes because the shim is on that path. The spec
file does not need to say where the binary lives, which is the point. This
config activates a server without knowing where its binary was installed, as
long as the spec names a bare command.

The gain is consistency, not magic. Every language server here is installed the
same way, through the same registry. The non-LSP tools are not that tidy. stylua
comes through
[mason-tool-installer](https://github.com/WhoIsSethDaniel/mason-tool-installer.nvim),
and so do prettier, shellcheck, black, and nine more editor tools, but gofmt,
rustfmt, and clippy stay with the Go and Rust toolchains that ship them, and
node is a Homebrew formula. That is not a broken rule. A tool a toolchain ships
stays there, and anything that is pure editor tooling gets a home in Mason,
stylua among them.

That framing also separates installing from activating. mason-lspconfig runs
with `automatic_enable = false`, so it only fetches binaries. Activation is
`vim.lsp.enable`, and this config keeps every enabled server in one list. The
installer never turns a server on and the enable list never installs anything.
The two concerns cross only at the bare command name.

Mason is also an honest tradeoff. It is another package-management layer on top
of the system one. A Homebrew-installed language server would work perfectly
well, and this configuration could use one by writing its path into the spec.
Only rust_analyzer does that, with a path derived from Neovim's data directory,
and svelte prefers a project-local server when one exists, falling back to the
`$PATH` shim everyone else uses. Both stay portable. The reason I do not is
ownership. Editor tooling gets one mechanism, the language server ecosystem is
consistent across every language here, and the specs stay portable because they
name commands from the `$PATH` Mason fills, not machine-specific locations. I do
not claim Mason is more portable or safer or faster than its alternatives. It is
just the layer that keeps the answer to "where is my editor tooling" in one
place.

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

It returns a function with the shape Neovim asks of a `root_dir`. Neovim calls
it with the buffer number and a `set_root` callback. The function asks
`vim.fs.root` to climb from the buffer toward a directory that holds one of the
markers. If a root is found, `set_root` is called with it. If not, and the
server allows a cwd fallback, the current working directory steps in. Otherwise
nothing fires and no client starts.

There is a real seam in the markers for this server. The config identifies a
project by a `.git` directory or a `.stylua.toml` dotfile. On this machine a
config buffer resolves through the symlink to its real path inside the
environment repository, so the git boundary sets the root to `~/env` and the
server treats the whole environment as its workspace. The stylua marker waits
for projects outside git that version their formatting config as a dotfile. My
own stylua file is `stylua.toml` without a leading dot, so it is never the
marker that picks this directory up. I keep both because dropping one would not
change behavior here but would change it on the next machine.

`fallback_to_cwd` is false, the deliberate choice for this server. A
thrown-together Lua script with no project behind it should not attach a client
pointed at whatever directory happened to host it. No root, no server, and the
buffer is left to Neovim core. Standalone files get servers that ask for the cwd
fallback, and the rest do not.

## Making lua_ls Understand Neovim

The settings table is where lua_ls stops being a file and starts being
conversant with this config. The two settings that matter most sit in the
runtime and workspace blocks.

`runtime.version` is `LuaJIT`, the runtime Neovim embeds, so lua_ls diagnoses
against the interpreter that will actually run the code. The default is Lua 5.4
and the mismatch would show up as suggestions about a runtime this machine never
uses. `runtime.path` uses the `lua/?.lua` convention the base relies on, and the
library below grants the config's `lua/` directory as a search root, so
`require('config.options')` resolves to `lua/config/options.lua`, the same file
Neovim loads.

The workspace library line is the other half of making the editor namespace
known. `vim.api.nvim_get_runtime_file('', true)` returns the root path of each
directory on the runtimepath. Feeding that list to lua_ls as `workspace.library`
does not copy files, it points the server at the places those files live, which
is exactly the input the setting wants. The Neovim runtime and the config
directory are among the returned roots, so `vim.*` and the `nvim_*` API strings
turn into definitions and the config's own modules resolve under `lua/` the way
Neovim loads them. `checkThirdParty` is false, which stops the server from
sniffing the workspace for libraries it recognizes and guessing at their addons.
The `${3rd}` entries point inside the lua-language-server installation itself,
where it ships annotations for the libraries it knows. The luv event loop and
the busted test framework are the two this config touches, so code that reaches
either has callbacks worth reading.

`diagnostics.globals = { 'vim' }` is the partner to that library. Every line of
this config references `vim`, and without the declaration lua_ls flags it as an
undefined global. One line silences the complaint. The library answers it with
types.

## Completion, Diagnostics, Hints, and Types

The rest of the settings table is a set of small corrections toward how this
config is written.

`completion.autoRequire` is false. lua_ls by default turns a typed module name
into a `require`, and I do not want that. Requires here are written by hand, and
an automatic around them guesses wrong just often enough to be noise.
`callSnippet` set to `Replace` shows the full call form instead of the bare
function name, and `displayContext` at 12 previews the surrounding code snippet,
enough lines to see what a suggestion is used for.

The hint block enables inlay hints, pushes array indices to show in every table,
and adds a hint for the type at an assignment. `semantic.keyword` adds semantic
highlighting for keywords, which the editor already colors, so this entry is the
closest thing to redundant in the file. Neither pair is on by default, and both
render as annotations in the buffer rather than diagnostics.

The type block is the deliberate lenience. `weakNilCheck` and `weakUnionCheck`
are on, which relaxes the strictest checks. With them, a `number|nil` value can
be used where `number` is expected and a union that partially matches assigns
cleanly. That is weaker than the default, not stricter, and it matches how this
config is written, where a checked field can stay nil in places the checker
cannot prove safe. `inferParamType` infers parameter types from call sites
instead of leaving them `any`. `castNumberToInteger` is false, so integer and
number are not conflated for this codebase. These are character decisions on a
checker, and each one is a small admission about how the config is really
written.

## Formatting and Telemetry

`format.enable` is false because
[conform.nvim](https://github.com/stevearc/conform.nvim) owns formatting in this
setup, with stylua for Lua installed by mason-tool-installer. Two formatters for
one language means two opinions about the same file.
[stylua](https://github.com/JohnnyMorganz/StyLua) already matches the machine,
since the config itself is formatted with it. One owner, no contest.

The telemetry entry is the most honest line in the file. Newer LuaLS releases
dropped the telemetry code and the config schema no longer defines the option,
so on the version Mason installs here the setting is inert, read by nothing. I
keep it anyway. The file should say no before some future build decides to ask.

## What I Actually Get

The observable behavior is worth stating plainly. Open a Lua file inside the
environment repository and lua_ls attaches, rooted at `~/env`, with the whole
runtimepath as library. `vim` and the `nvim_*` API autocomplete with real
definitions. `require('config.options')` resolves and is type-checked like
project code. Inlay hints annotate array indices and assignment types, keywords
get semantic coloring, and diagnostics report against LuaJIT with `vim` never
flagged undefined. Completion comes from nvim-cmp with call snippets and code
context previews. Formatting on save comes from stylua, not the server.

Open a Lua script in a directory with no git boundary and no stylua dotfile, and
none of that happens. No root, no client, no diagnostics. The buffer is plain
Lua through Neovim core, which is what the config asked for.

There is one honest edge case. For this spec, Neovim only attaches when the bare
launch command is executable, so on a machine where Mason has not fetched the
binary yet the first startup sees nothing. The fetch is not synchronous with
setup. mason-lspconfig schedules the `ensure_installed` check, the list is read
after a registry update completes, and headless runs install nothing. Each new
Lua buffer tries the attach again afterward, so the usual recovery is the next
buffer. That is the mechanism, not a guarantee, and a restart after the install
always works.

## Where the Shared LSP Architecture Lives

This post is one tenant. The building it sits in, `lua/core/lsp.lua`, owns the
shared machinery, the wildcard capabilities, the root resolver, the diagnostics
presentation, and the single enable list. The other sixteen servers in that list
all inherit the same capabilities, most borrow the same resolver, and each adds
its own per-server config. emmet deliberately attaches on filetype alone, and
svelte picks its server from the project when it can. pyright pushes strict type
checking, rust-analyzer runs clippy as its check command, and gopls enables
staticcheck, while this configuration leaves formatting to conform.

The architecture behind those decisions is a separate post, the one I said the
general machinery belongs to. lsp/lua_ls.lua is readable as a data file today.
The rest of the directory lives in the repository at
https://codeberg.org/rjl/env under `shared/.config/nvim/lsp/`, and each file
there reads the same way once this one is understood.

## Conclusion

lua_ls is one small file, and that is the argument for this whole approach. The
shared decisions live in `core.lsp`, the per-server decisions live in the spec,
and every server uses the same bones. A new language is a new data file, not a
new pile of plumbing.

Formats come from conform, completion comes from nvim-cmp, and the servers only
decide how they attach and what they report. That division is what makes the
setup easy to add to and hard to argue with. The next server gets the same
treatment when there is something worth saying about it.

## Related Posts

- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)
- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

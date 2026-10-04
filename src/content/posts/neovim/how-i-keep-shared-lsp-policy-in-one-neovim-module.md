---
title: 'How I Keep Shared LSP Policy in One Neovim Module'
description:
  'How I keep shared LSP policy in one Neovim module while leaving per-server
  decisions in their specs, from capabilities and diagnostics to root
  resolution.'
published: September 26, 2026
updated: September 28, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

`lua/core/lsp.lua` holds four concerns in eighty-six lines. Sixteen servers take
their capabilities and their activation from here, and fifteen of those specs
call its root resolver.

The file is the policy boundary. Mechanisms are shared across servers, so they
live here. The decisions inside them mostly are not shared, so they live in the
spec files and the shared layer takes them as arguments. `fallback_to_cwd` is
the clearest case, since the resolver is one function written once and whether a
server falls back to the current directory is a decision that function makes per
server. Formatting goes the other way and is absent from this file entirely,
which I read as the same principle applied from the other side.

The previous post treated this file as a dependency to read past on the way to
`lsp/lua_ls.lua`. This post is the file itself.

The base is
[How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/),
and the first tenant is
[How I Configure Lua Language Server with Mason in Neovim](/posts/neovim/how-i-configure-lua-language-server-with-mason-in-neovim/).
Same machine as both, macOS on Apple Silicon with a current stable
[Neovim](https://github.com/neovim/neovim) from Homebrew at 0.12 as of this
writing, and `~/.config/nvim` a Stow symlink into `~/env/shared`. The
runtimepath config discovery this file depends on landed in 0.11, so this post
assumes at least that. The repository is at https://codeberg.org/rjl/env under
`shared/.config/nvim/`.

## TL;DR

The file does four things. It sets the capabilities Neovim advertises to every
server, once, through a wildcard config. It provides a root resolver that
fifteen of sixteen specs borrow, with one switch that decides whether a file
without a project still gets a server. It holds the single list of enabled
servers. It sets how diagnostics are presented. Three of those shape what
servers do and one shapes what I see.

The file also runs at two different times. The wildcard config is assigned while
the module is being required, and the other three concerns run when `setup()` is
called. That split is why the position of `core.lsp` in `init.lua` is a rule
rather than a preference.

## What the Module Owns

```lua
--[=[
LSP conventions:
Use make_root() for root resolution
Omit single_file_support from per-server configs
Configure fallback_to_cwd per server (true for standalone files, false otherwise)
Configure default LSP capabilities and diagnostics UI globally here
]=]

local M = {}

local default_capabilities = vim.lsp.protocol.make_client_capabilities()
if pcall(require, 'cmp_nvim_lsp') then
	default_capabilities = require('cmp_nvim_lsp').default_capabilities()
end

vim.lsp.config['*'] = {
	capabilities = default_capabilities,
}

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

function M.setup()
	vim.lsp.enable({
		'astro',
		'cssls',
		'emmet-language-server',
		'eslint',
		'gopls',
		'graphql',
		'html',
		'jsonls',
		'lua_ls',
		'marksman',
		'postgres_lsp',
		'pyright',
		'rust_analyzer',
		'templ',
		'vtsls',
		'yamlls',
	})

	vim.diagnostic.config({
		virtual_lines = false,
		virtual_text = true,
		underline = true,
		update_in_insert = false,
		severity_sort = true,
		float = {
			border = 'rounded',
			source = true,
		},
		signs = {
			text = {
				-- [vim.diagnostic.severity.ERROR] = '󰅚 ',
				-- [vim.diagnostic.severity.WARN] = '󰀪 ',
				-- [vim.diagnostic.severity.INFO] = '󰋽 ',
				-- [vim.diagnostic.severity.HINT] = '󰌶 ',
			},
			numhl = {
				[vim.diagnostic.severity.ERROR] = 'ErrorMsg',
				[vim.diagnostic.severity.WARN] = 'WarningMsg',
				[vim.diagnostic.severity.INFO] = 'InfoMsg',
				[vim.diagnostic.severity.HINT] = 'HintMsg',
			},
		},
	})
end

return M
```

Read the shape before the details. Four concerns, and only one of them is a
function the specs call. The capabilities are a module-level assignment. The
resolver is a factory that returns a function. The enable list and the
diagnostic presentation are two statements in the same `setup()` body, and
neither calls anything this file exports.

Those are two different moments. Lines eleven through eighteen execute the
moment something requires this module, before any call to `setup()`. The
wildcard config is a side effect of the `require`, not an output of it.
Everything from line thirty-nine onward waits for `init.lua` to call `setup()`
explicitly.

## Why Load Order Is Part of the Architecture

The header of `init.lua` states the rule this file creates.

```lua
--[=[
Preserve the load order.
Evaluate LSP configs eagerly with `core.lsp`.
Load plugin modules with `vim.pack` first.
Do not move `core.lsp` above plugin requires.
]=]
```

`vim.lsp.config['*']` is assigned at require time, and the `pcall` on
`cmp_nvim_lsp` reads the runtimepath at that moment. If nvim-cmp has not been
loaded yet, the `require` fails, the base capabilities stand, and the overlay
from the next section never arrives. The assignment is not retried, because
nothing triggers it later.

Move `core.lsp` above the plugin requires and there is no error, no warning, and
no log line. The file loads, every server starts, and every capability the base
provides still arrives, because the base is what Neovim merges underneath
whatever this file assigns. The only difference is that the client advertises
the base instead of the base plus cmp's completion refinements, and nothing in
the editor reports it.

That is what makes the ordering rule worth writing down. Silent degradation is
harder to trace back than a startup error, and the base post has the other
ordering rule, the leader key before the keymaps.

## Why Capabilities Are Global

Every server in this configuration starts with the same advertised capabilities.
`vim.lsp.config['*']` is a wildcard, the way a filename glob is a wildcard, and
any server without a more specific config inherits it. No spec overrides the
client side. One spec does reach into capabilities, but from the other direction
and in the formatting section at the end of this post.

The base is `vim.lsp.protocol.make_client_capabilities()`, which is Neovim's own
answer to what this build can do. The `pcall` on `cmp_nvim_lsp` decides between
two tables. If nvim-cmp is on the runtimepath, its table replaces the local
variable here. If it is not, the `require` fails quietly and the base stands
unmodified. Either way the file works, which is the point of the `pcall` rather
than a plain `require`.

`cmp_nvim_lsp.default_capabilities()` is not a larger version of that base. It
is a small hand-written table, twenty-two leaf keys against the base's two
hundred and forty-two, and it only talks about completion. Read the two raw
tables side by side and the cmp path looks like it throws away everything
`textDocument` has to say about definitions, renames, semantic tokens, and
formatting.

That reading is wrong, and the reason is one line in Neovim itself. When a
client initializes, `vim.lsp.client` does not send the config's `capabilities`
verbatim. It deep-extends them onto a fresh call to
`make_client_capabilities()`, so whatever this file assigns is an **overlay** on
the base rather than a replacement for it. Applying that merge and diffing the
results, the two effective tables differ in six places across seven individual
changes, and no capability is true in the base and false in the merged one.

```
commitCharactersSupport     false -> true
preselectSupport            false -> true
resolveSupport.properties   gains insertTextFormat, insertTextMode
insertTextModeSupport       added, { 1, 2 }
completion.insertTextMode   added
completionList.itemDefaults gains commitCharacters
```

All six are completion refinements. Commit characters let a suggestion be
accepted by typing a delimiter rather than a keypress. The `insertTextFormat`
entries tell the client that a resolved completion is a snippet whose
placeholders should be expanded.

Nothing in the base is given up, which is the part I had backwards the first
time I measured this. `documentationFormat` is present in the base and absent
from cmp's table, so in the raw tables it looks like losing Markdown hover
documentation. It is handled by plain `make_client_capabilities()`, so a client
on the fallback still gets it, along with `additionalTextEdits` for
import-on-completion. What the fallback gives up is the six nodes above, which
mainly means no commit characters and no `insertTextMode`. That is a modest
degradation, and the `pcall` is insurance against it.

Everything here has been a **client** capability, a statement of what Neovim
tells servers it can accept. What a server offers in return is
`server_capabilities`, a different table on a different object, arrived at over
the wire after initialization. That second name appears as a literal key in one
spec, `lsp/vtsls.lua` under `on_attach`, set to `false` to take formatting away
from a client that offered it. `capabilities` is a key in this file and in no
spec.

## Why Root Resolution Is Shared but Configurable

`make_root` is a factory. It takes the arguments that vary per server and
returns the `root_dir` function Neovim expects, which is how fifteen specs share
eighteen lines instead of fifteen copies of them. The mechanics are covered in
the previous post, so this section is about the one argument that carries a
decision, `fallback_to_cwd`.

The switch only matters when root resolution fails. `vim.fs.root` climbs from
the buffer toward a directory holding one of the server's markers, and if that
succeeds the server starts scoped to the project. If it fails, the parameter
decides. Set it and the current working directory stands in, so the server
starts anyway against a directory that was never a project root. Leave it false
and nothing fires. No root, no client, and the buffer is plain text through
Neovim core.

The split is six true and nine false, and the convention is stated more plainly
in a commit message than in the header comment. `lua_ls` was originally `true`
and is now `false`, and the commit that changed it gives the standard: "Disable
the cwd fallback so a lone lua file outside a project root no longer hosts a
server, aligning with the convention that servers attach only where a real root
exists." A real root, as this configuration defines one, is a directory holding
one of the server's markers, and that is the standard the nine false values
meet. False is what a server gets unless someone opts in, so the six exceptions
are what the convention has to justify.

Five of them are formats where the markers are not needed for the file to be
valid. `cssls`, `html`, and `jsonls` look for `package.json` and `.git`,
`marksman` adds `.marksman.toml`, and `yamlls` adds `.yamllint` and a docker
compose file. A lone `.json` file is still valid JSON whether or not a
`package.json` exists above it, so handing it a fallback root costs little. The
graphql commit says the same thing from the other side, that it attaches where a
config exists or a git root, "without falling back to the current directory."

`templ` is the exception I cannot place. Its markers are `go.mod` and `.git`,
and they belong to Go rather than to templ, which is its own language with its
own server, launched as `templ lsp` and generating Go from `.templ` sources. A
templ component renders other components, so a `.templ` file is not complete the
way a lone `.yaml` file is, and the flag hands the server a root guaranteed not
to be a Go module since it only fires when no `go.mod` was found. Its own commit
gives the reason, that the fallback exists "so standalone templates still get a
running server." That is a reason about not leaving a buffer without a server
rather than about the file being complete. `go.mod` turns up in exactly two
specs, and it means opposite things in them: gopls's build file, so false, and
templ's ambient context, so true.

The history says why it is still like this. `templ` was configured on 2026-08-08
and never revisited. The convention was written two days later, in a pass that
moved `lua_ls` to match it and rewrote the header comment to say "true for
standalone files, false otherwise." `marksman` and `yamlls` were not revisited
either, and both still fit the standalone-file reading.

`emmet` is the one spec that never requires `core.lsp` and has no `root_dir` key
at all. That it is also the one server with no workspace to scope is an
inference rather than something I measured.

The header comment's third convention, omitting `single_file_support` from
per-server configs, describes an absence. The string does not appear in any spec
in the directory, and it is not a `vim.lsp.Config` field in 0.12 either, so
nothing reads it and the omission is currently inert. The convention is honored
by not writing anything, which is the kind easiest to get wrong on a new
machine.

## Why Activation Is Centralized

The enable list is sixteen strings, and the reason there is a list at all is the
convention the previous post describes. Neovim resolves each name against
`lsp/<name>.lua` on the runtimepath, so a server is enabled by being named and
configured by being written. The list is not where servers are configured, only
where they are turned on, and having it in one place is what lets a reader
answer what is actually running without reading sixteen spec files.

That separation is what makes the Mason arrangement work. mason-lspconfig runs
with `automatic_enable = false`, so it fetches binaries and never edits this
list. Installation happens in one place and activation in the other, and the two
cross at a bare command name and nowhere else. The names match on both ends
except for emmet, where the spec file is `emmet-language-server` and Mason's
list says `emmet_language_server`. Adding a language is one new spec file and
one line in this list, and a server cannot be half-enabled by accident, because
nothing else writes to either end.

## Why Diagnostics Presentation Lives Here

Twenty-five of the eighty-six lines, and structurally unlike everything above
it. This concern has no downstream consumers. It is read once, by the person
sitting in front of the editor, and it is the only part of this file whose
failure I would notice.

Each server brings its own opinion about how to render diagnostics, and
`vim.diagnostic.config` is where this configuration states one opinion for all
of them. Virtual text on, because a squiggle alone loses the message. Virtual
lines off, which refuses a popular look that costs a line of the buffer to every
warning. `severity_sort`, so the worst problem in a float is the first thing
read. `update_in_insert = false`, so diagnostics do not flicker while typing,
which is obvious in a screenshot and maddening in a day of actual use.

The sign column is the most deliberate omission in the file. Four nerd-font
glyphs sit commented out at lines seventy-one through seventy-four, and the
active configuration is four highlight groups, `ErrorMsg` through `HintMsg`.
That trades a shape readable without color for a color that is not.

## Where the Formatting Decision Lives

This file says nothing about formatting. Not one line in eighty-six mentions it,
which is deliberate, because the decision does not belong to the shared layer.
It belongs to the servers, and they do not make it the same way. Three specs
disable it through a server setting, `lua_ls`, `yamlls`, and `jsonls` with
`format.enable = false`, and `eslint` uses its own `format = false`. One reaches
into the attached client under `on_attach` and clears both
`server_capabilities.documentFormattingProvider` and
`documentRangeFormattingProvider`, which is `vtsls`.

One leaves a comment and nothing else, and the comment is not doing any work.
`gopls` has `-- Defer formatting to conform.lua` sitting at the top of its
settings with no key behind it, and a v0.23.0 server started on this machine
still answers `documentFormattingProvider: true` at initialize. So that comment
is aspirational. Nothing in the spec stops gopls from formatting, and the only
reason the buffer does not get mangled is that conform is configured with
`lsp_format = 'never'` and never asks it to.

The rest, ten specs including `astro` and `html`, say nothing at all. They are
not making a decision, they are inheriting whatever the server advertises. Ten
absences, and one Go buffer that would reformat itself the moment anything asked
it to.

## Conclusion

Eighty-six lines, and every other LSP file in this configuration is a tenant of
it. The arrangement is not hard to get wrong by accident. It is hard to change
without seeing what you are changing, because every decision has one home and
that home is the file the decision lives in.

The cost is that some failures stay quiet. Move `core.lsp` above the plugin
requires and nothing complains. The comment in `gopls` describes a behavior the
spec does not implement. Both are quiet because the alternative was a convention
with nothing enforcing it, and both are answerable because the decision and its
reasoning sit in the same file. Decisions that are visible rather than decisions
that are impossible to get wrong is the trade I wanted.

## Related Posts

- [How I Wire Completion with nvim-cmp in Neovim](/posts/neovim/how-i-wire-completion-with-nvim-cmp-in-neovim/)
- [How I Configure Lua Language Server with Mason in Neovim](/posts/neovim/how-i-configure-lua-language-server-with-mason-in-neovim/)
- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)
- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

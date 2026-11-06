---
title: 'How I Configure Linting in Neovim'
description:
  'How I wire linting with nvim-lint in Neovim, mapping shell and prose
  filetypes to ShellCheck and codespell on write, and why ESLint stays on the
  language server instead.'
published: October 16, 2026
updated: October 20, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

The formatting post in this series covered the write path that carries a
formatter. Linting sits on the same write, and in this configuration it runs
through one file, `lua/plugins/nvim-lint.lua`, while ESLint stays on the
language server.

## TL;DR

Linting runs through `nvim-lint`. The file maps `sh` to `shellcheck`, `text`
and `markdown` to `codespell`, then a `BufWritePost` autocommand calls
`lint.try_lint()` after every write. `mason-tool-installer` supplies both
linters, and Mason prepends its bin directory to Neovim's `PATH`. ESLint is not
on this path. Its diagnostics come from the language server configured in
`lsp/eslint.lua`, which publishes them as the buffer changes.

## The File

`lua/plugins/nvim-lint.lua` is twenty-five lines.

```lua
--[=[
Keep linting scoped, minimal, and explicit.

- Lint shell scripts (`.sh`, `.zsh`) with ShellCheck via nvim-lint
- Install ShellCheck through Mason (see mason-tool-installer)
- Handle ESLint diagnostics through LSP (`lsp/eslint.lua`)
]=]

vim.pack.add({
	{ src = 'https://github.com/mfussenegger/nvim-lint' },
})

local lint = require('lint')

lint.linters_by_ft = {
	sh = { 'shellcheck' },
	text = { 'codespell' },
	markdown = { 'codespell' },
}

vim.api.nvim_create_autocmd({ 'BufWritePost' }, {
	callback = function()
		lint.try_lint()
	end,
})
```

`vim.pack.add` installs the plugin, the same call the other plugin modules make.
`nvim-pack-lock.json` pins the checkout at revision
`a219b2c9e5b4765e5c845aba119dad55806fcaf1`, from June 2026, and the linter
details later in this post come from that revision.

## Two Linters, Three Keys

`linters_by_ft` is the policy. nvim-lint ships the table empty, so every entry
here is one this file adds.

All three keys match the filetype Neovim assigns. A `.sh` file opens as `sh`, a
`.txt` file opens as `text`, and a `.md` file opens as `markdown`, so every key
finds its buffer. The `.zsh` the comment names is not a key at all, so a zsh
buffer gets no linter from this table.

## When Lint Runs

The autocommand is the only trigger, and it is a single event. `BufWritePost`
fires after the buffer has been written. The callback calls `lint.try_lint()`
with no arguments.

Called that way, `try_lint()` reads the current buffer's filetype, looks it up
in `linters_by_ft`, and runs the linters it finds. A filetype the table does not
name resolves to an empty list, and the call does nothing for it. The autocommand
itself carries no pattern and no buffer filter, so it fires on every write in
every buffer, and the filetype lookup is the only thing that narrows the work.

Formatting shares this moment. conform registers its `format_on_save` on
`BufWritePre`, so a formatter runs before the buffer is written, and this file's
`BufWritePost` runs ShellCheck or codespell on what was written. On a `.sh`
buffer that is `shfmt` first and ShellCheck second. The two event names are what
fix that order.

## The Built-In Definitions

The file names `shellcheck` and `codespell` and overrides neither, so the
built-in definitions are what run. It has no `lint.linters` table and no
per-linter `args`.

At the pinned revision, the ShellCheck definition spawns `shellcheck` with
`--format json1` and passes the buffer's file path, falling back to `-` when the
buffer has a non-empty `buftype` or its file cannot be read. It also sets
`stdin = true`, so the buffer is always written to the process. ShellCheck
ignores that input when a filename is in the argument list, and reads it when
the argument is `-`, which lets the same definition handle an unnamed buffer.

```lua
return {
  cmd = 'shellcheck',
  stdin = true,
  args = {
    '--format', 'json1',
    filename_or_stdin,
  },
  ignore_exitcode = true,
```

That `ignore_exitcode = true` is load-bearing. ShellCheck exits with a nonzero
code when it reports problems, and without the flag that code would surface as a
warning on every lint that found something. The parser reads the `comments`
array from the JSON and maps ShellCheck's four levels onto Neovim severities.

```lua
local severities = {
  error = vim.diagnostic.severity.ERROR,
  warning = vim.diagnostic.severity.WARN,
  info = vim.diagnostic.severity.INFO,
  style = vim.diagnostic.severity.HINT,
}
```

The codespell definition is smaller. It spawns `codespell` with
`--stdin-single-line -`, feeds the buffer over stdin, and also ignores the exit
code.

```lua
return {
  cmd = 'codespell',
  args = { '--stdin-single-line', "-" },
  stdin = true,
  ignore_exitcode = true,
```

Its parser reads lines of the form `63: word ==> correction`, emits each one as
an `INFO` diagnostic with the source `codespell`, and then finds the word in the
buffer line to set the column, because codespell reports only the line number.

## Where the Binaries Come From

`lua/plugins/mason.lua` hands `mason-tool-installer` a set of command line
tools, and `shellcheck` and `codespell` are two of the thirteen.

```lua
require('mason-tool-installer').setup({
	ensure_installed = {
		'black',
		'codespell',
		'eslint_d',
		'goimports',
		'isort',
		'js-debug-adapter',
		'prettier',
		'shellcheck',
		'shfmt',
		'sqlfmt',
		'stylua',
		'taplo',
		'yamlfmt',
	},
	run_on_start = true,
})
```

Mason's setup puts its bin directory on Neovim's `PATH`. The setting defaults to
`"prepend"`, and `lua/plugins/mason.lua` calls `require('mason').setup()` with
no arguments. In a clean session I called the setup and then resolved both
names, and each one came back under `~/.local/share/nvim/mason/bin`. That is the mechanism nvim-lint depends on,
because it spawns the linter by bare name. I also ran `shellcheck` and
`codespell` directly with the same arguments the definitions pass, and both
produced the output shape their parsers read.

## One Diagnostic Surface

nvim-lint has no display of its own. When a linter finishes, the plugin calls
`vim.diagnostic.set` on a namespace it creates per linter name, which places
lint diagnostics on the same surface the language servers use.
`lua/core/lsp.lua` configures that surface once.

```lua
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
```

So a ShellCheck error shows up with the same virtual text, underline, and
rounded float as a warning from `lua_ls`. With `severity_sort` in place, errors
are ordered above warnings in the float and the sign stack on a line where both
are present. The `float` table asks for the source, so the floating window names
the linter that produced the message. The `text` table inside `signs` holds no
entries, since the four lines that would set glyphs are commented out. An empty
`text` table does not remove the signs on Neovim 0.12.6. The sign handler falls
back to a single-letter sign, `E`, `W`, `I`, or `H`, for any severity without a
`text` entry, so a diagnostic draws a sign as well as the highlighted number.

## Reading the Diagnostics

The keymaps that read this surface live in `lua/config/keymaps/diagnostics.lua`
and are loaded from `lua/config/keymaps/init.lua` with the general ones.

```lua
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
```

`<leader>xq` and `<leader>xl` fill a quickfix list and a location list from the
diagnostics Neovim is already holding, and neither passes a `namespace`, so both
lists mix lint entries with language server entries. `vim.diagnostic.setqflist`
takes diagnostics from every buffer that has any, and
`vim.diagnostic.setloclist` takes only the current window's buffer. Each entry
carries the message and the severity, and ShellCheck's rule number rides along
in the `nr` field, where codespell leaves nothing. Both keymaps open the list
they fill, because opening is the default.

`<leader>xt` flips `virtual_text` through `vim.diagnostic.config`. That call
passes no namespace or buffer, so the flip is global and the same key turns the
text off for lint diagnostics and language server diagnostics at once. The
`vim.notify` that would report the new state is present but commented out, so
the toggle is silent.

The configuration also turns on Neovim's own spelling for `gitcommit`,
`markdown`, and `text` buffers in `lua/config/autocmds/text_wrap_spell.lua`,
which also turns on wrapping. codespell and spell are separate mechanisms, and a
Markdown buffer can trigger both.

## ESLint Stays on the Language Server

The table has no JavaScript, TypeScript, or JSON linter, and the comment says
where that work goes. `lsp/eslint.lua` configures the ESLint language server for
six filetypes.

```lua
	filetypes = {
		'javascript',
		'javascriptreact',
		'typescript',
		'typescriptreact',
		'json',
		'yaml',
	},
```

Its settings set `validate = 'on'` and `run = 'onType'`, with `format = false`,
so the server republishes diagnostics as the buffer changes instead of waiting
for a write. That is why there is no `eslint` entry in `linters_by_ft` and no
`eslint_d` call in this file. The tool installer does include `eslint_d`, but I
found no use of that executable anywhere in the configuration. The name appears
only in the installation list, and installing a tool is not the same as invoking
it.

## The Boundaries

No keymap in `lua/config/keymaps/` runs a linter and nothing calls
`lint.try_lint()` by hand, so the autocommand is the only lint trigger the
configuration installs. There is no codespell configuration file in the tree,
so the two built-in definitions are all the linter settings that exist. Nothing
lints on read, on insert leave, or on a timer, and the configuration defines no
command for linting either.

## Conclusion

The write path holds up in an isolated reproduction. A headless session loaded
only `lua/plugins/nvim-lint.lua`, with the pack manager stubbed. Saving a shell
buffer spawned `shellcheck` and placed its diagnostics in the buffer, and a
Markdown buffer did the same through `codespell`. In a separate isolated run,
diagnostics placed on two buffers showed `setqflist` filling one list from every
buffer that had any and `setloclist` from the current buffer alone, and a
diagnostic's `code` arriving in the `nr` field, which is where
ShellCheck's rule number lands. Loading `lua/plugins/conform.lua` alongside it
showed the formatter rewriting the buffer on `BufWritePre`, before the write,
and the lint callback running on the written buffer on `BufWritePost`, which is
the order the two event names predict. I also confirmed the filetype
assignments, including that a `.txt` file opens as `text`, which the `text` key
matches. The one thing I did not do is load the full configuration and drive it
end to end, so the parts above rest on the configuration and the pinned plugin
sources reproduced in isolation rather than on the assembled setup.

## Related Posts

- [How I Configure Formatting in Neovim](/posts/neovim/how-i-configure-formatting-in-neovim/)
- [How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/)
- [How I Configure Lua Language Server with Mason in Neovim](/posts/neovim/how-i-configure-lua-language-server-with-mason-in-neovim/)
- [How I Wire Completion with nvim-cmp in Neovim](/posts/neovim/how-i-wire-completion-with-nvim-cmp-in-neovim/)
- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)
- [How I Load Plugins with vim.pack in Neovim](/posts/neovim/how-i-load-plugins-with-vim-pack-in-neovim/)
- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

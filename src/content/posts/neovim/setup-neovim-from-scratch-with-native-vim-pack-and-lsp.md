---
title: 'Setup Neovim from Scratch with Native vim.pack and LSP'
description:
  'A step-by-step Neovim setup for 2026 and 2027 with native vim.pack and
  vim.lsp, no plugin manager. Covers LSP, formatting, completion, git, tests,
  and debugging.'
published: October 27, 2026
updated: November 16, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

This is how I set up Neovim from scratch. It is a personal config with Neovim
0.12.6 on macOS, and all of it lives in my
[dotfiles](https://github.com/ryanjayleyva/dotfiles-macos).

## TL;DR

Neovim 0.12 does more on its own now, so the config is mostly glue. Plugins are
loaded with native `vim.pack`, language servers are configured with native
`vim.lsp`, and Mason installs the tools. One file per plugin, one file per
language server.

## Install Neovim and the Tools

You need Neovim 0.12 or later because the config uses `vim.pack` and the native
`vim.lsp` config. Run the following command:

```sh
brew install neovim ripgrep node go
```

Telescope's live grep needs `ripgrep`. `node` and `go` are there for the tools
that need them.

Rust comes from [rustup](https://rustup.rs) instead of Homebrew. That also gives
you `cargo` and `rustfmt`, and Mason has no package for `rustfmt`.

You also need `git` and `make`. Both come with the Xcode Command Line Tools.

## Install a Font

This step is optional. The only thing that uses icons is the database UI. I use
Caskaydia Mono.

```sh
brew install --cask font-caskaydia-mono-nerd-font
```

## Set Up the File Structure

Run the following commands:

```sh
mkdir -p ~/.config/nvim/lsp ~/.config/nvim/lua/{config,core,plugins}
cd ~/.config/nvim
touch init.lua .stylua.toml
```

This is what you will end up with.

```bash
~/.config/nvim/
├── init.lua                  Boot order, only requires
├── lsp/<name>.lua            One language server each
├── lua/config/               Options, keymaps, autocmds
├── lua/core/lsp.lua          Enabled servers and diagnostics
├── lua/plugins/<name>.lua    One file per plugin
├── nvim-pack-lock.json       Plugin revisions
└── .stylua.toml              Formatter config
```

`init.lua` is a list of `require` calls and nothing else. Every step below ends
by adding one line to it, so follow the steps in order.

## Set Up the Core Options

Open Neovim with `nvim`. Do `:e lua/config/options.lua` and add the following.

```lua
vim.g.mapleader = ' '

-- Set appearance
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.wrap = false
vim.opt.signcolumn = 'yes'
vim.opt.scrolloff = 8
vim.opt.winborder = 'rounded'
vim.opt.laststatus = 0

-- Set indentation
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true
vim.opt.smartindent = true
vim.opt.formatoptions:append('r')

-- Set window and input behavior
vim.opt.mouse = ''
vim.opt.splitright = true
vim.opt.splitbelow = true
vim.opt.clipboard = 'unnamedplus'

-- Set search behavior
vim.opt.ignorecase = true
vim.opt.smartcase = true
vim.opt.inccommand = 'split'

-- Set spell checking
vim.opt.spelllang = 'en_us'

-- Set manual completion behavior because nvim-cmp handles the rest
vim.opt.completeopt = 'menu,menuone,noselect'

-- Set file and command behavior
vim.opt.path:append('**')
vim.opt.wildignore:append('*/node_modules/*')
vim.opt.wildmode = 'longest:full,full'
vim.opt.swapfile = false
vim.opt.shortmess:append('WI')

-- Set colors
vim.opt.termguicolors = true
```

Leader is space. Open `init.lua` with `:e init.lua` and add the line.

```lua
require('config.options')
```

## Set Up the Core Keymaps

Do `:e lua/config/keymaps.lua` and add the following.

```lua
-- Insert mode
vim.keymap.set('i', 'jk', '<Esc>', { desc = 'Exit insert mode' })

-- Numbers
vim.keymap.set('n', '<leader>+', '<C-a>', { desc = 'Increment number' })
vim.keymap.set('n', '<leader>-', '<C-x>', { desc = 'Decrement number' })

-- Search
vim.keymap.set(
	'n',
	'<leader>cs',
	'<Cmd>nohlsearch<CR>',
	{ desc = 'Clear search highlights' }
)

-- File
vim.keymap.set(
	'n',
	'<leader>us',
	'<Cmd>update | source<CR>',
	{ desc = 'Save and source file' }
)

-- Diagnostics
vim.keymap.set(
	'n',
	'<leader>xq',
	vim.diagnostic.setqflist,
	{ desc = 'Diagnostics to quickfix list' }
)
vim.keymap.set(
	'n',
	'<leader>xl',
	vim.diagnostic.setloclist,
	{ desc = 'Diagnostics to location list' }
)
vim.keymap.set('n', '<leader>xt', function()
	vim.diagnostic.config({
		virtual_text = not vim.diagnostic.config().virtual_text,
	})
end, { desc = 'Toggle diagnostic virtual text' })
```

`<leader>us` saves and sources the current file, which is how I try out a config
change without restarting.

Add the line to `init.lua`.

```lua
require('config.keymaps')
```

## Set Up the Autocmds

Do `:e lua/config/autocmds.lua` and add the following.

```lua
local group = vim.api.nvim_create_augroup('config', { clear = true })

-- Use request_sync so the edits land before the write
local function apply_source_action(buffer, client_name, kind)
	local client = vim.lsp.get_clients({ bufnr = buffer, name = client_name })[1]
	if not client then
		return
	end

	local response = client:request_sync('textDocument/codeAction', {
		textDocument = vim.lsp.util.make_text_document_params(buffer),
		range = {
			start = { line = 0, character = 0 },
			['end'] = { line = vim.api.nvim_buf_line_count(buffer), character = 0 },
		},
		context = { only = { kind }, diagnostics = {} },
	}, 2000, buffer)

	for _, action in ipairs(response and response.result or {}) do
		-- Resolve first because ruff returns the action without its edit
		if not action.edit and client:supports_method('codeAction/resolve') then
			local resolved =
				client:request_sync('codeAction/resolve', action, 2000, buffer)
			action = resolved and resolved.result or action
		end
		if action.edit then
			vim.lsp.util.apply_workspace_edit(action.edit, client.offset_encoding)
		end
	end
end

-- Register before conform because autocmds run in order and fixes go first
vim.api.nvim_create_autocmd('BufWritePre', {
	group = group,
	callback = function(event)
		apply_source_action(event.buf, 'eslint', 'source.fixAll.eslint')
		apply_source_action(event.buf, 'gopls', 'source.organizeImports')
		apply_source_action(event.buf, 'ruff', 'source.organizeImports')
	end,
})

-- Spell check prose only because code is full of words the dictionary lacks
vim.api.nvim_create_autocmd('FileType', {
	group = group,
	pattern = { 'gitcommit', 'markdown', 'text' },
	callback = function()
		vim.opt_local.spell = true
	end,
})

-- Highlight yanked text
vim.api.nvim_create_autocmd('TextYankPost', {
	group = group,
	callback = function()
		vim.hl.on_yank()
	end,
})
```

Add the line to `init.lua`.

```lua
require('config.autocmds') -- Load before conform because the save fixes must run before formatting
```

## Set Up Mason

Mason installs the language servers and the tools that are not servers.

Do `:e lua/plugins/mason.lua` and add the following. This is the first plugin
file, so the `vim.pack.add` call at the top is how every plugin file starts.

```lua
vim.pack.add({
	{ src = 'https://github.com/mason-org/mason.nvim' },
	{ src = 'https://github.com/WhoIsSethDaniel/mason-tool-installer.nvim' },
})

-- Map each lsp/*.lua name to its Mason package
-- Keep in sync with the enabled servers in core/lsp.lua
local servers = {
	astro = 'astro-language-server',
	bashls = 'bash-language-server',
	cssls = 'css-lsp',
	dockerls = 'dockerfile-language-server',
	emmet_language_server = 'emmet-language-server',
	eslint = 'eslint-lsp',
	gopls = 'gopls',
	graphql = 'graphql-language-service-cli',
	html = 'html-lsp',
	jsonls = 'json-lsp',
	lua_ls = 'lua-language-server',
	marksman = 'marksman',
	postgres_lsp = 'postgres-language-server',
	pyright = 'pyright',
	ruff = 'ruff',
	-- Skip enabling in core/lsp.lua because rustaceanvim starts it with these settings
	['rust-analyzer'] = 'rust-analyzer',
	svelte = 'svelte-language-server',
	tailwindcss = 'tailwindcss-language-server',
	templ = 'templ',
	tombi = 'tombi',
	vtsls = 'vtsls',
	yamlls = 'yaml-language-server',
}

-- Install non-LSP tools too
local tools = {
	'codelldb',
	'delve',
	'js-debug-adapter',
	'prettier',
	'shfmt',
	'stylua',
	'tree-sitter-cli',
}

local ensure_installed = vim.list_extend(vim.tbl_values(servers), tools)

require('mason').setup()

require('mason-tool-installer').setup({
	ensure_installed = ensure_installed,
	run_on_start = true,
})
```

Add the line to `init.lua`. Mason installs everything the next time you start
Neovim.

```lua
require('plugins.mason')
```

## Set Up Formatting

Formatting runs on save through conform.nvim. Do `:e lua/plugins/conform.lua`
and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/stevearc/conform.nvim' },
})

require('conform').setup({
	format_on_save = {
		lsp_format = 'fallback',
		timeout_ms = 5000,
	},

	-- Require a config so projects without one fall back to LSP formatting
	formatters = {
		prettier = {
			cwd = require('conform.util').root_file({
				'.prettierrc',
				'.prettierrc.json',
				'prettier.config.ts',
				'prettier.config.js',
			}),
			require_cwd = true,
		},
	},

	formatters_by_ft = {
		css = { 'prettier' },
		graphql = { 'prettier' },
		html = { 'prettier' },
		javascript = { 'prettier' },
		javascriptreact = { 'prettier' },
		json = { 'prettier' },
		json5 = { 'prettier' },
		jsonc = { 'prettier' },
		lua = { 'stylua' },
		markdown = { 'prettier' },
		python = { 'ruff_format' },
		rust = { 'rustfmt' },
		sh = { 'shfmt' },
		typescript = { 'prettier' },
		typescriptreact = { 'prettier' },
		yaml = { 'prettier' },
	},
})
```

Prettier only runs when the project has its own Prettier config, so I never
reformat someone else's repo by accident.

Do `:e .stylua.toml` and add the following.

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

Add the line to `init.lua`.

```lua
require('plugins.conform')
```

## Set Up schemastore and plenary

These are two small files. Do `:e lua/plugins/schemastore.lua` and add the
following.

```lua
vim.pack.add({
	{ src = 'https://github.com/b0o/schemastore.nvim' },
})
```

Do `:e lua/plugins/plenary.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-lua/plenary.nvim' },
})
```

Add the lines to `init.lua`.

```lua
require('plugins.schemastore')
require('plugins.plenary')
```

## Set Up nvim-nio

Do `:e lua/plugins/nvim-nio.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-neotest/nvim-nio' },
})
```

Add the line to `init.lua`.

```lua
require('plugins.nvim-nio') -- Load before nvim-dap and neotest because they require nio
```

## Set Up Telescope

Do `:e lua/plugins/telescope.lua` and add the following.

```lua
-- Build fzf-native after updates because vim.pack has no build step
vim.api.nvim_create_autocmd('PackChanged', {
	callback = function(event)
		local plugin_name = event.data.spec.name
		local was_deleted = event.data.kind == 'delete'

		if plugin_name == 'telescope-fzf-native.nvim' and not was_deleted then
			vim.system({ 'make' }, { cwd = event.data.path }):wait()
		end
	end,
})

vim.pack.add({
	{ src = 'https://github.com/nvim-telescope/telescope.nvim' },
	{ src = 'https://github.com/nvim-telescope/telescope-fzf-native.nvim' },
})

local builtin = require('telescope.builtin')
local telescope = require('telescope')

telescope.setup({
	defaults = {
		layout_strategy = 'vertical',
		layout_config = {
			width = 0.6,
			height = 0.9,
		},
	},
})

-- Show line numbers in previews except help, and wrap long CSV lines
vim.api.nvim_create_autocmd('User', {
	pattern = 'TelescopePreviewerLoaded',
	callback = function(event)
		local filetype = event.data.filetype
		local file_name = event.data.bufname

		if filetype ~= 'help' then
			vim.wo.number = true
		end

		if file_name and file_name:match('%.csv$') then
			vim.wo.wrap = true
		end
	end,
})

-- Load fzf-native if built
pcall(telescope.load_extension, 'fzf')

-- Map telescope pickers
vim.keymap.set('n', '<leader>ff', function()
	builtin.find_files({
		hidden = true,
		file_ignore_patterns = { '%.git/' },
	})
end, { desc = 'Find files' })

vim.keymap.set('n', '<leader>fg', builtin.live_grep, { desc = 'Live grep' })
vim.keymap.set('n', '<leader>fb', builtin.buffers, { desc = 'Find buffers' })
vim.keymap.set(
	'n',
	'<leader>fh',
	builtin.help_tags,
	{ desc = 'Find help tags' }
)
```

`<leader>ff` finds files, `<leader>fg` live greps, `<leader>fb` lists buffers,
and `<leader>fh` searches help.

Add the line to `init.lua`.

```lua
require('plugins.telescope')
```

## Set Up gitsigns

Do `:e lua/plugins/gitsigns.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/lewis6991/gitsigns.nvim' },
})

require('gitsigns').setup({
	on_attach = function(bufnr)
		local gitsigns = require('gitsigns')

		local function map(mode, lhs, rhs, desc)
			vim.keymap.set(mode, lhs, rhs, { buffer = bufnr, desc = desc })
		end

		-- Fall back to the built-in jumps because diff mode uses ]c and [c
		map('n', ']c', function()
			if vim.wo.diff then
				vim.cmd.normal({ ']c', bang = true })
			else
				gitsigns.nav_hunk('next')
			end
		end, 'Next git hunk')

		map('n', '[c', function()
			if vim.wo.diff then
				vim.cmd.normal({ '[c', bang = true })
			else
				gitsigns.nav_hunk('prev')
			end
		end, 'Previous git hunk')

		-- Stage and reset hunks
		map('n', '<leader>hs', gitsigns.stage_hunk, 'Stage hunk')
		map('n', '<leader>hr', gitsigns.reset_hunk, 'Reset hunk')

		map('v', '<leader>hs', function()
			gitsigns.stage_hunk({ vim.fn.line('.'), vim.fn.line('v') })
		end, 'Stage selected lines')

		map('v', '<leader>hr', function()
			gitsigns.reset_hunk({ vim.fn.line('.'), vim.fn.line('v') })
		end, 'Reset selected lines')

		map('n', '<leader>hS', gitsigns.stage_buffer, 'Stage buffer')
		map('n', '<leader>hR', gitsigns.reset_buffer, 'Reset buffer')
		map('n', '<leader>hp', gitsigns.preview_hunk, 'Preview hunk')

		map('n', '<leader>hb', function()
			gitsigns.blame_line({ full = true })
		end, 'Blame line')

		map('n', '<leader>hd', gitsigns.diffthis, 'Diff against index')

		-- Toggle blame
		map(
			'n',
			'<leader>tb',
			gitsigns.toggle_current_line_blame,
			'Toggle line blame'
		)

		-- Select hunks
		map({ 'o', 'x' }, 'ih', gitsigns.select_hunk, 'Select hunk')
	end,
})
```

Hunks show up in the sign column. `]c` and `[c` jump between them, `<leader>hp`
previews a hunk, and `<leader>hs` stages it.

Add the line to `init.lua`.

```lua
require('plugins.gitsigns')
```

## Set Up Treesitter

Do `:e lua/plugins/nvim-treesitter.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-treesitter/nvim-treesitter' },
})

local parsers = {
	'astro',
	'bash',
	'css',
	'dockerfile',
	'go',
	'gomod',
	'gosum',
	'gowork',
	'graphql',
	'html',
	'javascript',
	'jsdoc',
	'json',
	'json5',
	'lua',
	'luadoc',
	'python',
	'regex',
	'rust',
	'sql',
	'svelte',
	'templ',
	'toml',
	'tsx',
	'typescript',
	'yaml',
}

vim.api.nvim_create_autocmd('FileType', {
	pattern = {
		'astro',
		'css',
		'dockerfile',
		'go',
		'gomod',
		'gosum',
		'gowork',
		'graphql',
		'html',
		'javascript',
		'javascriptreact',
		'json',
		'json5',
		'jsonc',
		'lua',
		'python',
		'rust',
		'sh',
		'sql',
		'svelte',
		'templ',
		'toml',
		'typescript',
		'typescriptreact',
		'yaml',
	},
	callback = function(event)
		-- Ignore errors because the parser may still be installing
		pcall(vim.treesitter.start, event.buf)
	end,
})

-- Start highlighting in buffers opened before their parser finished installing
local function start_highlighting_in_open_buffers()
	-- Refresh the runtimepath because Neovim caches the missing parser directory
	vim.o.runtimepath = vim.o.runtimepath
	for _, buffer in ipairs(vim.api.nvim_list_bufs()) do
		pcall(vim.treesitter.start, buffer)
	end
end

-- Install parsers in the background
local function install_parsers()
	local install_task = require('nvim-treesitter').install(parsers)
	install_task:await(vim.schedule_wrap(start_highlighting_in_open_buffers))
end

-- Install parsers once Mason installs the CLI
local function install_parsers_when_cli_ready(mason_package)
	if mason_package.name == 'tree-sitter-cli' then
		-- Schedule because Mason emits the event in a fast context
		vim.schedule(install_parsers)
	end
end

-- Wait for Mason (plugins/mason.lua) to install the CLI because parsers compile with it
if vim.fn.executable('tree-sitter') == 1 then
	install_parsers()
else
	local mason_registry = require('mason-registry')
	mason_registry:on('package:install:success', install_parsers_when_cli_ready)
end

-- Grow and shrink the selection with the built-in an and in
-- Use remap because an and in are mappings
vim.keymap.set(
	'n',
	'<leader>ci',
	'van',
	{ remap = true, desc = 'Start selection' }
)
vim.keymap.set(
	'x',
	'<leader>ci',
	'an',
	{ remap = true, desc = 'Grow selection' }
)
vim.keymap.set(
	'x',
	'<leader>cd',
	'in',
	{ remap = true, desc = 'Shrink selection' }
)
```

Do `:e lua/plugins/nvim-treesitter-context.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-treesitter/nvim-treesitter-context' },
})

require('treesitter-context').setup({
	max_lines = 3,
	separator = '─',
})
```

Do `:e lua/plugins/nvim-treesitter-textobjects.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-treesitter/nvim-treesitter-textobjects' },
})

require('nvim-treesitter-textobjects').setup({
	select = {
		lookahead = true,
		selection_modes = {
			['@parameter.outer'] = 'v',
			['@function.outer'] = 'V',
		},
	},
	move = {
		set_jumps = true,
	},
})

local move = require('nvim-treesitter-textobjects.move')
local select = require('nvim-treesitter-textobjects.select')

-- Map select textobjects
local selects = {
	{ 'af', '@function.outer', 'Select outer function' },
	{ 'if', '@function.inner', 'Select inner function' },
	{ 'aa', '@parameter.outer', 'Select outer parameter' },
	{ 'ia', '@parameter.inner', 'Select inner parameter' },
}

for _, item in ipairs(selects) do
	local lhs, query, desc = unpack(item)
	vim.keymap.set({ 'x', 'o' }, lhs, function()
		select.select_textobject(query, 'textobjects')
	end, { desc = desc })
end

-- Map motions between textobjects
local moves = {
	{ ']f', move.goto_next_start, '@function.outer', 'Next function start' },
	{ ']a', move.goto_next_start, '@parameter.inner', 'Next parameter start' },
	{ ']F', move.goto_next_end, '@function.outer', 'Next function end' },
	{ ']A', move.goto_next_end, '@parameter.inner', 'Next parameter end' },
	{
		'[f',
		move.goto_previous_start,
		'@function.outer',
		'Previous function start',
	},
	{
		'[a',
		move.goto_previous_start,
		'@parameter.inner',
		'Previous parameter start',
	},
	{ '[F', move.goto_previous_end, '@function.outer', 'Previous function end' },
	{
		'[A',
		move.goto_previous_end,
		'@parameter.inner',
		'Previous parameter end',
	},
}

for _, item in ipairs(moves) do
	local lhs, goto_fn, query, desc = unpack(item)
	vim.keymap.set({ 'n', 'x', 'o' }, lhs, function()
		goto_fn(query, 'textobjects')
	end, { desc = desc })
end
```

`af`, `if`, `aa`, and `ia` select functions and parameters, and `]f` and `[f`
jump between functions.

Add the lines to `init.lua`.

```lua
require('plugins.nvim-treesitter')
require('plugins.nvim-treesitter-context')
require('plugins.nvim-treesitter-textobjects')
```

## Set Up refactoring.nvim

Do `:e lua/plugins/refactoring.lua` and add the following.

```lua
vim.pack.add({
	-- Drop on Neovim 0.13 because it ships vim.async
	{ src = 'https://github.com/lewis6991/async.nvim' },
	{ src = 'https://github.com/ThePrimeagen/refactoring.nvim' },
})

vim.keymap.set({ 'n', 'x' }, '<leader>rs', function()
	require('refactoring').select_refactor()
end, { desc = 'Select refactor' })
```

Add the line to `init.lua`.

```lua
require('plugins.refactoring')
```

## Set Up nvim-surround, nvim-ts-autotag, and mini.pairs

Three small ones for the editing chores. Do `:e lua/plugins/nvim-surround.lua`
and add the following.

```lua
vim.pack.add({
	{
		src = 'https://github.com/kylechui/nvim-surround',
		version = vim.version.range('4.x'),
	},
})
```

Do `:e lua/plugins/nvim-ts-autotag.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/windwp/nvim-ts-autotag' },
})

require('nvim-ts-autotag').setup()
```

Do `:e lua/plugins/mini-pairs.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-mini/mini.pairs' },
})

require('mini.pairs').setup({
	modes = { command = true },
})
```

Add the lines to `init.lua`.

```lua
require('plugins.nvim-surround')
require('plugins.nvim-ts-autotag')
require('plugins.mini-pairs')
```

## Set Up vim-tmux-navigator

Do `:e lua/plugins/vim-tmux-navigator.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/christoomey/vim-tmux-navigator' },
})
```

That lets `Ctrl-h/j/k/l` move between Neovim splits and tmux panes. The tmux
half is in my
[tmux post](/posts/tmux/restructuring-my-tmux-configuration-by-reason-for-change/).

Add the line to `init.lua`.

```lua
require('plugins.vim-tmux-navigator')
```

## Set Up Completion

Completion is nvim-cmp with LuaSnip for snippets. Do
`:e lua/plugins/luasnip.lua` and add the following.

```lua
-- Build jsregexp after updates because vim.pack has no build step
vim.api.nvim_create_autocmd('PackChanged', {
	callback = function(event)
		local is_luasnip = event.data.spec.name == 'LuaSnip'
		if is_luasnip and event.data.kind ~= 'delete' then
			local cmd = { 'make', 'install_jsregexp' }
			vim.system(cmd, { cwd = event.data.path }):wait()
		end
	end,
})

vim.pack.add({
	{ src = 'https://github.com/L3MON4D3/LuaSnip' },
	{ src = 'https://github.com/rafamadriz/friendly-snippets' },
})

require('luasnip').config.setup({
	keep_roots = true,
	link_roots = true,
	link_children = true,
	exit_roots = false,
	update_events = { 'TextChanged', 'TextChangedI' },
})

require('luasnip.loaders.from_vscode').lazy_load()
```

Do `:e lua/plugins/nvim-cmp.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/hrsh7th/nvim-cmp' },
	{ src = 'https://github.com/hrsh7th/cmp-nvim-lsp' },
	{ src = 'https://github.com/hrsh7th/cmp-path' },
	{ src = 'https://github.com/hrsh7th/cmp-buffer' },
	{ src = 'https://github.com/saadparwaiz1/cmp_luasnip' },
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
			elseif luasnip.locally_jumpable(-1) then
				luasnip.jump(-1)
			else
				fallback()
			end
		end, { 'i', 's' }),
	}),

	sources = {
		{ name = 'nvim_lsp' },
		{ name = 'luasnip' },
		{ name = 'path' },
		{ name = 'buffer' },
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
			return vim_item
		end,
	},
})
```

`Tab` and `Shift-Tab` move through the menu or jump through snippets.

Add the lines to `init.lua`.

```lua
require('plugins.luasnip') -- Load before nvim-cmp because its config requires luasnip
require('plugins.nvim-cmp')
```

## Set Up kulala.nvim

kulala.nvim is my HTTP client for `.http` files. It needs a license token in the
`KULALA_CORE_LICENSE_TOKEN` environment variable.

Do `:e lua/plugins/kulala.lua` and add the following.

```lua
-- Set KULALA_CORE_LICENSE_TOKEN because kulala-core needs a license token
vim.pack.add({
	{ src = 'https://github.com/dont-be-evil-company/kulala.nvim' },
})

require('kulala').setup({
	global_keymaps = true,
})
```

Add the line to `init.lua`.

```lua
require('plugins.kulala')
```

## Set Up vim-dadbod

Do `:e lua/plugins/vim-dadbod.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/tpope/vim-dadbod' },
	{ src = 'https://github.com/kristijanhusak/vim-dadbod-completion' },
	{ src = 'https://github.com/kristijanhusak/vim-dadbod-ui' },
})

require('cmp').setup.filetype({ 'sql', 'mysql', 'plsql' }, {
	sources = {
		{ name = 'vim-dadbod-completion' },
		{ name = 'nvim_lsp' },
		{ name = 'luasnip' },
		{ name = 'path' },
		{ name = 'buffer' },
	},
})

vim.g.db_ui_use_nerd_fonts = 1

-- Database
vim.keymap.set(
	'n',
	'<leader>Db',
	'<cmd>DBUI<cr>',
	{ desc = 'Toggle database UI' }
)

-- Rebind because the default <leader>R shadows the kulala prefix in results
vim.keymap.set(
	'n',
	'<leader>Dl',
	'<Plug>(DBUI_ToggleResultLayout)',
	{ remap = true, desc = 'Toggle query result layout' }
)
```

Add the line to `init.lua`.

```lua
require('plugins.vim-dadbod') -- Load after nvim-cmp because its config extends cmp
```

## Set Up Debugging

Do `:e lua/plugins/nvim-dap.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/mfussenegger/nvim-dap' },
	{ src = 'https://github.com/rcarriga/nvim-dap-ui' },
})

local dap = require('dap')

dap.adapters['pwa-node'] = {
	type = 'server',
	-- Match js-debug's listen address because the default 127.0.0.1 is refused
	host = 'localhost',
	port = '${port}',
	executable = {
		command = 'js-debug-adapter',
		args = { '${port}' },
	},
}

dap.adapters.go = {
	type = 'server',
	port = '${port}',
	executable = {
		command = 'dlv',
		args = { 'dap', '-l', '127.0.0.1:${port}' },
	},
}

dap.configurations.go = {
	{
		type = 'go',
		request = 'launch',
		name = 'Debug Package',
		mode = 'debug',
		program = '${fileDirname}',
	},

	{
		type = 'go',
		request = 'launch',
		name = 'Debug Package Tests',
		mode = 'test',
		program = '${fileDirname}',
	},
}

-- Skip both because setting skipFiles replaces js-debug's default that hides node internals
local skip_files = { '<node_internals>/**', '**/node_modules/**' }

local js_configs = {
	{
		type = 'pwa-node',
		request = 'launch',
		name = 'Debug Current File (Node)',
		program = '${file}',
		-- Set cwd because nvim-dap does not apply js-debug's default
		cwd = '${workspaceFolder}',
		console = 'integratedTerminal',
		skipFiles = skip_files,
	},

	{
		type = 'pwa-node',
		request = 'launch',
		name = 'Debug Vitest Tests',
		program = '${workspaceFolder}/node_modules/vitest/vitest.mjs',
		-- Pass the relative file because Vitest's filter ignores a symlinked path
		args = { 'run', '${relativeFile}' },
		cwd = '${workspaceFolder}',
		console = 'integratedTerminal',
		skipFiles = skip_files,
	},

	{
		type = 'pwa-node',
		request = 'attach',
		name = 'Attach to Node Process',
		-- Pick a process whose inspector listens on 9229 because js-debug does not enable it
		processId = require('dap.utils').pick_process,
		cwd = '${workspaceFolder}',
		skipFiles = skip_files,
	},
}

for _, filetype in ipairs({
	'javascript',
	'javascriptreact',
	'typescript',
	'typescriptreact',
}) do
	dap.configurations[filetype] = js_configs
end

require('dapui').setup()

-- Debugging
vim.keymap.set(
	'n',
	'<leader>db',
	dap.toggle_breakpoint,
	{ desc = 'Toggle breakpoint' }
)
vim.keymap.set('n', '<leader>dc', dap.continue, { desc = 'Continue debugging' })
vim.keymap.set('n', '<leader>di', dap.step_into, { desc = 'Step into' })
vim.keymap.set('n', '<leader>do', dap.step_over, { desc = 'Step over' })
vim.keymap.set('n', '<leader>dO', dap.step_out, { desc = 'Step out' })
vim.keymap.set(
	'n',
	'<leader>dt',
	dap.terminate,
	{ desc = 'Terminate debug session' }
)
vim.keymap.set('n', '<leader>dr', dap.repl.open, { desc = 'Open debug REPL' })
vim.keymap.set(
	'n',
	'<leader>du',
	require('dapui').toggle,
	{ desc = 'Toggle debug UI' }
)
```

Add the line to `init.lua`.

```lua
require('plugins.nvim-dap')
```

## Set Up rustaceanvim

rustaceanvim starts rust-analyzer, so it gets its own server config. Do
`:e lua/plugins/rustaceanvim.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/mrcjkb/rustaceanvim' },
})
```

Then do `:e lsp/rust-analyzer.lua` and add the following.

```lua
return {
	cmd = {
		'rust-analyzer',
	},

	filetypes = {
		'rust',
	},

	root_markers = {
		'Cargo.toml',
		'.git',
	},
	workspace_required = true,

	settings = {
		['rust-analyzer'] = {
			cargo = {
				features = 'all',
			},

			diagnostics = {
				styleLints = {
					enable = true,
				},
			},

			check = {
				command = 'clippy',
			},
		},
	},
}
```

Add the line to `init.lua`.

```lua
require('plugins.rustaceanvim') -- Load before neotest because its adapter requires rustaceanvim
```

## Set Up Tests

neotest runs tests from inside Neovim. I have adapters for Vitest, Go, and Rust.
Do `:e lua/plugins/neotest.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-neotest/neotest' },
	{ src = 'https://github.com/marilari88/neotest-vitest' },
	{ src = 'https://github.com/fredrikaverpil/neotest-golang' },
})

local neotest = require('neotest')

neotest.setup({
	adapters = {
		require('neotest-vitest'),
		require('rustaceanvim.neotest'),
		require('neotest-golang')({
			dap_mode = 'manual',
			dap_manual_config = {
				name = 'Debug Go Tests',
				type = 'go',
				request = 'launch',
				mode = 'test',
			},
		}),
	},
	output = {
		open_on_run = 'always',
	},
})

-- Tests
vim.keymap.set(
	'n',
	'<leader>tt',
	neotest.summary.toggle,
	{ desc = 'Toggle test summary' }
)
vim.keymap.set(
	'n',
	'<leader>tr',
	neotest.run.run,
	{ desc = 'Run nearest test' }
)
vim.keymap.set('n', '<leader>ts', neotest.run.stop, { desc = 'Stop test run' })
vim.keymap.set(
	'n',
	'<leader>ta',
	neotest.run.attach,
	{ desc = 'Attach to test run' }
)
-- Enter the window because the navigator keys cannot reach a floating window
vim.keymap.set('n', '<leader>to', function()
	neotest.output.open({ enter = true })
end, { desc = 'Open test output' })

vim.keymap.set('n', '<leader>tf', function()
	neotest.run.run(vim.fn.expand('%'))
end, { desc = 'Run tests in file' })

vim.keymap.set('n', '<leader>td', function()
	neotest.run.run({ strategy = 'dap' })
end, { desc = 'Debug nearest test' })
```

`<leader>tr` runs the nearest test, `<leader>tf` runs the file, `<leader>tt`
toggles the summary, and `<leader>td` runs a test under the debugger.

Add the line to `init.lua`.

```lua
require('plugins.neotest')
```

## Set Up Language Servers

Every server is a file in `lsp/` that returns a table. I use 22 of them, and
these three are the ones worth showing. You already created `rust-analyzer.lua`
in the rustaceanvim step. The rest are in the `.config/nvim/lsp` folder of my
[dotfiles](https://github.com/ryanjayleyva/dotfiles-macos).

Do `:e lsp/vtsls.lua` and add the following.

```lua
return {
	cmd = {
		'vtsls',
		'--stdio',
	},

	filetypes = {
		'javascript',
		'javascriptreact',
		'typescript',
		'typescriptreact',
	},

	root_markers = {
		'tsconfig.json',
		'tsconfig.app.json',
		'tsconfig.node.json',
		'jsconfig.json',
		'package.json',
		'.git',
	},

	settings = {
		typescript = {
			inlayHints = {
				parameterNames = { enabled = 'all' },
				parameterTypes = { enabled = true },
				variableTypes = { enabled = true },
				propertyDeclarationTypes = { enabled = true },
				functionLikeReturnTypes = { enabled = true },
				enumMemberValues = { enabled = true },
			},
		},

		javascript = {
			inlayHints = {
				parameterNames = { enabled = 'all' },
				parameterTypes = { enabled = true },
				variableTypes = { enabled = true },
				propertyDeclarationTypes = { enabled = true },
				functionLikeReturnTypes = { enabled = true },
			},
		},

		vtsls = {
			autoUseWorkspaceTsdk = true,
			experimental = {
				completion = {
					enableServerSideFuzzyMatch = true,
				},
			},
		},
	},
}
```

Do `:e lsp/lua_ls.lua` and add the following.

```lua
return {
	cmd = {
		'lua-language-server',
	},

	filetypes = { 'lua' },

	root_markers = {
		'.git',
		'.stylua.toml',
	},

	settings = {
		Lua = {
			format = {
				enable = false,
			},

			completion = {
				autoRequire = false,
				callSnippet = 'Replace',
				displayContext = 12,
			},

			hint = {
				arrayIndex = 'Enable',
				enable = true,
				setType = true,
			},

			runtime = {
				version = 'LuaJIT',
				-- Resolve modules like Neovim because the default also matches mason's dap.lua
				path = { 'lua/?.lua', 'lua/?/init.lua' },
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
					'${3rd}/busted/library',
				}),
			},
		},
	},
}
```

Do `:e lsp/tailwindcss.lua` and add the following.

```lua
return {
	cmd = {
		'tailwindcss-language-server',
		'--stdio',
	},

	filetypes = {
		'astro',
		'css',
		'html',
		'javascript',
		'javascriptreact',
		'svelte',
		'templ',
		'typescript',
		'typescriptreact',
	},

	-- Attach only to Tailwind projects because the server idles elsewhere
	root_dir = function(bufnr, on_dir)
		local root = vim.fs.root(bufnr, function(name, path)
			if name:find('^tailwind%.config%.') then
				return true
			end
			-- Read package.json because v4 has no tailwind.config file
			if name == 'package.json' then
				local lines = vim.fn.readfile(vim.fs.joinpath(path, name))
				return table.concat(lines):find('"@?tailwindcss[/"]') ~= nil
			end
			return false
		end)
		if root then
			on_dir(root)
		end
	end,

	-- Map templ to html because the server has no templ support
	settings = {
		tailwindCSS = {
			includeLanguages = { templ = 'html' },
		},
	},
}
```

Now `lua/core/lsp.lua`. Do `:e lua/core/lsp.lua` and add the following. It turns
the servers on and sets up diagnostics.

```lua
vim.lsp.inlay_hint.enable(true)
vim.lsp.codelens.enable(true)

vim.lsp.config('*', {
	capabilities = require('cmp_nvim_lsp').default_capabilities(),
})

vim.lsp.enable({
	'astro',
	'bashls',
	'cssls',
	'dockerls',
	'emmet_language_server',
	'eslint',
	'gopls',
	'graphql',
	'html',
	'jsonls',
	'lua_ls',
	'marksman',
	'postgres_lsp',
	'pyright',
	'ruff',
	-- Skip rust-analyzer because rustaceanvim (plugins/rustaceanvim.lua) starts it
	-- from lsp/rust-analyzer.lua Enabling it here starts the client without those
	-- settings because rustaceanvim clears them from the shared config
	-- 'rust-analyzer',
	'svelte',
	'tailwindcss',
	'templ',
	'tombi',
	'vtsls',
	'yamlls',
})

vim.diagnostic.config({
	virtual_text = true,
	severity_sort = true,
	float = {
		source = true,
	},
	signs = {
		numhl = {
			[vim.diagnostic.severity.ERROR] = 'ErrorMsg',
			[vim.diagnostic.severity.WARN] = 'WarningMsg',
		},
	},
})
```

Adding a language takes three small edits. A new `lsp/<name>.lua`, a line in the
Mason table, and a line in the enable list.

Add the line to `init.lua`.

```lua
require('core.lsp')
```

## Set Up the Colorscheme

Do `:e lua/plugins/cutiepro.lua` and add the following.

```lua
vim.pack.add({
	{ src = 'https://github.com/ryanjayleyva/cutiepro.nvim' },
})

vim.cmd.colorscheme('cutiepro')
```

cutiepro is my own colorscheme. Swap in whichever one you like.

Add the last line to `init.lua`.

```lua
require('plugins.cutiepro')
```

## You're Done

Quit with `:q` and open `nvim` again. `vim.pack` installs the plugins, then
Mason installs the language servers and tools, and treesitter installs the
parsers once the CLI is ready. Give it a minute the first time.

## Related Posts

- [Restructuring My Tmux Configuration by Reason for Change](/posts/tmux/restructuring-my-tmux-configuration-by-reason-for-change/)
- [The Zsh Configuration I Can Reason About](/posts/zsh/the-zsh-configuration-i-can-reason-about/)
- [Forty-Eight Lines of WezTerm Configuration](/posts/wezterm/forty-eight-lines-of-wezterm-configuration/)

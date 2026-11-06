---
title: 'How I Load Plugins with vim.pack in Neovim'
description:
  'How I load plugins with vim.pack in Neovim, the two lazy.nvim fields that did
  nothing there, the PackChanged hook I added instead, and why commenting out a
  plugin does not remove it.'
published: November 1, 2026
updated: November 6, 2026
tags: ['neovim', 'lua', 'dotfiles']
---

`init.lua` is thirty-six lines, twenty-eight of them requires. Twenty-three
load a module under `lua/plugins/`, four load the base modules, one calls
`core.lsp.setup()`, and the last is commented out. Nothing in the file installs
a plugin manager, because Neovim ships one.

`vim.pack` tracks forty-two plugins here and activates thirty-nine. The lockfile
that records every revision sits next to `init.lua`, and the first `vim.pack.add`
call reads it once on every startup. I keep it under version control.

I am on Neovim 0.12.6. `vim.pack` is new in 0.12 and is still documented as
experimental, so the API may change. It also needs `git` on `PATH`.

## TL;DR

`vim.pack.add` takes a list of specs. A spec has four fields. Two specs here
used to carry a field that is not one of the four, and `vim.pack` ignored both
without a word. One of those two cost me a working fzf extension I did not know
was missing. I removed both and replaced the second with a `PackChanged` hook.

The other thing worth knowing is when `plugin/` directories load. It is not
during `init.lua`.

## The Spec Has Four Fields

`:h vim.pack.Spec` lists `src`, `name`, `version`, and `data`. Anything else in
the table is not read. It is not rejected and there is no warning. It is
ignored.

`lua/plugins/kulala.lua` used to carry a fifth.

```lua
vim.pack.add({
	{
		src = 'https://github.com/mistweaverco/kulala.nvim',
		ft = { 'http', 'rest' },
	},
})

require('kulala').setup({
	global_keymaps = true,
})
```

`ft` reads like lazy loading, because it is the field lazy.nvim uses for it.
Here it did nothing. `add` put the directory on the runtimepath and returned,
and the `setup()` on the next line ran during startup like every other
module's. I checked by starting the config headless and asking whether the
module was already in `package.loaded`. It was.

I removed the `ft` line. The plugin was loading eagerly anyway, because the
module requires it directly. A field that changes nothing is worse than no
field: it suggests a mechanism that is not there.

The second one had a consequence.

## The Extension That Was Never Built

```lua
vim.pack.add({
	{ src = 'https://github.com/nvim-telescope/telescope.nvim' },
	{
		src = 'https://github.com/nvim-telescope/telescope-fzf-native.nvim',
		build = 'make',
	},
})
```

`build` is a lazy.nvim field too, and `vim.pack` has no build step. Nothing in
this configuration ran `make`, and `telescope-fzf-native.nvim/build/` did not
exist. The extension load is wrapped in `pcall`, which does more than keep the
failure quiet. Without it, the error would abort the rest of `telescope.lua`
and every module after it in `init.lua`.

```lua
pcall(telescope.load_extension, 'fzf')
```

Called without the `pcall`, it failed with `'fzf' extension doesn't exist or
isn't installed`, and underneath that, `dlopen` failing on `build/libfzf.so`.
Telescope still opened and still worked, sorted by its Lua sorter instead of
the native one. That is the entire failure: a different code path and no
message.

I did not find this by noticing that search felt slow. I found it by checking
whether the directory existed.

`vim.pack` has no declarative build field, but it does have `PackChanged`. That
is the supported place to run a build. I removed `build` from the spec and
added a hook in `lua/config/pack.lua`, registered before the first
`vim.pack.add()`:

```lua
vim.api.nvim_create_autocmd('PackChanged', {
	callback = function(ev)
		if
			ev.data.spec.name == 'telescope-fzf-native.nvim'
			and (ev.data.kind == 'install' or ev.data.kind == 'update')
		then
			vim.system({ 'make' }, { cwd = ev.data.path }):wait()
		end
	end,
})
```

`:wait()` is the part that matters. `vim.pack.add` waits for installs to
finish, but `vim.system` without `:wait()` would return before `make` did, so
the extension load a few lines later would still find no `.so`. The hook is
registered before the first `add` because `lock_sync` can install the lockfile
entries that are missing from disk on that first call.

I rebuilt once by running `make` in the plugin directory, and the extension now
loads. The `pcall` stays, because it now guards a build that can fail rather
than one that never happened. The hook only runs on install or update, so it
would not have fixed an already-installed plugin with a missing `build/`; the
manual `make` was the actual repair. It also does not check `make`'s exit code,
so a failed build is still silent. A more robust version would inspect the
result of `:wait()` and notify when `result.code ~= 0`.

## When the Plugin Directory Loads

`vim.pack.add` has a `load` option, and the docs give its default as `false`
during `init.lua` sourcing and `true` afterwards. That timing matters more than
it looks.

Every `vim.pack.add` call that actually runs here runs while `init.lua` is being
sourced, because each one sits at the top of a module that `init.lua` requires.
So `add` behaves like `:packadd!`: the plugin is installed and its directory
joins the runtimepath, but its `plugin/` files and `ftdetect/` scripts are not
sourced at that moment.

They are not lost, either. Neovim's normal startup scan sources them once
`init.lua` has finished, because the directory is on the runtimepath by then.
`:scriptnames` shows the order plainly. On this machine `init.lua` is entry 3.
Entry 4 is already a pack file — the colorscheme, which `:colorscheme` sources
through `packpath`. The first `plugin/` file is entry 8.

The consequence is narrower than it first looks, but it is not nothing. While
`init.lua` runs, a plugin's commands do not exist yet. Most modules here require
the plugin's Lua module directly and call `setup()` themselves, so the timing
does not matter to them. Two are different. `lua/plugins/vim-tmux-navigator.lua`
binds `<C-h>` and the others to the `TmuxNavigate*` commands defined in the
plugin's `plugin/tmux_navigator.vim`. `lua/plugins/nvim-surround.lua` never
calls `setup()`, so its `ys`, `ds`, and `cs` mappings come from
`plugin/nvim-surround.lua`. Both work because a keymap resolves its command when
you press it, not when you set it. But both depend on the deferred scan, which
is the part I had not checked when I first wrote this.

## Commenting Out Is Not Removing

`lua/plugins/zenbones.lua` is an empty call:

```lua
vim.pack.add({
	-- { src = 'https://github.com/zenbones-theme/zenbones.nvim' },
	-- { src = 'https://github.com/rktjmp/lush.nvim' },
})

-- vim.cmd.colorscheme('zenbones')
```

The require in `init.lua` is commented out too. `manila.nvim` is the
colorscheme now. `zenbones.nvim`, `lush.nvim`, and `cutiepro.nvim` are still
installed and still in the lockfile. `vim.pack.get()` returns all forty-two,
thirty-nine of them marked `active = true`. `cutiepro.nvim` has no reference
anywhere in the Lua tree outside the lockfile.

Removing a spec stops it loading. It does not remove it from disk, and it does
not remove its lockfile entry. That takes `vim.pack.del`, which I have not run
here. If I ran it, I would remove the spec first, or the plugin would be
reinstalled on the next start, and I would pass `{ force = true }` if the plugin
were still active.

The empty `add({})` is dead code here: I commented out the `require` at line 36.
If it were the first `vim.pack` call in a session, it would create
`site/pack/core/opt` and run the lockfile sync, installing any lockfile entries
missing from disk. On any later call it does nothing. The empty spec itself
registers no plugin.

## What I Have Not Run

I have not run `vim.pack.update()` or a rollback. The lockfile is what a
rollback would restore from, `vim.pack.update(nil, { target = 'lockfile' })` per
the docs. `vim.pack.add` does not check the revision of an already-installed
plugin, so the lockfile alone does not move an existing checkout to the recorded
revision. But I am not going to describe the buffer or the result of an update I
have not watched happen.

## Related Posts

- [How I Configure Linting in Neovim](/posts/neovim/how-i-configure-linting-in-neovim/)
- [How I Configure Formatting in Neovim](/posts/neovim/how-i-configure-formatting-in-neovim/)
- [How I Wire Completion with nvim-cmp in Neovim](/posts/neovim/how-i-wire-completion-with-nvim-cmp-in-neovim/)
- [How I Keep Shared LSP Policy in One Neovim Module](/posts/neovim/how-i-keep-shared-lsp-policy-in-one-neovim-module/)
- [How I Configure Lua Language Server with Mason in Neovim](/posts/neovim/how-i-configure-lua-language-server-with-mason-in-neovim/)
- [How I Structure My Neovim Configuration by Concern](/posts/neovim/how-i-structure-my-neovim-configuration-by-concern/)
- [The Zsh Configuration I Can Reason About](/posts/shell/the-zsh-configuration-i-can-reason-about/)
- [Restructuring My Tmux Configuration by Reason for Change](/posts/shell/restructuring-my-tmux-configuration-by-reason-for-change/)
- [Forty-Four Lines of WezTerm Configuration](/posts/terminal/forty-four-lines-of-wezterm-configuration/)

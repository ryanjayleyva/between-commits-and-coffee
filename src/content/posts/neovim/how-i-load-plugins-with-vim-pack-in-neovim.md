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

This configuration runs on Neovim 0.12.6. `vim.pack` is new in 0.12 and is
still documented as experimental, so the API may change. It also needs `git` on
`PATH`.

## TL;DR

`vim.pack.add` takes a list of specs, and a spec has four fields. Two specs here
used to carry a field outside those four, and `vim.pack` ignored both without a
warning. The second one cost me a working fzf extension I did not know was
missing. Both fields are gone, and the second is now a `PackChanged` hook.

The other detail worth knowing is when `plugin/` directories load. It is not
during `init.lua`.

## The Spec Has Four Fields

`:h vim.pack.Spec` lists `src`, `name`, `version`, and `data`. Anything else in
the table is not read, not rejected, and not warned about.

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
module's. Starting the configuration headless and asking whether the module was
already in `package.loaded` showed that it was.

The `ft` line is gone. The plugin was loading eagerly anyway, because the
module requires it directly. A field that changes nothing is worse than no
field, because it suggests a mechanism that is not there.

The second field had a visible effect, though not an obvious one.

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
the native one, with no message to say the extension had not loaded.

The failure did not show up as slowness. It turned up in a check of whether the
directory existed.

`vim.pack` has no declarative build field, but it does have `PackChanged`,
which is the supported place to run a build. The spec no longer carries
`build`. A hook in `lua/config/pack.lua`, registered before the first
`vim.pack.add()`, runs the build instead.

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

The `:wait()` call is what makes the hook synchronous. `vim.pack.add` waits for
installs to finish, but `vim.system` without `:wait()` would return before
`make` did, so the extension load a few lines later would still find no `.so`.
The hook is registered before the first `add` because `lock_sync` can install
the lockfile entries that are missing from disk on that first call.

A manual `make` in the plugin directory repaired it, and the extension now
loads. The `pcall` stays, because it now guards a build that can fail rather
than one that never happened. The hook only runs on install or update, so it
would not repair an already-installed plugin with a missing `build/`. The
manual `make` was the actual repair. It also does not check `make`'s exit code,
so a failed build is still silent. A more robust version would inspect the
result of `:wait()` and notify when `result.code ~= 0`.

## When the Plugin Directory Loads

`vim.pack.add` has a `load` option, and the docs give its default as `false`
during `init.lua` sourcing and `true` afterwards. That default decides which
loading behavior this configuration gets.

Every `vim.pack.add` call that actually runs here runs while `init.lua` is being
sourced, because each one sits at the top of a module that `init.lua` requires.
So `add` behaves like `:packadd!`. The plugin is installed and its directory
joins the runtimepath, but its `plugin/` files and `ftdetect/` scripts are not
sourced at that moment.

They are sourced later. Neovim's normal startup scan picks them up once
`init.lua` has finished, because the directory is on the runtimepath by then.
`:scriptnames` shows the order plainly. On this machine `init.lua` is entry 3.
Entry 4 is already the colorscheme file, a pack file that `:colorscheme` sources
through `packpath`. The first `plugin/` file is entry 8.

The consequence is limited but real. While `init.lua` runs, a plugin's commands
do not exist yet. Most modules here require the plugin's Lua module directly and
call `setup()` themselves, so the timing does not matter to them. Two do
something else. `lua/plugins/vim-tmux-navigator.lua` binds `<C-h>` and the others
to the `TmuxNavigate*` commands defined in the plugin's
`plugin/tmux_navigator.vim`. `lua/plugins/nvim-surround.lua` never calls
`setup()`, so its `ys`, `ds`, and `cs` mappings come from
`plugin/nvim-surround.lua`. Both work because a keymap resolves its command when
it is pressed, not when it is set. Both also depend on the deferred scan, which
is easy to miss.

## What Commenting Out Leaves Behind

`lua/plugins/zenbones.lua` is an empty call.

```lua
vim.pack.add({
	-- { src = 'https://github.com/zenbones-theme/zenbones.nvim' },
	-- { src = 'https://github.com/rktjmp/lush.nvim' },
})

-- vim.cmd.colorscheme('zenbones')
```

The require in `init.lua` is commented out too. `manila.nvim` is the colorscheme
now. `zenbones.nvim`, `lush.nvim`, and `cutiepro.nvim` are still installed and
still in the lockfile. `vim.pack.get()` returns all forty-two, thirty-nine of
them marked `active = true`. `cutiepro.nvim` has no reference anywhere in the
Lua tree outside the lockfile.

Removing a spec stops the plugin loading. It does not remove it from disk or
from the lockfile. That takes `vim.pack.del`, which I have not run here. The
spec has to go first, or `add` reinstalls the plugin on the next start, and an
active plugin also needs `{ force = true }`.

The empty `add({})` is dead code here, because the `require` at line 36 is
commented out. If it were the first `vim.pack` call in a session, it would
create `site/pack/core/opt` and run the lockfile sync, installing any lockfile
entries missing from disk. On any later call it does nothing.

## Conclusion

`vim.pack` is a small surface made of a spec with four fields, an `add` call, a
lockfile, and one autocommand hook. The differences from lazy.nvim are small
and specific. `ft` and `build` were ignored because a spec is data, not a
loading policy. The build had to move into a hook, and the hook only runs when
the plugin is installed or updated. The plugin directories loaded after
`init.lua`, which was harmless here because the modules load Lua directly or
resolve commands at press time. Commenting out a spec stopped the plugin
loading without removing it.

The configuration works because each of those behaviors is accounted for now,
not because `vim.pack` behaves like lazy.nvim.

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

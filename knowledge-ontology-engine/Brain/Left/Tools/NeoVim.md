---
nodeId: 2358139b-4fdd-43b7-ba42-a3bf6cb5f763
name: NeoVim
tags: [neovim, lua, AI, Tools, vim, Linux]
children: []
---

# NeoVim

# 2026, Neovim setting.

### Prerequisites

* **Neovim v0.10.0 ~**
* **Nerd Font**
* **Ripgrep (rg)**
* **C Compiler & Rust (Cargo)**
* **Node.js**

---

### Directory structure | Lazy.nvim


```
~/.config/nvim/
├── init.lua           # 진입점
├── lua/
│   ├── config/        # 기본 옵션 및 키맵
│   │   ├── lazy.lua   # 플러그인 매니저 설정
│   │   ├── options.lua
│   │   └── keymaps.lua
│   └── plugins/       # 플러그인 명세 (여기에 파일을 추가하면 자동 로드됨)
│       ├── ui.lua
│       ├── coding.lua
│       ├── editor.lua
│       └── ...

```

`init.lua`

```lua
-- ~/.config/nvim/init.lua
require("config.options")
require("config.keymaps")
require("config.lazy")

```

`lua/config/lazy.lua`


```lua
-- ~/.config/nvim/lua/config/lazy.lua
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git", "clone", "--filter=blob:none",
    "[https://github.com/folke/lazy.nvim.git](https://github.com/folke/lazy.nvim.git)", "--branch=stable", lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  spec = {
    { import = "plugins" }, -- lua/plugins 폴더 내의 모든 파일을 자동으로 불러옴
  },
  checker = { enabled = true }, -- 플러그인 업데이트 자동 확인
})

```


### Snacks.nvim


`lua/plugins/snacks.lua`

```lua
return {
  "folke/snacks.nvim",
  priority = 1000,
  lazy = false,
  opts = {
    bigfile = { enabled = true }, -- 큰 파일 열 때 성능 최적화
    dashboard = { enabled = true }, -- 예쁜 시작 화면
    notifier = { enabled = true }, -- 우측 상단 알림 메시지
    quickfile = { enabled = true },
    statuscolumn = { enabled = true },
    words = { enabled = true },
  },
  keys = {
    -- 자주 쓰는 기능 키매핑
    { "<leader>g", function() Snacks.lazygit() end, desc = "Lazygit" },
    { "<leader>t", function() Snacks.terminal() end, desc = "Toggle Terminal" },
    { "<leader>ff", function() Snacks.picker.files() end, desc = "Find Files" },
    { "<leader>fg", function() Snacks.picker.grep() end, desc = "Grep Text" },
    { "<leader>bd", function() Snacks.bufdelete() end, desc = "Delete Buffer" },
  },
}

```

### Blink.cmp (vs nvim-cmp)


`lua/plugins/coding.lua`

```lua
return {
  {
    "saghen/blink.cmp",
    version = "*",
    opts = {
      keymap = { preset = "default" }, -- Enter 선택, Tab 이동 등 표준
      appearance = {
        use_nvim_cmp_as_default = true,
        nerd_font_variant = "mono",
      },
      sources = {
        default = { "lsp", "path", "snippets", "buffer" },
      },
      -- 서명 도움말(Signature Help)도 자동 지원
    },
  },
}

```



### Avante.nvim (for vibe coding)

#### `lua/plugins/ai.lua`

```lua
return {
  "yetone/avante.nvim",
  event = "VeryLazy",
  lazy = false,
  build = "make", -- 윈도우 사용자는 문서 참고
  opts = {
    provider = "claude", -- 본인 플랜 및 api-key 있어야 함.
    auto_suggestions_provider = "claude",
  },
  dependencies = {
    "stevearc/dressing.nvim",
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
  },
}

```



### [Language Server Protocol (LSP)](https://neovim.io/doc/user/lsp.html) (Oil & Mason)


`lua/plugins/editor.lua`

```lua
return {
  {
    "stevearc/oil.nvim",
    opts = {},
    keys = {
      { "-", "<CMD>Oil<CR>", desc = "Open Parent Directory" },
    },
    dependencies = { "nvim-tree/nvim-web-devicons" },
  },
  {
    "neovim/nvim-lspconfig",
    dependencies = { 
      "mason-org/mason.nvim", 
      "mason-org/mason-lspconfig.nvim", 
      "saghen/blink.cmp" 
    },
    config = function()
      require("mason").setup()
      require("mason-lspconfig").setup({
        ensure_installed = { "lua_ls", "ts_ls", "pyright", "rust_analyzer" },
        automatic_installation = true,
      })
      
      local lspconfig = require("lspconfig")
      -- Blink.cmp의 기능을 LSP에 주입
      local capabilities = require("blink.cmp").get_lsp_capabilities()
      
      require("mason-lspconfig").setup_handlers({
        function(server_name)
          lspconfig[server_name].setup({ capabilities = capabilities })
        end,
      })
    end,
  },
  {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    config = function()
      require("nvim-treesitter.configs").setup({
        ensure_installed = { "lua", "vim", "javascript", "typescript", "python", "markdown" },
        highlight = { enable = true },
      })
    end,
  },
}

```


**Happy Vimming!**
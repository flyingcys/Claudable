# Codex CLI 模型列表写死位置

## 结论

当前页面里看到的 `Codex CLI` 模型列表不是运行时从 `codex` 命令动态拉取的，而是仓库内的前后端常量表写死出来的。

真正的源头文件是：

- `lib/constants/codexModels.ts`

你要改 `codex` 下拉框里显示哪些模型，优先改这里，不要先去改页面组件。

## 当前写死内容

`lib/constants/codexModels.ts` 里定义了：

- 默认模型：`CODEX_DEFAULT_MODEL = 'gpt-5'`
- 模型列表：`CODEX_MODEL_DEFINITIONS`
- 模型归一化：`normalizeCodexModelId`
- 展示名映射：`getCodexModelDisplayName`

当前这份列表里写死的模型有：

- `gpt-5`
- `gpt-4o`
- `gpt-4o-mini`
- `o1-preview`
- `o1-mini`
- `claude-3.5-sonnet`
- `claude-3-haiku`

所以你现在页面上看到的旧模型，本质上就是这里的旧常量还没更新。

## 前端和接口怎么用到它

虽然项目里有多个地方出现 `models`，但 `codex` 的模型源头基本都回到同一套常量：

### 1. 统一模型入口

- `lib/constants/cliModels.ts`

这里把 `codex` 绑定到：

- `CODEX_DEFAULT_MODEL`
- `CODEX_MODEL_DEFINITIONS`
- `normalizeCodexModelId`
- `getCodexModelDisplayName`

所以大部分页面不是各自写死模型，而是通过 `getModelDefinitionsForCli('codex')` 间接读取。

### 2. 设置页和创建项目弹窗

下面这些地方虽然各自维护了 `CLI_OPTIONS`，但 `codex.models` 都是从统一常量生成的：

- `components/settings/GlobalSettings.tsx`
- `components/modals/CreateProjectModal.tsx`
- `types/cli.ts`

这些文件本身不是模型列表的真实来源，只是消费方。

### 3. 首页和聊天页

- `lib/utils/cliOptions.ts`
- `app/page.tsx`
- `app/[project_id]/chat/page.tsx`

这里通过 `ACTIVE_CLI_MODEL_OPTIONS` 再把模型整理成页面需要的选项结构，源头仍然是 `getModelDefinitionsForCli('codex')`。

### 4. CLI 状态接口

- `app/api/settings/cli-status/route.ts`

这个接口返回 `codex` 的 `models` 时，用的也是：

```ts
CODEX_MODEL_DEFINITIONS.map(model => model.id)
```

所以接口层同样不是动态探测 CLI 可用模型，而是继续复用写死的常量列表。

## 你真正需要改哪里

如果只是想更新 `Codex CLI` 的模型列表，通常只需要改：

- `lib/constants/codexModels.ts`

重点看这几个位置：

### 1. 修改模型列表

改 `CODEX_MODEL_DEFINITIONS`。

这里决定：

- 页面下拉框显示哪些模型
- 每个模型显示什么名称
- 描述文案是什么
- 是否标记 `supportsImages`

### 2. 修改默认模型

改 `CODEX_DEFAULT_MODEL`。

如果你希望新项目或旧配置兜底时默认落到新模型，这里要一起改。

### 3. 维护旧 ID 兼容

改 `ALIAS_MAP`。

如果你把旧模型名删掉或重命名，已有项目和已有全局设置里可能还保存着旧的 `selectedModel`。这时 `normalizeCodexModelId` 会按 `ALIAS_MAP` 做兼容映射；如果映射不到，就会直接回退到 `CODEX_DEFAULT_MODEL`。

这意味着：

- 只是新增模型：通常改 `CODEX_MODEL_DEFINITIONS` 即可
- 替换旧模型 ID：最好同步补 `ALIAS_MAP`
- 改默认模型：同步改 `CODEX_DEFAULT_MODEL`

## 不建议先改的地方

下面这些文件看起来也像“模型列表”，但不建议把它们当第一修改点：

- `components/settings/GlobalSettings.tsx`
- `components/modals/CreateProjectModal.tsx`
- `types/cli.ts`
- `app/api/settings/cli-status/route.ts`

原因是它们多数只是从 `codexModels.ts` 派生数据。只改这些消费方，会导致别的页面、接口返回或旧数据归一化逻辑不同步。

## 推荐修改方式

建议按这个顺序改：

1. 先改 `lib/constants/codexModels.ts`
2. 如果有旧模型改名或下线，再补 `ALIAS_MAP`
3. 如果默认模型也要切，再改 `CODEX_DEFAULT_MODEL`
4. 启动页面后检查以下位置是否一起更新：
   - 全局设置里的 Codex 模型下拉框
   - 创建项目弹窗里的 Codex 模型下拉框
   - 首页助手模型切换
   - 项目聊天页模型切换

## 一句话判断

如果你的目标是“把页面上 Codex CLI 的老模型列表换掉”，最先改、也最应该改的文件就是：

`lib/constants/codexModels.ts`

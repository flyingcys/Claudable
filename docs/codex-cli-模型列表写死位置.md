# Codex CLI 模型列表来源

## 结论

当前项目里 `Codex CLI` 的模型列表仍然是仓库内静态配置，不是运行时从 `codex` 命令动态探测。

但真实来源已经不是 `lib/constants/codexModels.ts` 本身，而是下面两层：

- `config/cli-models/codex.json`
- `lib/constants/modelRegistry.ts`

其中：

- `config/cli-models/codex.json` 是模型数据源，定义默认模型、模型列表、alias
- `lib/constants/modelRegistry.ts` 负责加载 JSON、做归一化、展示名查询和统一访问
- `lib/constants/codexModels.ts` 现在只是兼容旧调用方的薄封装，不再是模型真源头

## 现在该看哪里

如果你要调整 `Codex CLI` 模型列表，优先检查：

1. `config/cli-models/codex.json`
2. `lib/constants/modelRegistry.ts`

通常只需要改 `codex.json`；只有在读取逻辑、归一化逻辑或统一访问方式需要变化时，才需要动 `modelRegistry.ts`。

## 兼容层和消费方关系

### 兼容层

- `lib/constants/codexModels.ts`

这个文件保留了旧的导出名，例如：

- `CODEX_MODEL_DEFINITIONS`
- `CODEX_DEFAULT_MODEL`
- `normalizeCodexModelId`
- `getCodexModelDisplayName`

但这些导出已经转为调用 registry，不应再把这里当成模型数据维护入口。

### 统一入口

- `lib/constants/cliModels.ts`

这里向消费方暴露统一 helper，例如：

- `getModelDefinitionsForCli('codex')`
- `getDefaultModelForCli('codex')`
- `normalizeModelId('codex', value)`
- `getModelDisplayName('codex', value)`

### 典型消费方

下面这些位置读取的都是 registry 派生结果，不应该再各自维护一份模型真相：

- `types/cli.ts`
- `app/api/settings/cli-status/route.ts`
- `lib/utils/cliOptions.ts`
- `app/page.tsx`
- `app/[project_id]/chat/page.tsx`

## 一句话判断

如果目标是“修改页面和接口看到的 Codex CLI 模型列表”，应该优先改：

- `config/cli-models/codex.json`

如果只是排查旧调用方为什么还能拿到模型列表，再看：

- `lib/constants/codexModels.ts`

因为它现在只是 registry 的兼容薄封装。

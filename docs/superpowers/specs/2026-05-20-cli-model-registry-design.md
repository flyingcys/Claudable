# CLI 模型静态 JSON 注册表设计

## 背景

当前项目里各个 CLI 的模型列表、默认模型、别名归一化逻辑分散在多个 TypeScript 常量文件中，例如：

- `lib/constants/claudeModels.ts`
- `lib/constants/codexModels.ts`
- `lib/constants/cursorModels.ts`
- `lib/constants/qwenModels.ts`
- `lib/constants/glmModels.ts`
- `lib/constants/cliModels.ts`

这套实现能工作，但模型更新成本偏高。只要模型列表变动，就需要修改源码、重新检查多个消费点，并承担前后端遗漏同步的风险。

本次目标是把“模型定义”从源码常量迁移到仓库内静态 `json` 文件，后续模型更新只改配置文件，重启服务即可生效。

## 目标

- 所有 CLI 的模型定义统一从仓库内静态 `json` 读取。
- 前端展示、默认值、接口返回、模型归一化全部收敛到同一套 registry helper。
- 保留历史模型 ID 的兼容映射，避免旧项目设置失效。
- 不引入数据库 schema 变更。
- 不要求运行时热更新；修改配置后重启服务生效即可。

## 非目标

- 本次不把 `codex reasoning` 配置迁移到 `json`。
- 本次不把 `cursor`、`codex` 等 provider 的 CLI 参数拼装逻辑迁移到 `json`。
- 本次不接入外部远程配置中心。
- 本次不做“无需重启立即生效”的动态配置加载。

## 当前问题

当前模型配置虽然已有统一消费入口，但仍然存在多源头问题：

1. `lib/constants/cliModels.ts` 汇总了大部分模型默认值与展示数据。
2. `types/cli.ts` 再次直接消费各家模型常量，形成第二套入口。
3. `app/api/settings/cli-status/route.ts` 直接引用 `CODEX_MODEL_DEFINITIONS`、`CURSOR_MODEL_DEFINITIONS`、`QWEN_MODEL_DEFINITIONS`、`GLM_MODEL_DEFINITIONS` 返回接口数据。
4. `gemini` 模型定义直接写在 `lib/constants/cliModels.ts` 内，没有独立配置文件。

结果是：即使某个页面已经改成新的模型来源，接口层或其他页面仍可能保留旧的写死数据。

## 方案对比

### 方案 A：单一文件 `config/cli-models.json`

优点：

- 入口唯一。
- 初期实现最直接。

缺点：

- 所有 CLI 模型挤在一个文件里，后续维护冲突大。
- 某一家模型更新时 diff 噪声较多。

### 方案 B：分文件 `config/cli-models/<cli>.json`

优点：

- 每个 CLI 边界清晰。
- 后续更新单个 CLI 时改动面最小。
- 更适合 alias 较多、模型列表差异较大的 provider。

缺点：

- 需要一个额外的 registry 层统一加载。

### 方案 C：仅 Codex 改成 `json`，其他 CLI 维持 TypeScript

优点：

- 改动最小。

缺点：

- 会长期并存两套机制。
- 无法满足“所有模型配置外置”的目标。

### 结论

采用方案 B：每个 CLI 一份静态 `json`，由统一 registry 读取与归一化。

## 配置文件布局

新增目录：

- `config/cli-models/claude.json`
- `config/cli-models/codex.json`
- `config/cli-models/cursor.json`
- `config/cli-models/qwen.json`
- `config/cli-models/glm.json`
- `config/cli-models/gemini.json`

新增统一入口：

- `lib/constants/modelRegistry.ts`

## JSON 结构

每个 CLI 配置文件结构保持一致：

```json
{
  "cli": "codex",
  "defaultModel": "gpt-5.5",
  "models": [
    {
      "id": "gpt-5.5",
      "name": "GPT-5.5",
      "description": "Newest frontier Codex model for complex coding workflows",
      "supportsImages": true,
      "aliases": ["gpt5", "gpt-5", "gpt-5.0"]
    }
  ]
}
```

字段约束：

- `cli`: CLI 标识，必须与文件名和系统内 CLI id 一致。
- `defaultModel`: 默认模型 id，必须出现在 `models[].id` 中。
- `models[]`: 当前 CLI 可展示的模型列表。
- `models[].id`: 规范模型 id，用于持久化与传参。
- `models[].name`: UI 展示名。
- `models[].description`: 可选描述。
- `models[].supportsImages`: 可选布尔值。
- `models[].aliases`: 可选别名数组，用于兼容历史配置和宽松输入。

## Registry 设计

`lib/constants/modelRegistry.ts` 负责静态导入所有 `json`，并构建统一能力：

- `getDefaultModelForCli(cli)`
- `getModelDefinitionsForCli(cli)`
- `normalizeModelId(cli, model)`
- `getModelDisplayName(cli, modelId)`
- `getAllModelDefinitionsByCli()`

内部职责：

1. 统一加载每个 CLI 的配置文件。
2. 校验 `defaultModel` 是否存在于 `models`。
3. 为每个 CLI 生成 alias map。
4. 统一处理大小写、空格、下划线等常见归一化规则。
5. 未命中时回退到该 CLI 的 `defaultModel`。

`normalizeModelId` 规则建议保持现有兼容行为：

- 先做 `trim()`
- 转小写
- 把空格和下划线归一到 `-`
- 先匹配 alias，再匹配规范 id
- 未命中则回退默认模型

## 代码迁移边界

### 保留的职责

- `lib/constants/codexReasoning.ts` 继续负责 `reasoning` 定义和归一化。
- `lib/services/cli/cursor.ts` 中的 provider 特殊模型映射逻辑继续保留在 TypeScript。
- `lib/services/cli/codex.ts` 的 CLI 参数组装继续保留在 TypeScript。

### 需要切换到 registry 的入口

- `lib/constants/cliModels.ts`
- `types/cli.ts`
- `lib/utils/cliOptions.ts`
- `contexts/GlobalSettingsContext.tsx`
- `components/settings/GlobalSettings.tsx`
- `components/modals/CreateProjectModal.tsx`
- `hooks/useCLI.ts`
- `app/page.tsx`
- `app/[project_id]/chat/page.tsx`
- `app/api/settings/cli-status/route.ts`
- `app/api/projects/route.ts`
- `lib/services/project.ts`
- 其他通过 `getDefaultModelForCli`、`normalizeModelId`、`getModelDefinitionsForCli` 间接消费模型定义的文件

### 兼容策略

为降低改动风险，第一阶段允许保留旧文件名，但内容改成薄封装：

- `claudeModels.ts`
- `codexModels.ts`
- `cursorModels.ts`
- `qwenModels.ts`
- `glmModels.ts`

这些文件内部不再保存自己的模型数据，只转调 registry，供旧调用方平滑过渡。

第二阶段若确认没有额外价值，再考虑删除这些薄封装。

## 测试策略

至少补充以下测试：

1. 每个 CLI 的 `defaultModel` 能正确读取。
2. `normalizeModelId` 对 alias 能正确归一化。
3. 非法模型值会回退到该 CLI 默认模型。
4. `getModelDefinitionsForCli` 会返回来自 `json` 的模型列表。
5. `gemini` 也走 registry，不再保留硬编码例外。
6. 现有 `codex reasoning` 测试继续通过，证明本次没有误伤行为配置。

优先保留和扩展现有纯逻辑测试，例如：

- `tests/codex-settings.test.ts`

必要时新增更通用的测试文件，例如：

- `tests/cli-model-registry.test.ts`

## 实施步骤

1. 新增 `config/cli-models/*.json`，把现有模型数据迁移进去。
2. 新增 `lib/constants/modelRegistry.ts`，实现统一读取与归一化。
3. 改造 `lib/constants/cliModels.ts`，改为基于 registry 输出通用 helper。
4. 改造 `types/cli.ts` 与 `app/api/settings/cli-status/route.ts`，消除直接依赖各家模型常量的代码路径。
5. 让旧的 `<provider>Models.ts` 文件变为薄封装，保证现有引用不立即爆炸。
6. 补测试并验证默认模型、alias、接口输出和页面模型列表。
7. 手动检查全局设置、创建项目弹窗、首页助手入口、项目聊天页的模型下拉是否一致。

## 风险与控制

### 风险 1：只改前端，不改接口

后果：

- UI 看起来已切换新模型，但 `/api/settings/cli-status` 仍返回旧模型列表。

控制方式：

- 接口层也必须通过 registry 获取模型列表。

### 风险 2：旧项目保存的模型 id 失效

后果：

- 历史项目打开后，模型选择异常回退或显示空值。

控制方式：

- 完整迁移现有 alias，保证历史值仍能归一到新模型。

### 风险 3：`gemini` 继续成为特例

后果：

- “所有模型配置都在 json” 目标不成立。

控制方式：

- 本次把 `gemini` 一并迁移到 `config/cli-models/gemini.json`。

### 风险 4：把行为逻辑也误塞进 json

后果：

- 配置边界失控，后续可维护性下降。

控制方式：

- 本次仅迁移纯模型数据，不迁移 CLI 行为逻辑。

## 验收标准

- 新增或替换模型时，不需要修改 TypeScript 模型常量源码。
- 修改 `config/cli-models/*.json` 后，重启服务即可看到新模型列表。
- 全局设置、创建项目弹窗、首页助手、聊天页、CLI 状态接口使用同一套模型数据源。
- 历史 `selectedModel` 在常见旧值输入下仍可正常归一化。
- `codex reasoning` 与其他 CLI 特殊行为逻辑保持不变。

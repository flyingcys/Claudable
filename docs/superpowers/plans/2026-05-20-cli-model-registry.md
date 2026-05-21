# CLI 模型静态 JSON 注册表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前分散在 TypeScript 常量里的各 CLI 模型定义迁移到仓库内静态 `json` 文件，并由统一 registry 提供默认模型、模型列表、显示名和 alias 归一化能力。

**Architecture:** 在 `config/cli-models/` 下为每个 CLI 提供一份独立 `json` 文件，`lib/constants/modelRegistry.ts` 统一加载这些配置并暴露通用 helper。现有 `cliModels.ts` 和各家 `<provider>Models.ts` 变成 registry 的消费层或薄封装，前端类型、接口和服务代码都改为走同一模型来源。

**Tech Stack:** Next.js 15 App Router、TypeScript、Node 22 test runner、仓库内静态 JSON 配置。

---

## 文件结构

- Create: `config/cli-models/claude.json`
- Create: `config/cli-models/codex.json`
- Create: `config/cli-models/cursor.json`
- Create: `config/cli-models/qwen.json`
- Create: `config/cli-models/glm.json`
- Create: `config/cli-models/gemini.json`
- Create: `lib/constants/modelRegistry.ts`
- Create: `tests/cli-model-registry.test.ts`
- Modify: `lib/constants/cliModels.ts`
- Modify: `lib/constants/claudeModels.ts`
- Modify: `lib/constants/codexModels.ts`
- Modify: `lib/constants/cursorModels.ts`
- Modify: `lib/constants/qwenModels.ts`
- Modify: `lib/constants/glmModels.ts`
- Modify: `types/cli.ts`
- Modify: `app/api/settings/cli-status/route.ts`
- Modify: `docs/codex-cli-模型列表写死位置.md`

文件职责：

- `config/cli-models/*.json`: 纯数据源，保存默认模型、展示名、描述和 alias。
- `lib/constants/modelRegistry.ts`: 统一读取和归一化模型配置的唯一入口。
- `lib/constants/cliModels.ts`: 面向项目其余模块的通用 helper 聚合层。
- `lib/constants/<provider>Models.ts`: 兼容现有 import 路径的薄封装。
- `tests/cli-model-registry.test.ts`: registry 纯逻辑回归测试。
- `types/cli.ts`: CLI 下拉配置改为从 registry 派生。
- `app/api/settings/cli-status/route.ts`: CLI 状态接口返回的模型列表改为从 registry 派生。
- `docs/codex-cli-模型列表写死位置.md`: 修正文档里“模型列表写死在 `codexModels.ts`”的旧结论。

### Task 1: 建立 JSON 配置与 registry 失败测试

**Files:**
- Create: `tests/cli-model-registry.test.ts`
- Create: `config/cli-models/claude.json`
- Create: `config/cli-models/codex.json`
- Create: `config/cli-models/cursor.json`
- Create: `config/cli-models/qwen.json`
- Create: `config/cli-models/glm.json`
- Create: `config/cli-models/gemini.json`

- [ ] **Step 1: 写 registry 失败测试**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

const {
  getCliModelConfig,
  getDefaultModelForCli,
  getModelDefinitionsForCli,
  normalizeModelId,
  getModelDisplayName,
} = await import(new URL('../lib/constants/modelRegistry.ts', import.meta.url).href);

test('codex 默认模型来自 json 配置', () => {
  assert.equal(getDefaultModelForCli('codex'), 'gpt-5.5');
});

test('claude alias 会归一到规范 id', () => {
  assert.equal(normalizeModelId('claude', 'claude-3.5-sonnet'), 'claude-sonnet-4-6');
});

test('未知模型回退到对应 cli 默认值', () => {
  assert.equal(normalizeModelId('qwen', 'unknown-model'), 'qwen3-coder-plus');
});

test('gemini 模型列表来自 json，不再是 cliModels.ts 内联常量', () => {
  const ids = getModelDefinitionsForCli('gemini').map((item: { id: string }) => item.id);
  assert.deepEqual(ids, ['gemini-2.5-pro', 'gemini-2.5-flash']);
});

test('显示名走 registry，而不是 provider 私有常量', () => {
  assert.equal(getModelDisplayName('glm', 'glm'), 'GLM 4.6');
});

test('registry 能返回原始 cli 配置', () => {
  const config = getCliModelConfig('cursor');
  assert.equal(config.cli, 'cursor');
  assert.equal(config.defaultModel, 'gpt-5');
  assert.equal(config.models[1].id, 'sonnet-4');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk proxy node --test --experimental-transform-types tests/cli-model-registry.test.ts`  
Expected: FAIL，报错找不到 `../lib/constants/modelRegistry.ts`

- [ ] **Step 3: 写入 6 份静态 JSON 配置**

`config/cli-models/codex.json`

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
      "aliases": ["gpt5", "gpt_5", "gpt-5", "gpt-5.0", "gpt-4o", "claude-sonnet-3.5", "claude35-sonnet"]
    },
    {
      "id": "gpt-5.4",
      "name": "GPT-5.4",
      "description": "Strong default fallback when GPT-5.5 is unavailable",
      "supportsImages": true,
      "aliases": ["gpt54", "gpt_5_4", "o1-preview"]
    },
    {
      "id": "gpt-5.4-mini",
      "name": "GPT-5.4 Mini",
      "description": "Faster and lighter GPT-5.4 variant",
      "supportsImages": true,
      "aliases": ["gpt54mini", "gpt-5.4mini", "gpt_5_4_mini", "gpt-4o-mini", "o1-mini", "claude-3-haiku"]
    },
    {
      "id": "gpt-5.3-codex",
      "name": "GPT-5.3 Codex",
      "description": "Research-preview Codex-tuned model for fast iterations",
      "supportsImages": true,
      "aliases": ["gpt53codex", "gpt-5.3-codex-spark", "gpt-5.3-codex-spark-preview"]
    },
    {
      "id": "gpt-5.2",
      "name": "GPT-5.2",
      "description": "Stable earlier GPT-5 generation for compatibility",
      "supportsImages": true,
      "aliases": ["gpt52", "gpt_5_2"]
    }
  ]
}
```

`config/cli-models/claude.json`

```json
{
  "cli": "claude",
  "defaultModel": "claude-sonnet-4-6",
  "models": [
    {
      "id": "claude-opus-4-6",
      "name": "Claude Opus 4.6",
      "description": "The most intelligent model for building agents and coding",
      "supportsImages": true,
      "aliases": ["claude-opus-4.6", "claude-opus-4", "claude-opus", "opus-4.6", "opus-4", "opus", "claude-opus-4-5-20251101", "claude-opus-4-5", "claude-opus-4.5", "claude-opus-4-1-20250805", "claude-opus-4-1", "claude-opus-4.1", "claude-3-opus", "claude-3-opus-20240229", "claude-3-opus-latest"]
    },
    {
      "id": "claude-sonnet-4-6",
      "name": "Claude Sonnet 4.6",
      "description": "The best combination of speed and intelligence",
      "supportsImages": true,
      "aliases": ["claude-sonnet-4.6", "claude-sonnet-4", "claude-sonnet", "sonnet-4.6", "sonnet-4", "sonnet", "claude-sonnet-4-5-20250929", "claude-sonnet-4-5", "claude-sonnet-4.5", "claude-3.5-sonnet", "claude-3-5-sonnet", "claude-3-5-sonnet-20241022", "claude-3-5-sonnet-latest"]
    },
    {
      "id": "claude-haiku-4-5-20251001",
      "name": "Claude Haiku 4.5",
      "description": "The fastest model with near-frontier intelligence",
      "supportsImages": true,
      "aliases": ["claude-haiku-4-5", "claude-haiku-4.5", "claude-haiku-4", "claude-haiku", "haiku-4-5-20251001", "haiku-4-5", "haiku-4.5", "haiku-4", "haiku", "claude-3-haiku", "claude-3-haiku-20240307", "claude-3-haiku-latest", "claude-haiku-3.5"]
    }
  ]
}
```

`config/cli-models/cursor.json`

```json
{
  "cli": "cursor",
  "defaultModel": "gpt-5",
  "models": [
    {
      "id": "gpt-5",
      "name": "GPT-5",
      "description": "Cursor Agent default multi-model router (auto-selects best model)",
      "aliases": ["gpt5", "gpt-5.0"]
    },
    {
      "id": "sonnet-4",
      "name": "Claude Sonnet 4",
      "description": "Anthropic Claude Sonnet via Cursor Agent router",
      "aliases": ["sonnet4", "sonnet-4.5", "sonnet-45", "claude-sonnet-4.5", "claude-sonnet-45", "claude-sonnet-4_5", "claude-sonnet-4", "opus-4.6", "opus-4.1", "claude-opus-4.6", "claude-opus-4.1", "claude-opus-46", "claude-opus-41", "claude-opus-4_6", "claude-opus-4_1"]
    },
    {
      "id": "sonnet-4-thinking",
      "name": "Claude Sonnet 4 (Thinking)",
      "description": "High-depth Claude Sonnet reasoning mode",
      "aliases": ["sonnet-4.0-thinking", "claude-sonnet-4-thinking"]
    }
  ]
}
```

`config/cli-models/qwen.json`

```json
{
  "cli": "qwen",
  "defaultModel": "qwen3-coder-plus",
  "models": [
    {
      "id": "qwen3-coder-plus",
      "name": "Qwen3 Coder Plus",
      "description": "Balanced 32k context model optimised for coding tasks",
      "aliases": ["qwen3-coder+", "qwen3-plus", "qwen3 coder plus", "qwen-coder-plus", "qwen-coder+", "qwen-plus", "qwen coder plus"]
    },
    {
      "id": "qwen3-coder-pro",
      "name": "Qwen3 Coder Pro",
      "description": "Larger 128k context model with stronger reasoning",
      "aliases": ["qwen3-pro", "qwen3 coder pro", "qwen-coder-pro", "qwen-pro", "qwen coder pro"]
    },
    {
      "id": "qwen3-coder",
      "name": "Qwen3 Coder",
      "description": "Default quick model for fast iteration",
      "aliases": ["qwen3", "qwen coder", "qwen-coder", "qwen"]
    }
  ]
}
```

`config/cli-models/glm.json`

```json
{
  "cli": "glm",
  "defaultModel": "glm-4.6",
  "models": [
    {
      "id": "glm-4.6",
      "name": "GLM 4.6",
      "description": "Zhipu GLM 4.6 with Claude Code compatible agent runtime",
      "supportsImages": false,
      "aliases": ["glm46", "glm-46", "glm_46", "glm 4.6", "glm-4_6", "glm4.6", "glm4", "glm", "glm-latest"]
    }
  ]
}
```

`config/cli-models/gemini.json`

```json
{
  "cli": "gemini",
  "defaultModel": "gemini-2.5-pro",
  "models": [
    {
      "id": "gemini-2.5-pro",
      "name": "Gemini 2.5 Pro",
      "aliases": ["gemini-pro", "gemini-2.5"]
    },
    {
      "id": "gemini-2.5-flash",
      "name": "Gemini 2.5 Flash",
      "aliases": ["gemini-flash"]
    }
  ]
}
```

- [ ] **Step 4: 提交测试和配置脚手架**

```bash
rtk git add tests/cli-model-registry.test.ts config/cli-models/*.json
rtk git commit -m "test: add cli model registry fixtures"
```

### Task 2: 实现统一 modelRegistry，并让 cliModels.ts 改走 registry

**Files:**
- Create: `lib/constants/modelRegistry.ts`
- Modify: `lib/constants/cliModels.ts`
- Test: `tests/cli-model-registry.test.ts`

- [ ] **Step 1: 在 `modelRegistry.ts` 写最小实现**

```ts
import claudeConfig from '@/config/cli-models/claude.json';
import codexConfig from '@/config/cli-models/codex.json';
import cursorConfig from '@/config/cli-models/cursor.json';
import qwenConfig from '@/config/cli-models/qwen.json';
import glmConfig from '@/config/cli-models/glm.json';
import geminiConfig from '@/config/cli-models/gemini.json';

export type CLIKey = 'claude' | 'codex' | 'cursor' | 'gemini' | 'qwen' | 'glm';

export interface RegistryModelDefinition {
  id: string;
  name: string;
  description?: string;
  supportsImages?: boolean;
  aliases?: string[];
}

export interface CliModelConfig {
  cli: CLIKey;
  defaultModel: string;
  models: RegistryModelDefinition[];
}

const RAW_CONFIGS: Record<CLIKey, CliModelConfig> = {
  claude: claudeConfig as CliModelConfig,
  codex: codexConfig as CliModelConfig,
  cursor: cursorConfig as CliModelConfig,
  gemini: geminiConfig as CliModelConfig,
  qwen: qwenConfig as CliModelConfig,
  glm: glmConfig as CliModelConfig,
};

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, '-');

const REGISTRY = Object.fromEntries(
  Object.entries(RAW_CONFIGS).map(([cli, config]) => {
    const knownIds = new Set(config.models.map((model) => model.id));
    if (!knownIds.has(config.defaultModel)) {
      throw new Error(`[modelRegistry] ${cli} defaultModel ${config.defaultModel} missing from models`);
    }
    const aliasMap: Record<string, string> = {};
    config.models.forEach((model) => {
      aliasMap[normalizeKey(model.id)] = model.id;
      model.aliases?.forEach((alias) => {
        aliasMap[normalizeKey(alias)] = model.id;
      });
    });
    return [cli, { config, aliasMap }];
  }),
) as Record<CLIKey, { config: CliModelConfig; aliasMap: Record<string, string> }>;

export function getCliModelConfig(cli: string | null | undefined): CliModelConfig {
  const key = ((cli || 'claude').toLowerCase() as CLIKey);
  return REGISTRY[key]?.config ?? REGISTRY.claude.config;
}

export function getDefaultModelForCli(cli: string | null | undefined): string {
  return getCliModelConfig(cli).defaultModel;
}

export function getModelDefinitionsForCli(cli: string | null | undefined): RegistryModelDefinition[] {
  return getCliModelConfig(cli).models;
}

export function normalizeModelId(cli: string | null | undefined, model?: string | null): string {
  const config = getCliModelConfig(cli);
  if (!model) return config.defaultModel;
  const normalized = normalizeKey(model);
  const aliasMap = REGISTRY[config.cli].aliasMap;
  return aliasMap[normalized] ?? config.defaultModel;
}

export function getModelDisplayName(cli: string | null | undefined, modelId?: string | null): string {
  const normalized = normalizeModelId(cli, modelId);
  const match = getCliModelConfig(cli).models.find((item) => item.id === normalized);
  return match?.name ?? normalized;
}
```

- [ ] **Step 2: 把 `cliModels.ts` 改成 registry 代理层**

```ts
import {
  getDefaultModelForCli,
  getModelDefinitionsForCli,
  getModelDisplayName,
  normalizeModelId,
} from './modelRegistry';

export { getDefaultModelForCli, getModelDefinitionsForCli, getModelDisplayName, normalizeModelId };
```

- [ ] **Step 3: 运行纯逻辑测试确认通过**

Run: `rtk proxy node --test --experimental-transform-types tests/cli-model-registry.test.ts`  
Expected: PASS

- [ ] **Step 4: 提交 registry 核心实现**

```bash
rtk git add lib/constants/modelRegistry.ts lib/constants/cliModels.ts tests/cli-model-registry.test.ts config/cli-models/*.json
rtk git commit -m "feat: add cli model registry"
```

### Task 3: 把 provider 常量文件改成薄封装，并消掉重复模型来源

**Files:**
- Modify: `lib/constants/claudeModels.ts`
- Modify: `lib/constants/codexModels.ts`
- Modify: `lib/constants/cursorModels.ts`
- Modify: `lib/constants/qwenModels.ts`
- Modify: `lib/constants/glmModels.ts`
- Modify: `types/cli.ts`
- Modify: `app/api/settings/cli-status/route.ts`
- Modify: `docs/codex-cli-模型列表写死位置.md`
- Test: `tests/codex-settings.test.ts`

- [ ] **Step 1: 把 `claudeModels.ts`/`codexModels.ts`/`cursorModels.ts`/`qwenModels.ts`/`glmModels.ts` 改成 registry 薄封装**

以 `lib/constants/claudeModels.ts` 为模板：

```ts
import {
  getCliModelConfig,
  getDefaultModelForCli,
  getModelDisplayName,
  normalizeModelId,
  type RegistryModelDefinition,
} from './modelRegistry';

export type ClaudeModelId = string;

export interface ClaudeModelDefinition extends RegistryModelDefinition {
  aliases: string[];
}

const CLAUDE_CONFIG = getCliModelConfig('claude');

export const CLAUDE_MODEL_DEFINITIONS: ClaudeModelDefinition[] = CLAUDE_CONFIG.models.map((model) => ({
  ...model,
  aliases: model.aliases ?? [],
}));

export const CLAUDE_DEFAULT_MODEL: ClaudeModelId = getDefaultModelForCli('claude');

export function normalizeClaudeModelId(model?: string | null): ClaudeModelId {
  return normalizeModelId('claude', model);
}

export function getClaudeModelDefinition(id: string): ClaudeModelDefinition | undefined {
  const normalized = normalizeClaudeModelId(id);
  return CLAUDE_MODEL_DEFINITIONS.find((item) => item.id === normalized);
}

export function getClaudeModelDisplayName(id: string): string {
  return getModelDisplayName('claude', id);
}
```

其余 4 个文件按下面的精确导出改造：

```ts
// lib/constants/codexModels.ts
export interface CodexModelDefinition extends RegistryModelDefinition {}
export const CODEX_MODEL_DEFINITIONS = getCliModelConfig('codex').models;
export const CODEX_DEFAULT_MODEL = getDefaultModelForCli('codex');
export function normalizeCodexModelId(model?: string | null): string {
  return normalizeModelId('codex', model);
}
export function getCodexModelDisplayName(id?: string | null): string {
  return getModelDisplayName('codex', id);
}

// lib/constants/qwenModels.ts
export type QwenModelId = string;
export interface QwenModelDefinition extends RegistryModelDefinition {
  aliases: string[];
}
export const QWEN_MODEL_DEFINITIONS = getCliModelConfig('qwen').models.map((model) => ({
  ...model,
  aliases: model.aliases ?? [],
}));
export const QWEN_DEFAULT_MODEL: QwenModelId = getDefaultModelForCli('qwen');
export function normalizeQwenModelId(model?: string | null): QwenModelId {
  return normalizeModelId('qwen', model);
}
export function getQwenModelDisplayName(id?: string | null): string {
  return getModelDisplayName('qwen', id);
}

// lib/constants/glmModels.ts
export type GLMModelId = string;
export interface GLMModelDefinition extends RegistryModelDefinition {
  aliases: string[];
}
export const GLM_MODEL_DEFINITIONS = getCliModelConfig('glm').models.map((model) => ({
  ...model,
  aliases: model.aliases ?? [],
}));
export const GLM_DEFAULT_MODEL: GLMModelId = getDefaultModelForCli('glm');
export function normalizeGLMModelId(model?: string | null): GLMModelId {
  return normalizeModelId('glm', model);
}
export function getGLMModelDisplayName(id?: string | null): string {
  return getModelDisplayName('glm', id);
}

// lib/constants/cursorModels.ts
export interface CursorModelDefinition extends RegistryModelDefinition {}
export const CURSOR_MODEL_DEFINITIONS = getCliModelConfig('cursor').models;
export const CURSOR_DEFAULT_MODEL = getDefaultModelForCli('cursor');
export function normalizeCursorModelId(model?: string | null): string {
  return normalizeModelId('cursor', model);
}
export function getCursorModelDisplayName(id?: string | null): string {
  return getModelDisplayName('cursor', id);
}
export function resolveCursorCliModelId(modelId?: string | null): string {
  return normalizeCursorModelId(modelId);
}
```

- [ ] **Step 2: 把 `types/cli.ts` 改成通用 helper，而不是直连各家模型常量**

```ts
import { getModelDefinitionsForCli } from '@/lib/constants/cliModels';

const toCliModels = (cli: CLIType) =>
  getModelDefinitionsForCli(cli).map(({ id, name, description, supportsImages }) => ({
    id,
    name,
    description,
    supportsImages,
  }));

export const CLI_OPTIONS: CLIOption[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Anthropic Claude with advanced reasoning',
    icon: '/claude.png',
    available: true,
    configured: true,
    enabled: true,
    color: 'from-orange-500 to-red-600',
    brandColor: '#DE7356',
    downloadUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    installCommand: 'npm install -g @anthropic-ai/claude-code',
    features: ['Advanced reasoning', 'Code generation', '1M context window'],
    models: toCliModels('claude'),
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    description: 'OpenAI Codex agent with GPT-5 integration',
    icon: '/oai.png',
    available: true,
    configured: true,
    enabled: true,
    color: 'from-slate-900 to-gray-700',
    brandColor: '#000000',
    downloadUrl: 'https://github.com/openai/codex',
    installCommand: 'npm install -g @openai/codex',
    features: ['Autonomous agent', 'OpenAI model router', 'apply_patch support'],
    models: toCliModels('codex'),
  },
];
```

- [ ] **Step 3: 把 `app/api/settings/cli-status/route.ts` 改成从 registry 取模型 id**

```ts
import { getModelDefinitionsForCli } from '@/lib/constants/cliModels';

status.codex = {
  installed: codexStatus.installed,
  version: codexStatus.version,
  checking: false,
  error: codexStatus.error,
  models: getModelDefinitionsForCli('codex').map((model) => model.id),
};

status.cursor = {
  installed: cursorStatus.installed,
  version: cursorStatus.version,
  checking: false,
  error: cursorStatus.error,
  models: getModelDefinitionsForCli('cursor').map((model) => model.id),
};

status.qwen = {
  installed: qwenStatus.installed,
  version: qwenStatus.version,
  checking: false,
  error: qwenStatus.error,
  models: getModelDefinitionsForCli('qwen').map((model) => model.id),
};

status.glm = {
  installed: glmStatus.installed,
  version: glmStatus.version,
  checking: false,
  error: glmStatus.error,
  models: getModelDefinitionsForCli('glm').map((model) => model.id),
};
```

- [ ] **Step 4: 更新旧文档，说明模型来源已经迁移到 JSON registry**

```md
## 当前真实来源

页面和接口里的模型列表不再直接写死在 `lib/constants/codexModels.ts`。

当前源头改为：

- `config/cli-models/codex.json`
- `lib/constants/modelRegistry.ts`

`lib/constants/codexModels.ts` 现在只是兼容旧调用方的薄封装。
```

- [ ] **Step 5: 运行现有 Codex 回归测试**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts tests/cli-model-registry.test.ts`  
Expected: PASS

- [ ] **Step 6: 提交消费层迁移**

```bash
rtk git add \
  lib/constants/claudeModels.ts \
  lib/constants/codexModels.ts \
  lib/constants/cursorModels.ts \
  lib/constants/qwenModels.ts \
  lib/constants/glmModels.ts \
  types/cli.ts \
  app/api/settings/cli-status/route.ts \
  docs/codex-cli-模型列表写死位置.md \
  tests/codex-settings.test.ts \
  tests/cli-model-registry.test.ts
rtk git commit -m "refactor: move cli model consumers to registry"
```

### Task 4: 端到端验证并清理遗漏

**Files:**
- Verify only

- [ ] **Step 1: 运行类型检查**

Run: `rtk npm run type-check`  
Expected: `tsc --noEmit` 退出码为 0

- [ ] **Step 2: 运行 lint**

Run: `rtk npm run lint`  
Expected: `next lint` 退出码为 0

- [ ] **Step 3: 运行纯逻辑测试全集**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts tests/cli-model-registry.test.ts`  
Expected: PASS

- [ ] **Step 4: 手动核对 4 个行为点**

Run:

- `rtk npm run dev`
- 打开全局设置，确认 `Codex`、`Claude`、`Qwen`、`GLM` 下拉都正常显示模型
- 修改任意 `config/cli-models/*.json` 中的展示名，重启服务后确认 UI 已更新
- 请求 `/api/settings/cli-status`，确认 `codex/cursor/qwen/glm` 的 `models` 字段来自最新 JSON

Expected:

- UI 下拉与 JSON 配置一致
- 服务重启后模型变更生效
- 接口返回的模型列表与 JSON 一致

- [ ] **Step 5: 提交最终验证状态**

```bash
rtk git status --short
```

Expected: 仅保留本次任务相关变更，准备进入代码评审或执行收尾。

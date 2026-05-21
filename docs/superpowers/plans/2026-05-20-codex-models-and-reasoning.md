# Codex Models And Reasoning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Codex 写死模型替换为新的 GPT-5.x 列表，并在全局设置、创建项目弹窗、项目聊天页统一加入 `Reasoning` 下拉，默认 `high`，且只在 Codex 执行链中生效。

**Architecture:** 模型列表和 `Reasoning` 等级都集中定义在常量/纯函数 helper 中，前端多个页面统一消费。全局默认值继续落到 `data/global-settings.json`，项目级值复用 `Project.settings` JSON 持久化，不引入 Prisma schema 变更。`/api/chat/[project_id]/act` 从项目或请求中解析 `reasoning_effort`，再传给 Codex CLI 服务。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Prisma(SQLite，仅复用现有字段)、Node 22 内建 test runner。

---

### Task 1: 固定 Codex 模型与 Reasoning 纯逻辑

**Files:**
- Create: `tests/codex-settings.test.ts`
- Create: `lib/constants/codexReasoning.ts`
- Modify: `lib/constants/codexModels.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODEX_DEFAULT_MODEL,
  normalizeCodexModelId,
} from '../lib/constants/codexModels';
import {
  CODEX_DEFAULT_REASONING_EFFORT,
  normalizeCodexReasoningEffort,
} from '../lib/constants/codexReasoning';

test('codex 模型默认值切到 gpt-5.5', () => {
  assert.equal(CODEX_DEFAULT_MODEL, 'gpt-5.5');
  assert.equal(normalizeCodexModelId(undefined), 'gpt-5.5');
});

test('旧 codex 模型会回退到新的默认模型', () => {
  assert.equal(normalizeCodexModelId('gpt-4o'), 'gpt-5.5');
});

test('reasoning 默认值为 high，非法值回退到 high', () => {
  assert.equal(CODEX_DEFAULT_REASONING_EFFORT, 'high');
  assert.equal(normalizeCodexReasoningEffort(undefined), 'high');
  assert.equal(normalizeCodexReasoningEffort('invalid'), 'high');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts`  
Expected: 因为 `gpt-5.5` 和 `codexReasoning.ts` 还不存在或默认值不对而失败。

- [ ] **Step 3: 写最小实现**

```ts
export const CODEX_DEFAULT_MODEL = 'gpt-5.5';

export const CODEX_MODEL_DEFINITIONS = [
  { id: 'gpt-5.5', name: 'GPT-5.5' },
  { id: 'gpt-5.4', name: 'GPT-5.4' },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
  { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
  { id: 'gpt-5.2', name: 'GPT-5.2' },
];

export const CODEX_DEFAULT_REASONING_EFFORT = 'high';
```

- [ ] **Step 4: 再跑测试确认通过**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts`  
Expected: PASS

### Task 2: 接通全局设置与项目级 Reasoning 持久化

**Files:**
- Modify: `lib/services/settings.ts`
- Modify: `contexts/GlobalSettingsContext.tsx`
- Modify: `types/client/modal.ts`
- Modify: `types/backend/project.ts`
- Modify: `types/project.ts`
- Modify: `types/shared/project.ts`
- Modify: `lib/services/project.ts`
- Modify: `lib/serializers/project.ts`
- Modify: `app/api/projects/route.ts`
- Modify: `app/api/projects/[project_id]/route.ts`
- Modify: `app/api/chat/[project_id]/cli-preference/route.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProjectReasoningEffort,
  readProjectReasoningEffortFromSettings,
} from '../lib/constants/codexReasoning';

test('项目 settings 里能解析 codex reasoning_effort', () => {
  const raw = JSON.stringify({ codex: { reasoning_effort: 'medium' } });
  assert.equal(readProjectReasoningEffortFromSettings(raw), 'medium');
});

test('项目 settings 为空时回退到默认值', () => {
  assert.equal(normalizeProjectReasoningEffort(undefined), 'high');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts`  
Expected: 因为项目 settings helper 尚未实现而失败。

- [ ] **Step 3: 实现最小 helper 和类型扩展**

```ts
export interface ProjectCliPreference {
  preferredCli: string;
  fallbackEnabled: boolean;
  selectedModel: string | null;
  selectedReasoningEffort: string | null;
}
```

- [ ] **Step 4: 再跑测试确认通过**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts`  
Expected: PASS

### Task 3: 接通聊天执行链与 Codex CLI 参数

**Files:**
- Modify: `types/backend/chat.ts`
- Modify: `types/chat.ts`
- Modify: `app/api/chat/[project_id]/act/route.ts`
- Modify: `lib/services/cli/codex.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCodexReasoningConfig } from '../lib/constants/codexReasoning';

test('codex reasoning high 会转成 CLI config', () => {
  assert.deepEqual(buildCodexReasoningConfig('high'), ['-c', 'model_reasoning_effort=high']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts`  
Expected: 因为 `buildCodexReasoningConfig` 尚未实现而失败。

- [ ] **Step 3: 写最小实现并接入 route/service**

```ts
const reasoningEffort = normalizeCodexReasoningEffort(input);
const codexConfigArgs = [
  ...buildCodexReasoningConfig(reasoningEffort),
];
```

- [ ] **Step 4: 再跑测试确认通过**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts`  
Expected: PASS

### Task 4: 在三个 UI 入口加入 Reasoning 下拉

**Files:**
- Modify: `components/chat/ChatInput.tsx`
- Modify: `app/[project_id]/chat/page.tsx`
- Modify: `components/settings/GlobalSettings.tsx`
- Modify: `components/modals/CreateProjectModal.tsx`

- [ ] **Step 1: 先补 props/状态，保持非 Codex 不显示或禁用**

```tsx
<div className="flex flex-col text-[11px] text-gray-500">
  <span>Reasoning</span>
  <select value={selectedReasoningEffort} ...>
    <option value="xhigh">xhigh</option>
    <option value="high">high</option>
    <option value="medium">medium</option>
    <option value="low">low</option>
  </select>
</div>
```

- [ ] **Step 2: 让创建项目默认继承全局设置**

Run: 直接检查 `CreateProjectModal` 中 `globalSettings.cli_settings?.codex?.reasoning_effort`

- [ ] **Step 3: 让项目聊天页切换后持久化到项目**

Run: 直接检查 `persistProjectPreferences` payload 中包含 `selectedReasoningEffort`

### Task 5: 最终验证

**Files:**
- Verify only

- [ ] **Step 1: 运行纯逻辑测试**

Run: `rtk proxy node --test --experimental-transform-types tests/codex-settings.test.ts`

- [ ] **Step 2: 运行类型检查**

Run: `rtk npm run type-check`

- [ ] **Step 3: 如 lint 成本可接受，再跑 lint**

Run: `rtk npm run lint`

- [ ] **Step 4: 手动核对关键行为**

Run:
- 打开全局设置，确认 `Codex` 模型列表是 5 个新模型
- 确认 `Reasoning` 下拉默认 `high`
- 打开创建项目弹窗，确认默认继承全局设置
- 进入项目聊天页，确认 `Model` 右侧出现 `Reasoning`

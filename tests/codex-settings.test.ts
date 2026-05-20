import test from 'node:test';
import assert from 'node:assert/strict';

const { CODEX_DEFAULT_MODEL, normalizeCodexModelId } = await import(
  new URL('../lib/constants/codexModels.ts', import.meta.url).href
);
const {
  CODEX_DEFAULT_REASONING_EFFORT,
  buildCodexReasoningConfig,
  normalizeCodexReasoningEffort,
  normalizeProjectReasoningEffort,
  readProjectReasoningEffortFromSettings,
} = await import(
  new URL('../lib/constants/codexReasoning.ts', import.meta.url).href
);
const {
  getEffectiveCreateProjectCli,
  getEffectiveCreateProjectReasoningEffort,
  shouldShowCreateProjectReasoning,
} = await import(
  new URL('../lib/constants/createProjectModalHelpers.ts', import.meta.url).href
);

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
  assert.equal(normalizeProjectReasoningEffort(undefined), 'high');
});

test('项目 settings 里能解析 codex reasoning_effort', () => {
  const raw = JSON.stringify({ codex: { reasoning_effort: 'medium' } });
  assert.equal(readProjectReasoningEffortFromSettings(raw), 'medium');
});

test('codex reasoning 会转成 CLI config', () => {
  assert.deepEqual(buildCodexReasoningConfig('high'), ['-c', 'model_reasoning_effort=high']);
  assert.deepEqual(buildCodexReasoningConfig('xhigh'), ['-c', 'model_reasoning_effort=xhigh']);
});

test('创建项目弹窗在全局默认 codex 时也应显示 reasoning', () => {
  const globalSettings = {
    default_cli: 'codex',
    cli_settings: {
      codex: {
        reasoning_effort: 'medium',
      },
    },
  };

  assert.equal(getEffectiveCreateProjectCli(true, 'claude', globalSettings), 'codex');
  assert.equal(shouldShowCreateProjectReasoning(true, 'claude', globalSettings), true);
  assert.equal(
    getEffectiveCreateProjectReasoningEffort(true, 'claude', 'high', globalSettings),
    'medium'
  );
});

test('创建项目弹窗在自定义选择 codex 时应显示 reasoning', () => {
  assert.equal(shouldShowCreateProjectReasoning(false, 'codex', null), true);
  assert.equal(shouldShowCreateProjectReasoning(false, 'claude', null), false);
});

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

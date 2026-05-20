import type { RegistryModelDefinition } from './modelRegistry';

type ModelRegistryModule = typeof import('./modelRegistry');

const {
  getCliModelConfig,
  getDefaultModelForCli,
  getModelDisplayName,
  normalizeModelId,
}: ModelRegistryModule = await import(new URL('./modelRegistry.ts', import.meta.url).href);

export interface CodexModelDefinition extends RegistryModelDefinition {}

export const CODEX_MODEL_DEFINITIONS: CodexModelDefinition[] = getCliModelConfig('codex').models;

export const CODEX_DEFAULT_MODEL = getDefaultModelForCli('codex');

export function normalizeCodexModelId(model?: string | null): string {
  return normalizeModelId('codex', model);
}

export function getCodexModelDisplayName(id?: string | null): string {
  return getModelDisplayName('codex', id);
}

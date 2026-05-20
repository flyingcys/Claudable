import type { RegistryModelDefinition } from './modelRegistry';

type ModelRegistryModule = typeof import('./modelRegistry');

const {
  getCliModelConfig,
  getDefaultModelForCli,
  getModelDisplayName,
  normalizeModelId,
}: ModelRegistryModule = await import(new URL('./modelRegistry.ts', import.meta.url).href);

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

import {
  getCliModelConfig,
  getDefaultModelForCli,
  getModelDisplayName,
  normalizeModelId,
  type RegistryModelDefinition,
} from './modelRegistry.ts';

export type QwenModelId = string;

export interface QwenModelDefinition extends RegistryModelDefinition {
  aliases: string[];
}

export const QWEN_MODEL_DEFINITIONS: QwenModelDefinition[] = getCliModelConfig('qwen').models.map((model) => ({
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

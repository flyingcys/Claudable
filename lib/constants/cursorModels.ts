import {
  getCliModelConfig,
  getDefaultModelForCli,
  getModelDisplayName,
  normalizeModelId,
  type RegistryModelDefinition,
} from './modelRegistry.ts';

export interface CursorModelDefinition extends RegistryModelDefinition {}

export const CURSOR_MODEL_DEFINITIONS: CursorModelDefinition[] = getCliModelConfig('cursor').models;

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

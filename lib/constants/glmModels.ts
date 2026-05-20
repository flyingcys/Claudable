import type { RegistryModelDefinition } from './modelRegistry';

type ModelRegistryModule = typeof import('./modelRegistry');

const {
  getCliModelConfig,
  getDefaultModelForCli,
  getModelDisplayName,
  normalizeModelId,
}: ModelRegistryModule = await import(new URL('./modelRegistry.ts', import.meta.url).href);

export type GLMModelId = string;

export interface GLMModelDefinition extends RegistryModelDefinition {
  aliases: string[];
}

export const GLM_MODEL_DEFINITIONS: GLMModelDefinition[] = getCliModelConfig('glm').models.map((model) => ({
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

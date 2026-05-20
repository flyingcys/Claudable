import claudeConfig from '../../config/cli-models/claude.json' with { type: 'json' };
import codexConfig from '../../config/cli-models/codex.json' with { type: 'json' };
import cursorConfig from '../../config/cli-models/cursor.json' with { type: 'json' };
import geminiConfig from '../../config/cli-models/gemini.json' with { type: 'json' };
import glmConfig from '../../config/cli-models/glm.json' with { type: 'json' };
import qwenConfig from '../../config/cli-models/qwen.json' with { type: 'json' };

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
  const key = (cli || 'claude').toLowerCase() as CLIKey;
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
  if (!model) {
    return config.defaultModel;
  }

  const normalized = normalizeKey(model);
  const aliasMap = REGISTRY[config.cli].aliasMap;
  return aliasMap[normalized] ?? config.defaultModel;
}

export function getModelDisplayName(cli: string | null | undefined, modelId?: string | null): string {
  const normalized = normalizeModelId(cli, modelId);
  const match = getCliModelConfig(cli).models.find((item) => item.id === normalized);
  return match?.name ?? normalized;
}

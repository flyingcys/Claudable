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
const sanitizeCliKey = (value: string | null | undefined): CLIKey | undefined => {
  const normalized = (value || '').trim().toLowerCase();
  switch (normalized) {
    case 'claude':
    case 'codex':
    case 'cursor':
    case 'gemini':
    case 'qwen':
    case 'glm':
      return normalized;
    default:
      return undefined;
  }
};

const REGISTRY = Object.fromEntries(
  Object.entries(RAW_CONFIGS).map(([cli, config]) => {
    if (config.cli !== cli) {
      throw new Error(`[modelRegistry] ${cli} config has mismatched cli field: ${config.cli}`);
    }

    const knownIds = new Set<string>();
    config.models.forEach((model) => {
      if (knownIds.has(model.id)) {
        throw new Error(`[modelRegistry] ${cli} has duplicate model id: ${model.id}`);
      }
      knownIds.add(model.id);
    });

    if (!knownIds.has(config.defaultModel)) {
      throw new Error(`[modelRegistry] ${cli} defaultModel ${config.defaultModel} missing from models`);
    }

    const aliasMap: Record<string, string> = {};
    config.models.forEach((model) => {
      const registerAlias = (raw: string) => {
        const key = normalizeKey(raw);
        const existing = aliasMap[key];
        if (existing && existing !== model.id) {
          throw new Error(
            `[modelRegistry] ${cli} alias collision for "${raw}" between ${existing} and ${model.id}`,
          );
        }
        aliasMap[key] = model.id;
      };

      registerAlias(model.id);
      model.aliases?.forEach((alias) => {
        registerAlias(alias);
      });
    });

    return [cli, { config, aliasMap }];
  }),
) as Record<CLIKey, { config: CliModelConfig; aliasMap: Record<string, string> }>;

export function getCliModelConfig(cli: string | null | undefined): CliModelConfig {
  const key = sanitizeCliKey(cli) ?? 'claude';
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

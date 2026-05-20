/**
 * Codex CLI model definitions and helpers
 */

export interface CodexModelDefinition {
  id: string;
  name: string;
  description?: string;
  supportsImages?: boolean;
}

export const CODEX_DEFAULT_MODEL = 'gpt-5.5';

export const CODEX_MODEL_DEFINITIONS: CodexModelDefinition[] = [
  {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    description: 'Newest frontier Codex model for complex coding workflows',
    supportsImages: true,
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    description: 'Strong default fallback when GPT-5.5 is unavailable',
    supportsImages: true,
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    description: 'Faster and lighter GPT-5.4 variant',
    supportsImages: true,
  },
  {
    id: 'gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    description: 'Research-preview Codex-tuned model for fast iterations',
    supportsImages: true,
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Stable earlier GPT-5 generation for compatibility',
    supportsImages: true,
  },
];

const ALIAS_MAP: Record<string, string> = {
  'gpt5': 'gpt-5.5',
  'gpt_5': 'gpt-5.5',
  'gpt-5': 'gpt-5.5',
  'gpt-5.0': 'gpt-5.5',
  'gpt54': 'gpt-5.4',
  'gpt_5_4': 'gpt-5.4',
  'gpt54mini': 'gpt-5.4-mini',
  'gpt-5.4mini': 'gpt-5.4-mini',
  'gpt_5_4_mini': 'gpt-5.4-mini',
  'gpt53codex': 'gpt-5.3-codex',
  'gpt-5.3-codex-spark': 'gpt-5.3-codex',
  'gpt-5.3-codex-spark-preview': 'gpt-5.3-codex',
  'gpt52': 'gpt-5.2',
  'gpt_5_2': 'gpt-5.2',
  'gpt-4o': 'gpt-5.5',
  'gpt-4o-mini': 'gpt-5.4-mini',
  'o1-preview': 'gpt-5.4',
  'o1-mini': 'gpt-5.4-mini',
  'claude-sonnet-3.5': 'gpt-5.5',
  'claude35-sonnet': 'gpt-5.5',
  'claude-3-haiku': 'gpt-5.4-mini',
};

const KNOWN_IDS = new Set(CODEX_MODEL_DEFINITIONS.map((model) => model.id));

export function normalizeCodexModelId(model?: string | null): string {
  if (!model || typeof model !== 'string') {
    return CODEX_DEFAULT_MODEL;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return CODEX_DEFAULT_MODEL;
  }

  const lower = trimmed.toLowerCase();
  if (ALIAS_MAP[lower]) {
    return ALIAS_MAP[lower];
  }

  if (KNOWN_IDS.has(lower)) {
    return lower;
  }

  // If the exact casing exists, allow it
  if (KNOWN_IDS.has(trimmed)) {
    return trimmed;
  }

  return CODEX_DEFAULT_MODEL;
}

export function getCodexModelDisplayName(id?: string | null): string {
  if (!id) {
    return CODEX_MODEL_DEFINITIONS.find((model) => model.id === CODEX_DEFAULT_MODEL)?.name ?? CODEX_DEFAULT_MODEL;
  }

  const normalized = normalizeCodexModelId(id);
  const match = CODEX_MODEL_DEFINITIONS.find((model) => model.id === normalized);
  return match?.name ?? normalized;
}

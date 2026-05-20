export const CODEX_REASONING_EFFORTS = ['xhigh', 'high', 'medium', 'low'] as const;

export type CodexReasoningEffort = (typeof CODEX_REASONING_EFFORTS)[number];

export interface CodexReasoningDefinition {
  id: CodexReasoningEffort;
  name: string;
}

export const CODEX_DEFAULT_REASONING_EFFORT: CodexReasoningEffort = 'high';

export const CODEX_REASONING_DEFINITIONS: CodexReasoningDefinition[] = CODEX_REASONING_EFFORTS.map((id) => ({
  id,
  name: id,
}));

const KNOWN_REASONING_EFFORTS = new Set<string>(CODEX_REASONING_EFFORTS);

const ALIAS_MAP: Record<string, CodexReasoningEffort> = {
  'x-high': 'xhigh',
};

type ProjectSettingsRecord = Record<string, unknown>;

function parseProjectSettings(raw?: string | null): ProjectSettingsRecord {
  if (!raw || typeof raw !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ProjectSettingsRecord;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeCodexReasoningEffort(value?: string | null): CodexReasoningEffort {
  if (!value || typeof value !== 'string') {
    return CODEX_DEFAULT_REASONING_EFFORT;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return CODEX_DEFAULT_REASONING_EFFORT;
  }

  if (KNOWN_REASONING_EFFORTS.has(trimmed)) {
    return trimmed as CodexReasoningEffort;
  }

  if (ALIAS_MAP[trimmed]) {
    return ALIAS_MAP[trimmed];
  }

  return CODEX_DEFAULT_REASONING_EFFORT;
}

export function normalizeProjectReasoningEffort(value?: string | null): CodexReasoningEffort {
  return normalizeCodexReasoningEffort(value);
}

export function readProjectReasoningEffortFromSettings(raw?: string | null): CodexReasoningEffort | null {
  const settings = parseProjectSettings(raw);
  const codex = settings.codex;
  if (!codex || typeof codex !== 'object') {
    return null;
  }

  const effort = (codex as Record<string, unknown>).reasoning_effort;
  return typeof effort === 'string' ? normalizeCodexReasoningEffort(effort) : null;
}

export function mergeProjectReasoningEffortIntoSettings(
  raw: string | null | undefined,
  effort?: string | null,
): string | null {
  const settings = parseProjectSettings(raw);
  const nextEffort =
    effort === null || typeof effort === 'undefined'
      ? undefined
      : normalizeCodexReasoningEffort(effort);

  const existingCodex =
    settings.codex && typeof settings.codex === 'object'
      ? { ...(settings.codex as Record<string, unknown>) }
      : {};

  if (nextEffort) {
    existingCodex.reasoning_effort = nextEffort;
    settings.codex = existingCodex;
  } else if (Object.keys(existingCodex).length > 0) {
    delete existingCodex.reasoning_effort;
    if (Object.keys(existingCodex).length > 0) {
      settings.codex = existingCodex;
    } else {
      delete settings.codex;
    }
  }

  return Object.keys(settings).length > 0 ? JSON.stringify(settings) : null;
}

export function buildCodexReasoningConfig(effort?: string | null): string[] {
  const normalized = normalizeCodexReasoningEffort(effort);
  return ['-c', `model_reasoning_effort=${normalized}`];
}

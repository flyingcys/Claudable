type MinimalGlobalSettings = {
  default_cli?: string;
  cli_settings?: Record<string, { model?: string; reasoning_effort?: string }>;
} | null | undefined;

function normalizeReasoningEffort(value?: string | null): string {
  switch ((value || '').trim().toLowerCase()) {
    case 'xhigh':
    case 'high':
    case 'medium':
    case 'low':
      return value!.trim().toLowerCase();
    default:
      return 'high';
  }
}

export function getEffectiveCreateProjectCli(
  useDefaultSettings: boolean,
  selectedCli: string,
  globalSettings?: MinimalGlobalSettings,
): string {
  if (useDefaultSettings) {
    return globalSettings?.default_cli || selectedCli || 'claude';
  }

  return selectedCli || globalSettings?.default_cli || 'claude';
}

export function shouldShowCreateProjectReasoning(
  useDefaultSettings: boolean,
  selectedCli: string,
  globalSettings?: MinimalGlobalSettings,
): boolean {
  return getEffectiveCreateProjectCli(useDefaultSettings, selectedCli, globalSettings) === 'codex';
}

export function getEffectiveCreateProjectReasoningEffort(
  useDefaultSettings: boolean,
  selectedCli: string,
  selectedReasoningEffort: string,
  globalSettings?: MinimalGlobalSettings,
): string {
  if (shouldShowCreateProjectReasoning(useDefaultSettings, selectedCli, globalSettings) && useDefaultSettings) {
    return normalizeReasoningEffort(globalSettings?.cli_settings?.codex?.reasoning_effort);
  }

  return normalizeReasoningEffort(selectedReasoningEffort);
}

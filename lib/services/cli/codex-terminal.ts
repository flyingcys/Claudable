export type CodexTerminalOutcome = 'pending' | 'completed' | 'failed';

export interface CodexTerminalState {
  hasCompleted: boolean;
  terminalOutcome: CodexTerminalOutcome;
}

export interface CodexTerminalResolution extends CodexTerminalState {
  shouldFinalizeSuccess: boolean;
}

export function resolveCodexTerminalEvent(
  eventType: string | null | undefined,
  state: CodexTerminalState,
): CodexTerminalResolution {
  if (eventType !== 'turn.completed') {
    return {
      ...state,
      shouldFinalizeSuccess: false,
    };
  }

  if (state.hasCompleted || state.terminalOutcome === 'failed') {
    return {
      ...state,
      shouldFinalizeSuccess: false,
    };
  }

  return {
    hasCompleted: true,
    terminalOutcome: 'completed',
    shouldFinalizeSuccess: true,
  };
}

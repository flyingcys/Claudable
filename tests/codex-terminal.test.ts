import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveCodexTerminalEvent } = await import(
  new URL('../lib/services/cli/codex-terminal.ts', import.meta.url).href
);

test('turn.completed 应立即触发成功收敛', () => {
  assert.deepEqual(
    resolveCodexTerminalEvent('turn.completed', {
      hasCompleted: false,
      terminalOutcome: 'pending',
    }),
    {
      hasCompleted: true,
      terminalOutcome: 'completed',
      shouldFinalizeSuccess: true,
    }
  );
});

test('已完成状态不应重复触发成功收敛', () => {
  assert.deepEqual(
    resolveCodexTerminalEvent('turn.completed', {
      hasCompleted: true,
      terminalOutcome: 'completed',
    }),
    {
      hasCompleted: true,
      terminalOutcome: 'completed',
      shouldFinalizeSuccess: false,
    }
  );
});

test('失败终态不应被 turn.completed 覆盖', () => {
  assert.deepEqual(
    resolveCodexTerminalEvent('turn.completed', {
      hasCompleted: true,
      terminalOutcome: 'failed',
    }),
    {
      hasCompleted: true,
      terminalOutcome: 'failed',
      shouldFinalizeSuccess: false,
    }
  );
});

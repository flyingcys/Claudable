import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildCodexShellSpawn,
  createInactivityTimeout,
  parseCodexEventLine,
  quotePosixShellArg,
} = await import(new URL('../lib/services/cli/codex-shell.ts', import.meta.url).href);

test('posix shell 启动规格使用 sh -lc exec 并关闭 stdin', () => {
  const spec = buildCodexShellSpawn(
    'codex',
    ['exec', '--json', '--cd', '/tmp/project', '--model', 'gpt-5.5', 'Reply with exactly OK'],
    'linux',
  );

  assert.equal(spec.command, 'sh');
  assert.deepEqual(spec.args.slice(0, 1), ['-lc']);
  assert.deepEqual(spec.stdio, ['ignore', 'pipe', 'pipe']);
  assert.match(spec.args[1], /^exec codex exec --json --cd \/tmp\/project --model gpt-5\.5 /);
  assert.match(spec.args[1], /'Reply with exactly OK'/);
});

test('posix shell 参数会转义单引号', () => {
  assert.equal(quotePosixShellArg("it's codex"), `'it'"'"'s codex'`);
});

test('windows shell 启动规格不应通过 cmd 展开 % 和 !', () => {
  const spec = buildCodexShellSpawn(
    'codex.cmd',
    ['exec', '--json', '--model', 'gpt-5.5', 'width: 100%', '!VAR!'],
    'win32',
  );

  assert.notEqual(spec.command.toLowerCase(), 'cmd.exe');
  assert.match(spec.command.toLowerCase(), /powershell/);
  assert.match(spec.args.join(' '), /'width: 100%'/);
  assert.match(spec.args.join(' '), /'!VAR!'/);
});

test('codex 事件解析对非法行返回 null', () => {
  assert.deepEqual(parseCodexEventLine('{"type":"turn.completed"}'), { type: 'turn.completed' });
  assert.equal(parseCodexEventLine('Reading additional input from stdin...'), null);
  assert.equal(parseCodexEventLine('   '), null);
});

test('无活动超时在持续 touch 时不应提前触发', async () => {
  let timedOut = false;
  const controller = createInactivityTimeout({
    timeoutMs: 40,
    onTimeout: () => {
      timedOut = true;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.touch();
  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.touch();
  await new Promise((resolve) => setTimeout(resolve, 20));

  controller.dispose();
  assert.equal(timedOut, false);
});

test('无活动超时在静默时应触发', async () => {
  let timeoutCount = 0;
  const controller = createInactivityTimeout({
    timeoutMs: 20,
    onTimeout: () => {
      timeoutCount += 1;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 35));
  controller.dispose();

  assert.equal(timeoutCount, 1);
});

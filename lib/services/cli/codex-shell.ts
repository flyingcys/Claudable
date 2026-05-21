export interface CodexShellSpawnSpec {
  command: string;
  args: string[];
  stdio: ['ignore', 'pipe', 'pipe'];
  spawnMode: 'shell-wrapper';
}

interface InactivityTimeoutOptions {
  timeoutMs: number;
  onTimeout: () => void;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export interface InactivityTimeoutController {
  touch: () => void;
  dispose: () => void;
}

const POSIX_SAFE_ARG = /^[A-Za-z0-9_@%+=:,./-]+$/;

export function quotePosixShellArg(value: string): string {
  if (value.length === 0) {
    return "''";
  }

  if (POSIX_SAFE_ARG.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function quoteCmdArg(value: string): string {
  if (value.length === 0) {
    return '""';
  }

  if (!/[ \t"&()<>^|]/.test(value)) {
    return value;
  }

  const escaped = value
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\+)$/g, '$1$1');

  return `"${escaped}"`;
}

export function quotePowerShellArg(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildCodexShellSpawn(
  executable: string,
  args: string[],
  platform: NodeJS.Platform = process.platform,
  windowsShellPath?: string,
): CodexShellSpawnSpec {
  if (platform === 'win32') {
    const command = windowsShellPath || 'powershell.exe';
    const shellCommand = `& { & ${[executable, ...args].map((arg) => quotePowerShellArg(arg)).join(' ')} }`;

    return {
      command,
      args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', shellCommand],
      stdio: ['ignore', 'pipe', 'pipe'],
      spawnMode: 'shell-wrapper',
    };
  }

  const shellCommand = `exec ${[executable, ...args].map((arg) => quotePosixShellArg(arg)).join(' ')}`;

  return {
    command: 'sh',
    args: ['-lc', shellCommand],
    stdio: ['ignore', 'pipe', 'pipe'],
    spawnMode: 'shell-wrapper',
  };
}

export function parseCodexEventLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createInactivityTimeout({
  timeoutMs,
  onTimeout,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}: InactivityTimeoutOptions): InactivityTimeoutController {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (disposed) {
      return;
    }

    if (timer) {
      clearTimeoutFn(timer);
    }

    timer = setTimeoutFn(() => {
      if (disposed) {
        return;
      }
      timer = null;
      onTimeout();
    }, timeoutMs);

    if (typeof timer === 'object' && timer && 'unref' in timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  };

  schedule();

  return {
    touch() {
      schedule();
    },
    dispose() {
      disposed = true;
      if (timer) {
        clearTimeoutFn(timer);
        timer = null;
      }
    },
  };
}

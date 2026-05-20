import { getModelDefinitionsForCli } from '@/lib/constants/cliModels';

/**
 * Frontend CLI Type Definitions (claude-only variant)
 */

export type CLIType = 'claude' | 'cursor' | 'codex' | 'gemini' | 'qwen' | 'glm';

export interface CLIModel {
  id: string;
  name: string;
  description?: string;
  supportsImages?: boolean;
}

export interface CLIOption {
  id: CLIType;
  name: string;
  description: string;
  icon?: string;
  available: boolean;
  configured: boolean;
  enabled?: boolean;
  models?: CLIModel[];
  color?: string;
  brandColor?: string;
  downloadUrl?: string;
  installCommand?: string;
  features?: string[];
}

function toCliModels(cli: CLIType): CLIModel[] {
  return getModelDefinitionsForCli(cli).map(({ id, name, description, supportsImages }) => ({
    id,
    name,
    description,
    supportsImages,
  }));
}

export type CLIStatusEntry = {
  installed: boolean;
  checking: boolean;
  version?: string;
  error?: string;
  available?: boolean;
  configured?: boolean;
  models?: string[];
};

export type CLIStatus = Record<string, CLIStatusEntry>;

export interface CLIPreference {
  preferredCli: CLIType;
  fallbackEnabled: boolean;
  selectedModel?: string;
  selectedReasoningEffort?: string;
}

export const CLI_OPTIONS: CLIOption[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Anthropic Claude with advanced reasoning',
    icon: '/claude.png',
    available: true,
    configured: true,
    enabled: true,
    color: 'from-orange-500 to-red-600',
    brandColor: '#DE7356',
    downloadUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    installCommand: 'npm install -g @anthropic-ai/claude-code',
    features: ['Advanced reasoning', 'Code generation', '1M context window'],
    models: toCliModels('claude'),
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    description: 'OpenAI Codex agent with GPT-5 integration',
    icon: '/oai.png',
    available: true,
    configured: true,
    enabled: true,
    color: 'from-slate-900 to-gray-700',
    brandColor: '#000000',
    downloadUrl: 'https://github.com/openai/codex',
    installCommand: 'npm install -g @openai/codex',
    features: ['Autonomous agent', 'OpenAI model router', 'apply_patch support'],
    models: toCliModels('codex'),
  },
  {
    id: 'cursor',
    name: 'Cursor Agent',
    description: 'Cursor CLI with multi-model router and autonomous tooling',
    icon: '/cursor.png',
    available: true,
    configured: true,
    enabled: true,
    color: 'from-slate-500 to-gray-600',
    brandColor: '#6B7280',
    downloadUrl: 'https://docs.cursor.com/en/cli/overview',
    installCommand: 'curl https://cursor.com/install -fsS | bash',
    features: ['Autonomous agent', 'Multi-model routing', 'Session resume'],
    models: toCliModels('cursor'),
  },
  {
    id: 'qwen',
    name: 'Qwen Coder',
    description: 'Alibaba Qwen Code agent with sandboxed tooling',
    icon: '/qwen.png',
    available: true,
    configured: true,
    enabled: true,
    color: 'from-emerald-500 to-teal-600',
    brandColor: '#11A97D',
    downloadUrl: 'https://github.com/QwenLM/qwen-code',
    installCommand: 'npm install -g @qwen-code/qwen-code',
    features: ['Autonomous coding agent', 'Workspace sandboxing', 'Tool approval modes'],
    models: toCliModels('qwen'),
  },
  {
    id: 'glm',
    name: 'GLM CLI',
    description: 'Zhipu GLM agent running through Claude Code runtime',
    icon: '/glm.svg',
    available: true,
    configured: true,
    enabled: true,
    color: 'from-blue-500 to-indigo-600',
    brandColor: '#1677FF',
    downloadUrl: 'https://docs.z.ai/devpack/tool/claude',
    installCommand: 'zai devpack install claude',
    features: ['Claude-compatible agent runtime', 'GLM 4.6 reasoning'],
    models: toCliModels('glm'),
  },
];

/**
 * Project Service - Project management logic
 */

import { prisma } from '@/lib/db/client';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types/backend';
import fs from 'fs/promises';
import path from 'path';
import { normalizeModelId, getDefaultModelForCli } from '@/lib/constants/cliModels';
import {
  mergeProjectReasoningEffortIntoSettings,
  readProjectReasoningEffortFromSettings,
} from '@/lib/constants/codexReasoning';

const PROJECTS_DIR = process.env.PROJECTS_DIR || './data/projects';
const PROJECTS_DIR_ABSOLUTE = path.isAbsolute(PROJECTS_DIR)
  ? PROJECTS_DIR
  : path.resolve(process.cwd(), PROJECTS_DIR);

function withNormalizedCliSettings<T extends { preferredCli?: string | null; selectedModel?: string | null; settings?: string | null }>(
  project: T,
): T & { selectedReasoningEffort: string | null } {
  return {
    ...project,
    selectedModel: normalizeModelId(project.preferredCli ?? 'claude', project.selectedModel ?? undefined),
    selectedReasoningEffort: readProjectReasoningEffortFromSettings(project.settings),
  };
}

/**
 * Retrieve all projects
 */
export async function getAllProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    orderBy: {
      lastActiveAt: 'desc',
    },
  });
  return projects.map((project) => withNormalizedCliSettings(project)) as Project[];
}

/**
 * Retrieve project by ID
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id },
  });
  if (!project) return null;
  return withNormalizedCliSettings(project) as Project;
}

/**
 * Create new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  // Create project directory
  const projectPath = path.join(PROJECTS_DIR_ABSOLUTE, input.project_id);
  await fs.mkdir(projectPath, { recursive: true });

  // Create project in database
  const project = await prisma.project.create({
    data: {
      id: input.project_id,
      name: input.name,
      description: input.description,
      initialPrompt: input.initialPrompt,
      repoPath: projectPath,
      preferredCli: input.preferredCli || 'claude',
      selectedModel: normalizeModelId(input.preferredCli || 'claude', input.selectedModel ?? getDefaultModelForCli(input.preferredCli || 'claude')),
      settings:
        typeof input.selectedReasoningEffort === 'string'
          ? mergeProjectReasoningEffortIntoSettings(null, input.selectedReasoningEffort)
          : null,
      status: 'idle',
      templateType: 'nextjs',
      lastActiveAt: new Date(),
      previewUrl: null,
      previewPort: null,
    },
  });

  console.log(`[ProjectService] Created project: ${project.id}`);
  return withNormalizedCliSettings(project) as Project;
}

/**
 * Update project
 */
export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<Project> {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { preferredCli: true, settings: true },
  });
  const targetCli = input.preferredCli ?? existing?.preferredCli ?? 'claude';
  const normalizedModel = input.selectedModel
    ? normalizeModelId(targetCli, input.selectedModel)
    : undefined;
  const nextSettings =
    typeof input.selectedReasoningEffort !== 'undefined'
      ? mergeProjectReasoningEffortIntoSettings(input.settings ?? existing?.settings, input.selectedReasoningEffort)
      : input.settings;

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(typeof input.name !== 'undefined' ? { name: input.name } : {}),
      ...(typeof input.description !== 'undefined' ? { description: input.description } : {}),
      ...(typeof input.status !== 'undefined' ? { status: input.status } : {}),
      ...(typeof input.previewUrl !== 'undefined' ? { previewUrl: input.previewUrl } : {}),
      ...(typeof input.previewPort !== 'undefined' ? { previewPort: input.previewPort } : {}),
      ...(typeof input.preferredCli !== 'undefined' ? { preferredCli: input.preferredCli } : {}),
      ...(typeof input.activeClaudeSessionId !== 'undefined'
        ? { activeClaudeSessionId: input.activeClaudeSessionId }
        : {}),
      ...(typeof input.activeCursorSessionId !== 'undefined'
        ? { activeCursorSessionId: input.activeCursorSessionId }
        : {}),
      ...(typeof input.repoPath !== 'undefined' ? { repoPath: input.repoPath } : {}),
      ...(input.selectedModel
        ? { selectedModel: normalizedModel }
        : {}),
      ...(typeof input.selectedReasoningEffort !== 'undefined' || typeof input.settings !== 'undefined'
        ? { settings: nextSettings }
        : {}),
      updatedAt: new Date(),
    },
  });

  console.log(`[ProjectService] Updated project: ${id}`);
  return withNormalizedCliSettings(project) as Project;
}

/**
 * Delete project
 */
export async function deleteProject(id: string): Promise<void> {
  // Delete project directory
  const project = await getProjectById(id);
  if (project?.repoPath) {
    try {
      await fs.rm(project.repoPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[ProjectService] Failed to delete project directory:`, error);
    }
  }

  // Delete project from database (related data automatically deleted via Cascade)
  await prisma.project.delete({
    where: { id },
  });

  console.log(`[ProjectService] Deleted project: ${id}`);
}

/**
 * Update project activity time
 */
export async function updateProjectActivity(id: string): Promise<void> {
  await prisma.project.update({
    where: { id },
    data: {
      lastActiveAt: new Date(),
    },
  });
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  id: string,
  status: 'idle' | 'running' | 'stopped' | 'error'
): Promise<void> {
  await prisma.project.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date(),
    },
  });
  console.log(`[ProjectService] Updated project status: ${id} -> ${status}`);
}

export interface ProjectCliPreference {
  preferredCli: string;
  fallbackEnabled: boolean;
  selectedModel: string | null;
  selectedReasoningEffort: string | null;
}

export async function getProjectCliPreference(projectId: string): Promise<ProjectCliPreference | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      preferredCli: true,
      fallbackEnabled: true,
      selectedModel: true,
      settings: true,
    },
  });

  if (!project) {
    return null;
  }

  return {
    preferredCli: project.preferredCli ?? 'claude',
    fallbackEnabled: project.fallbackEnabled ?? false,
    selectedModel: normalizeModelId(project.preferredCli ?? 'claude', project.selectedModel ?? undefined),
    selectedReasoningEffort: readProjectReasoningEffortFromSettings(project.settings),
  };
}

export async function updateProjectCliPreference(
  projectId: string,
  input: Partial<ProjectCliPreference>
): Promise<ProjectCliPreference> {
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { preferredCli: true, settings: true },
  });
  const targetCli = input.preferredCli ?? existing?.preferredCli ?? 'claude';
  const nextSettings =
    typeof input.selectedReasoningEffort !== 'undefined'
      ? mergeProjectReasoningEffortIntoSettings(existing?.settings, input.selectedReasoningEffort)
      : undefined;

  const result = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.preferredCli ? { preferredCli: input.preferredCli } : {}),
      ...(typeof input.fallbackEnabled === 'boolean'
        ? { fallbackEnabled: input.fallbackEnabled }
        : {}),
      ...(input.selectedModel
        ? { selectedModel: normalizeModelId(targetCli, input.selectedModel) }
        : input.selectedModel === null
        ? { selectedModel: null }
        : {}),
      ...(typeof input.selectedReasoningEffort !== 'undefined'
        ? { settings: nextSettings }
        : {}),
      updatedAt: new Date(),
    },
    select: {
      preferredCli: true,
      fallbackEnabled: true,
      selectedModel: true,
      settings: true,
    },
  });

  return {
    preferredCli: result.preferredCli ?? 'claude',
    fallbackEnabled: result.fallbackEnabled ?? false,
    selectedModel: normalizeModelId(result.preferredCli ?? 'claude', result.selectedModel ?? undefined),
    selectedReasoningEffort: readProjectReasoningEffortFromSettings(result.settings),
  };
}

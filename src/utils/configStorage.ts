import { app } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface ProjectState {
  expandedFolders: string[];
  openedFiles: Array<{ path: string; id: string }>;
  activeFileId: string | null;
}

export interface IDEConfig {
  lastProjectPath: string | null;
  projects: Record<string, ProjectState>; // ключ - путь к проекту
  openProjects: string[]; // список путей открытых проектов
}

const CONFIG_FILE_NAME = 'ide-config.json';

const getConfigPath = (): string => {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME);
};

export const loadConfig = async (): Promise<IDEConfig> => {
  const configPath = getConfigPath();
  const defaultConfig: IDEConfig = {
    lastProjectPath: null,
    projects: {},
    openProjects: [],
  };

  try {
    if (existsSync(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      return { ...defaultConfig, ...parsed };
    }
  } catch (error) {
    console.error('Ошибка загрузки конфигурации:', error);
  }

  return defaultConfig;
};

export const saveConfig = async (config: IDEConfig): Promise<void> => {
  try {
    const configPath = getConfigPath();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Ошибка сохранения конфигурации:', error);
    throw error;
  }
};

export const getProjectState = async (projectPath: string): Promise<ProjectState | null> => {
  const config = await loadConfig();
  return config.projects[projectPath] || null;
};

export const saveProjectState = async (
  projectPath: string,
  state: Partial<ProjectState>
): Promise<void> => {
  const config = await loadConfig();
  const currentState = config.projects[projectPath] || {
    expandedFolders: [],
    openedFiles: [],
    activeFileId: null,
  };

  config.projects[projectPath] = { ...currentState, ...state };
  config.lastProjectPath = projectPath;

  await saveConfig(config);
};

export const getLastProjectPath = async (): Promise<string | null> => {
  const config = await loadConfig();
  return config.lastProjectPath;
};

export const saveLastProjectPath = async (projectPath: string | null): Promise<void> => {
  const config = await loadConfig();
  config.lastProjectPath = projectPath;
  await saveConfig(config);
};

// Получение списка открытых проектов
export const getOpenProjects = async (): Promise<string[]> => {
  const config = await loadConfig();
  return config.openProjects || [];
};

// Добавление проекта в список открытых
export const addOpenProject = async (projectPath: string): Promise<void> => {
  const config = await loadConfig();
  if (!config.openProjects.includes(projectPath)) {
    config.openProjects.push(projectPath);
    await saveConfig(config);
  }
};

// Удаление проекта из списка открытых
export const removeOpenProject = async (projectPath: string): Promise<void> => {
  const config = await loadConfig();
  config.openProjects = config.openProjects.filter(path => path !== projectPath);
  await saveConfig(config);
};


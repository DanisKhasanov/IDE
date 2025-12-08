import { app } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface ProjectState {
  expandedFolders: string[];
  openedFiles: Array<{ path: string; id: string }>;
  activeFileId: string | null;
  isTerminalVisible?: boolean;
}

export interface IDEConfig {
  lastProjectPath: string | null;
  projects: Record<string, ProjectState>; // ключ - путь к проекту
  openProjects: string[]; // список путей открытых проектов
  toolchainInstalled?: boolean; // флаг установки toolchain
  toolchainChecked?: boolean; // флаг проверки toolchain (чтобы не проверять каждый раз)
}

const CONFIG_FILE_NAME = 'ide-config.json';

const getConfigPath = (): string => {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME);
};

// Экспортируем функцию для получения пути к конфигу (для отладки)
export const getConfigFilePath = (): string => {
  return getConfigPath();
};

export const loadConfig = async (): Promise<IDEConfig> => {
  const configPath = getConfigPath();
  const defaultConfig: IDEConfig = {
    lastProjectPath: null,
    projects: {},
    openProjects: [],
    toolchainInstalled: false,
    toolchainChecked: false,
  };

  try {
    if (existsSync(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      return { ...defaultConfig, ...parsed };
    } else {
      console.log('[ConfigStorage] Конфигурационный файл не найден, используется конфигурация по умолчанию');
      console.log('[ConfigStorage] Путь к конфигу:', configPath);
    }
  } catch (error) {
    console.error('Ошибка загрузки конфигурации:', error);
    console.error('Путь к конфигу:', configPath);
  }

  return defaultConfig;
};

export const saveConfig = async (config: IDEConfig): Promise<void> => {
  const configPath = getConfigPath();
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('[ConfigStorage] Конфигурация сохранена в:', configPath);
  } catch (error) {
    console.error('Ошибка сохранения конфигурации:', error);
    console.error('Путь к конфигу:', configPath);
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
    isTerminalVisible: false,
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
  console.log("[addOpenProject] Текущие открытые проекты:", config.openProjects);
  if (!config.openProjects.includes(projectPath)) {
    config.openProjects.push(projectPath);
    console.log("[addOpenProject] Добавлен проект:", projectPath);
    console.log("[addOpenProject] Обновленный список:", config.openProjects);
    await saveConfig(config);
    console.log("[addOpenProject] Конфиг сохранен");
  } else {
    console.log("[addOpenProject] Проект уже в списке:", projectPath);
  }
};

// Удаление проекта из списка открытых
export const removeOpenProject = async (projectPath: string): Promise<void> => {
  const config = await loadConfig();
  config.openProjects = config.openProjects.filter(path => path !== projectPath);
  await saveConfig(config);
};

// Получение статуса установки toolchain
export const getToolchainInstalled = async (): Promise<boolean> => {
  const config = await loadConfig();
  return config.toolchainInstalled ?? false;
};

// Сохранение статуса установки toolchain
export const setToolchainInstalled = async (installed: boolean): Promise<void> => {
  const config = await loadConfig();
  config.toolchainInstalled = installed;
  config.toolchainChecked = true;
  await saveConfig(config);
};

// Получение статуса проверки toolchain
export const getToolchainChecked = async (): Promise<boolean> => {
  const config = await loadConfig();
  return config.toolchainChecked ?? false;
};

// Сохранение статуса проверки toolchain
export const setToolchainChecked = async (checked: boolean): Promise<void> => {
  const config = await loadConfig();
  config.toolchainChecked = checked;
  await saveConfig(config);
};


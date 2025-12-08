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

/**
 * Попытка восстановить данные из поврежденного JSON
 */
const tryRepairJson = (content: string): IDEConfig | null => {
  try {
    // Пытаемся найти последнюю закрывающую скобку объекта
    let lastBrace = content.lastIndexOf('}');
    if (lastBrace === -1) {
      return null;
    }
    
    // Берем часть до последней закрывающей скобки
    let candidate = content.substring(0, lastBrace + 1);
    
    // Пытаемся найти начало объекта
    let firstBrace = candidate.indexOf('{');
    if (firstBrace === -1) {
      return null;
    }
    
    // Берем только JSON объект
    candidate = candidate.substring(firstBrace);
    
    // Пытаемся распарсить
    const parsed = JSON.parse(candidate);
    return parsed as IDEConfig;
  } catch {
    return null;
  }
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
      // Проверяем, что файл не пустой
      const trimmedContent = content.trim();
      if (trimmedContent === '') {
        return defaultConfig;
      }
      
      try {
        const parsed = JSON.parse(trimmedContent);
        const mergedConfig = { ...defaultConfig, ...parsed };
        
        // Восстанавливаем openProjects, если он пустой, но есть проекты в projects или lastProjectPath
        if ((!mergedConfig.openProjects || mergedConfig.openProjects.length === 0) && 
            (mergedConfig.lastProjectPath || Object.keys(mergedConfig.projects || {}).length > 0)) {
          // Восстанавливаем из projects
          const projectPaths = Object.keys(mergedConfig.projects || {});
          if (projectPaths.length > 0) {
            mergedConfig.openProjects = projectPaths;
            console.log(`[ConfigStorage] Восстановлен список открытых проектов из projects: ${projectPaths.length} проектов`);
            // Сохраняем восстановленную конфигурацию
            await saveConfig(mergedConfig);
          } else if (mergedConfig.lastProjectPath) {
            // Если есть только lastProjectPath, добавляем его в openProjects
            mergedConfig.openProjects = [mergedConfig.lastProjectPath];
            console.log(`[ConfigStorage] Восстановлен список открытых проектов из lastProjectPath: ${mergedConfig.lastProjectPath}`);
            // Сохраняем восстановленную конфигурацию
            await saveConfig(mergedConfig);
          }
        }
        
        console.log(`[ConfigStorage] Конфигурация загружена: ${mergedConfig.openProjects?.length || 0} открытых проектов, последний: ${mergedConfig.lastProjectPath || 'нет'}`);
        return mergedConfig;
      } catch (parseError) {
        // Пытаемся восстановить данные из поврежденного JSON
        console.error('[ConfigStorage] Ошибка парсинга JSON, пытаемся восстановить данные...');
        const repaired = tryRepairJson(trimmedContent);
        if (repaired) {
          const mergedConfig = { ...defaultConfig, ...repaired };
          
          // Восстанавливаем openProjects, если он пустой
          if ((!mergedConfig.openProjects || mergedConfig.openProjects.length === 0) && 
              (mergedConfig.lastProjectPath || Object.keys(mergedConfig.projects || {}).length > 0)) {
            const projectPaths = Object.keys(mergedConfig.projects || {});
            if (projectPaths.length > 0) {
              mergedConfig.openProjects = projectPaths;
            } else if (mergedConfig.lastProjectPath) {
              mergedConfig.openProjects = [mergedConfig.lastProjectPath];
            }
          }
          
          console.log(`[ConfigStorage] Данные восстановлены: ${mergedConfig.openProjects?.length || 0} открытых проектов, последний: ${mergedConfig.lastProjectPath || 'нет'}`);
          // Сохраняем восстановленную конфигурацию
          await saveConfig(mergedConfig);
          return mergedConfig;
        }
        throw parseError;
      }
    }
  } catch (error) {
    // Если файл поврежден и не удалось восстановить, логируем ошибку
    console.error('[ConfigStorage] Ошибка загрузки конфигурации:', error instanceof Error ? error.message : error);
    console.error('[ConfigStorage] Путь к конфигу:', configPath);
    // Создаем резервную копию поврежденного файла
    if (existsSync(configPath)) {
      const backupPath = `${configPath}.backup.${Date.now()}`;
      try {
        await fs.copyFile(configPath, backupPath);
        console.error(`[ConfigStorage] Создана резервная копия: ${backupPath}`);
      } catch (backupError) {
        console.error('[ConfigStorage] Не удалось создать резервную копию:', backupError);
      }
    }
  }

  return defaultConfig;
};

export const saveConfig = async (config: IDEConfig): Promise<void> => {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  const tempPath = `${configPath}.tmp`;
  
  try {
    // Создаем директорию, если её нет (с рекурсивным созданием родительских директорий)
    await fs.mkdir(configDir, { recursive: true });
    
    const configJson = JSON.stringify(config, null, 2);
    
    // Записываем во временный файл для атомарности операции
    await fs.writeFile(tempPath, configJson, 'utf-8');
    
    // Проверяем, что директория все еще существует перед переименованием
    // Это защита от race condition, когда директория может быть удалена между операциями
    if (!existsSync(configDir)) {
      await fs.mkdir(configDir, { recursive: true });
    }
    
    // Атомарно заменяем старый файл новым
    await fs.rename(tempPath, configPath);
    
    console.log(`[ConfigStorage] Конфигурация сохранена: ${config.openProjects?.length || 0} открытых проектов, последний: ${config.lastProjectPath || 'нет'}`);
  } catch (error) {
    // Удаляем временный файл в случае ошибки
    try {
      if (existsSync(tempPath)) {
        await fs.unlink(tempPath);
      }
    } catch {
      // Игнорируем ошибку удаления временного файла
    }
    console.error('[ConfigStorage] Ошибка сохранения конфигурации:', error instanceof Error ? error.message : error);
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
  if (!config.openProjects.includes(projectPath)) {
    config.openProjects.push(projectPath);
    await saveConfig(config);
    console.log(`[ConfigStorage] Проект добавлен: ${projectPath}`);
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


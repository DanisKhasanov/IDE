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

// Singleton объект конфига в памяти
let configCache: IDEConfig | null = null;
let configLoadPromise: Promise<IDEConfig> | null = null;
let saveTimeoutId: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 300; // Задержка перед сохранением (debounce)

const defaultConfig: IDEConfig = {
  lastProjectPath: null,
  projects: {},
  openProjects: [],
  toolchainInstalled: false,
  toolchainChecked: false,
};

/**
 * Попытка восстановить данные из поврежденного JSON
 */
const tryRepairJson = (content: string): IDEConfig | null => {
  try {
    // Пытаемся найти последнюю закрывающую скобку объекта
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace === -1) {
      return null;
    }
    
    // Берем часть до последней закрывающей скобки
    let candidate = content.substring(0, lastBrace + 1);
    
    // Пытаемся найти начало объекта
    const firstBrace = candidate.indexOf('{');
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

// Внутренняя функция загрузки конфига из файла (только один раз или при принудительной перезагрузке)
const loadConfigFromFile = async (forceReload = false): Promise<IDEConfig> => {
  // Если уже идет загрузка, ждем её
  if (configLoadPromise && !forceReload) {
    return configLoadPromise;
  }

  // Если конфиг уже загружен и не требуется перезагрузка, возвращаем кэш
  if (configCache && !forceReload) {
    return configCache;
  }

  const configPath = getConfigPath();

  configLoadPromise = (async () => {
    try {
      if (existsSync(configPath)) {
        const content = await fs.readFile(configPath, 'utf-8');
        const trimmedContent = content.trim();
        if (trimmedContent === '') {
          configCache = { ...defaultConfig };
          configLoadPromise = null;
          return configCache;
        }
        
        try {
          const parsed = JSON.parse(trimmedContent);
          const mergedConfig = { ...defaultConfig, ...parsed };
          
          // Восстанавливаем openProjects, если нужно
          // Восстанавливаем только если openProjects отсутствует в исходном JSON (undefined) или null,
          // но НЕ если это явно пустой массив (что означает, что пользователь закрыл все проекты)
          // Проверяем исходный parsed объект ДО слияния с defaultConfig
          const shouldRestore = parsed.openProjects === undefined || parsed.openProjects === null;
          if (shouldRestore && 
              (mergedConfig.lastProjectPath || Object.keys(mergedConfig.projects || {}).length > 0)) {
            const projectPaths = Object.keys(mergedConfig.projects || {});
            if (projectPaths.length > 0) {
              mergedConfig.openProjects = projectPaths;
              console.log(`[ConfigStorage] Восстановлен список открытых проектов из projects: ${projectPaths.length} проектов`);
            } else if (mergedConfig.lastProjectPath) {
              mergedConfig.openProjects = [mergedConfig.lastProjectPath];
              console.log(`[ConfigStorage] Восстановлен список открытых проектов из lastProjectPath: ${mergedConfig.lastProjectPath}`);
            }
            
            // Сохраняем восстановленную конфигурацию синхронно (без debounce)
            await saveConfigToFile(mergedConfig, false);
          }
          
          configCache = mergedConfig;
          configLoadPromise = null;
          console.log(`[ConfigStorage] Конфигурация загружена: ${mergedConfig.openProjects?.length || 0} открытых проектов, последний: ${mergedConfig.lastProjectPath || 'нет'}`);
          return mergedConfig;
        } catch (parseError) {
          console.error('[ConfigStorage] Ошибка парсинга JSON, пытаемся восстановить данные...');
          const repaired = tryRepairJson(trimmedContent);
          if (repaired) {
            const mergedConfig = { ...defaultConfig, ...repaired };
            
            // Восстанавливаем только если openProjects отсутствует в исходном JSON (undefined) или null
            // Проверяем исходный repaired объект ДО слияния с defaultConfig
            const shouldRestore = repaired.openProjects === undefined || repaired.openProjects === null;
            if (shouldRestore && 
                (mergedConfig.lastProjectPath || Object.keys(mergedConfig.projects || {}).length > 0)) {
              const projectPaths = Object.keys(mergedConfig.projects || {});
              if (projectPaths.length > 0) {
                mergedConfig.openProjects = projectPaths;
              } else if (mergedConfig.lastProjectPath) {
                mergedConfig.openProjects = [mergedConfig.lastProjectPath];
              }
              await saveConfigToFile(mergedConfig, false);
            }
            
            configCache = mergedConfig;
            configLoadPromise = null;
            console.log(`[ConfigStorage] Данные восстановлены: ${mergedConfig.openProjects?.length || 0} открытых проектов, последний: ${mergedConfig.lastProjectPath || 'нет'}`);
            return mergedConfig;
          }
          throw parseError;
        }
      }
    } catch (error) {
      console.error('[ConfigStorage] Ошибка загрузки конфигурации:', error instanceof Error ? error.message : error);
      console.error('[ConfigStorage] Путь к конфигу:', configPath);
    }

    configCache = { ...defaultConfig };
    configLoadPromise = null;
    return configCache;
  })();

  return configLoadPromise;
};

// Внутренняя функция сохранения конфига на диск
const saveConfigToFile = async (config: IDEConfig, debounce = true): Promise<void> => {
  // Отменяем предыдущий таймер сохранения, если есть
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
    saveTimeoutId = null;
  }

  const doSave = async () => {
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    const tempPath = `${configPath}.tmp`;
    
    try {
      await fs.mkdir(configDir, { recursive: true });
      const configJson = JSON.stringify(config, null, 2);
      await fs.writeFile(tempPath, configJson, 'utf-8');
      
      if (!existsSync(configDir)) {
        await fs.mkdir(configDir, { recursive: true });
      }
      
      await fs.rename(tempPath, configPath);
      
      // Обновляем кэш после успешного сохранения
      configCache = config;
      
      console.log(`[ConfigStorage] Конфигурация сохранена: ${config.openProjects?.length || 0} открытых проектов, последний: ${config.lastProjectPath || 'нет'}`);
    } catch (error) {
      // Инвалидируем кэш при ошибке, чтобы при следующей загрузке прочитать из файла
      configCache = null;
      
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

  if (debounce) {
    // Используем debounce для частых изменений
    saveTimeoutId = setTimeout(() => {
      doSave();
      saveTimeoutId = null;
    }, SAVE_DEBOUNCE_MS);
  } else {
    // Сохраняем немедленно (для критичных операций)
    await doSave();
  }
};

// Публичный API - всегда возвращает актуальный конфиг из памяти
export const loadConfig = async (): Promise<IDEConfig> => {
  return loadConfigFromFile(false);
};

// Принудительная перезагрузка конфига из файла
export const reloadConfig = async (): Promise<IDEConfig> => {
  return loadConfigFromFile(true);
};

// Сохранение конфига (с debounce)
export const saveConfig = async (config: IDEConfig): Promise<void> => {
  // Обновляем кэш сразу
  configCache = config;
  // Сохраняем на диск с debounce
  await saveConfigToFile(config, true);
};

// Получение текущего конфига из памяти (синхронно, без чтения файла)
export const getConfig = (): IDEConfig => {
  if (!configCache) {
    // Если конфиг еще не загружен, возвращаем дефолтный
    return { ...defaultConfig };
  }
  return configCache;
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
  // Также удаляем состояние проекта, чтобы при следующем запуске он не восстанавливался
  if (config.projects[projectPath]) {
    delete config.projects[projectPath];
  }
  await saveConfig(config);
};

// Удаление состояния проекта (используется при полном удалении проекта)
export const removeProjectState = async (projectPath: string): Promise<void> => {
  const config = await loadConfig();
  if (config.projects[projectPath]) {
    delete config.projects[projectPath];
    await saveConfig(config);
  }
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


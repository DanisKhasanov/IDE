// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Выбор папки проекта
const selectProjectFolder = async () => {
  try {
    console.log('Вызываем IPC select-project-folder...');
    const result = await ipcRenderer.invoke('select-project-folder');
    console.log('Результат select-project-folder:', result);
    return result;
  } catch (error) {
    console.error('Ошибка в selectProjectFolder:', error);
    console.error('Детали ошибки:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    throw error;
  }
};

// Создание файла
const createFile = async (parentPath: string) => {
  try {
    return await ipcRenderer.invoke('create-file', parentPath);
  } catch (error) {
    console.error('Ошибка в createFile:', error);
    throw error;
  }
};

// Создание папки
const createFolder = async (parentPath: string) => {
  try {
    return await ipcRenderer.invoke('create-folder', parentPath);
  } catch (error) {
    console.error('Ошибка в createFolder:', error);
    throw error;
  }
};

// Чтение файла
const readFile = async (filePath: string) => {
  try {
    return await ipcRenderer.invoke('read-file', filePath);
  } catch (error) {
    console.error('Ошибка в readFile:', error);
    throw error;
  }
};

// Получение дерева проекта
const getProjectTree = async () => {
  try {
    return await ipcRenderer.invoke('get-project-tree');
  } catch (error) {
    console.error('Ошибка в getProjectTree:', error);
    throw error;
  }
};

// Получение состояния проекта
const getProjectState = async (projectPath: string) => {
  try {
    return await ipcRenderer.invoke('get-project-state', projectPath);
  } catch (error) {
    console.error('Ошибка в getProjectState:', error);
    throw error;
  }
};

// Сохранение состояния проекта
const saveProjectState = async (projectPath: string, state: Partial<{
  expandedFolders: string[];
  openedFiles: Array<{ path: string; id: string }>;
  activeFileId: string | null;
  isTerminalVisible?: boolean;
}>) => {
  try {
    return await ipcRenderer.invoke('save-project-state', projectPath, state);
  } catch (error) {
    console.error('Ошибка в saveProjectState:', error);
    throw error;
  }
};

// Получение пути к последнему проекту
const getLastProjectPath = async () => {
  try {
    return await ipcRenderer.invoke('get-last-project-path');
  } catch (error) {
    console.error('Ошибка в getLastProjectPath:', error);
    throw error;
  }
};

// Загрузка последнего проекта
const loadLastProject = async () => {
  try {
    return await ipcRenderer.invoke('load-last-project');
  } catch (error) {
    console.error('Ошибка в loadLastProject:', error);
    throw error;
  }
};

// Получение списка открытых проектов
const getOpenProjects = async () => {
  try {
    return await ipcRenderer.invoke('get-open-projects');
  } catch (error) {
    console.error('Ошибка в getOpenProjects:', error);
    throw error;
  }
};

// Переключение на другой проект
const switchProject = async (projectPath: string) => {
  try {
    return await ipcRenderer.invoke('switch-project', projectPath);
  } catch (error) {
    console.error('Ошибка в switchProject:', error);
    throw error;
  }
};

// Закрытие проекта
const closeProject = async (projectPath: string) => {
  try {
    return await ipcRenderer.invoke('close-project', projectPath);
  } catch (error) {
    console.error('Ошибка в closeProject:', error);
    throw error;
  }
};

// Загрузка всех открытых проектов при старте
const loadOpenProjects = async () => {
  try {
    return await ipcRenderer.invoke('load-open-projects');
  } catch (error) {
    console.error('Ошибка в loadOpenProjects:', error);
    throw error;
  }
};

// Сохранение состояния терминала
const saveTerminalState = async (projectPath: string, isVisible: boolean) => {
  try {
    return await ipcRenderer.invoke('save-terminal-state', projectPath, isVisible);
  } catch (error) {
    console.error('Ошибка в saveTerminalState:', error);
    throw error;
  }
};

// Получение состояния терминала
const getTerminalState = async (projectPath: string) => {
  try {
    return await ipcRenderer.invoke('get-terminal-state', projectPath);
  } catch (error) {
    console.error('Ошибка в getTerminalState:', error);
    throw error;
  }
};

// Подписка на событие переключения терминала
const onToggleTerminal = (callback: () => void) => {
  ipcRenderer.on('toggle-terminal', callback);
  // Возвращаем функцию для отписки
  return () => {
    ipcRenderer.removeListener('toggle-terminal', callback);
  };
};

// Подписка на события меню
const onMenuOpenProject = (callback: () => void) => {
  ipcRenderer.on('menu-open-project', callback);
  return () => {
    ipcRenderer.removeListener('menu-open-project', callback);
  };
};

// Подписка на событие создания нового файла
const onMenuNewFile = (callback: () => void) => {
  ipcRenderer.on('menu-new-file', callback);
  return () => {
    ipcRenderer.removeListener('menu-new-file', callback);
  };
};

// Подписка на событие сохранения файла
const onMenuSaveFile = (callback: () => void) => {
  ipcRenderer.on('menu-save-file', callback);
  return () => {
    ipcRenderer.removeListener('menu-save-file', callback);
  };
};

// Подписка на событие сохранения файла как
const onMenuSaveFileAs = (callback: () => void) => {
  ipcRenderer.on('menu-save-file-as', callback);
  return () => {
    ipcRenderer.removeListener('menu-save-file-as', callback);
  };
};

// Подписка на событие изменения списка проектов
const onProjectListChanged = (callback: () => void) => {
  ipcRenderer.on('project-list-changed', callback);
  return () => {
    ipcRenderer.removeListener('project-list-changed', callback);
  };
};

// Сохранение файла
const saveFile = async (filePath: string, content: string) => {
  try {
    return await ipcRenderer.invoke('save-file', filePath, content);
  } catch (error) {
    console.error('Ошибка в saveFile:', error);
    throw error;
  }
};

// Сохранение файла как
const saveFileAs = async (currentFilePath: string, content: string) => {
  try {
    return await ipcRenderer.invoke('save-file-as', currentFilePath, content);
  } catch (error) {
    console.error('Ошибка в saveFileAs:', error);
    throw error;
  }
};

contextBridge.exposeInMainWorld('electronAPI', {
  selectProjectFolder,
  createFile,
  createFolder,
  readFile,
  getProjectTree,
  getProjectState,
  saveProjectState,
  getLastProjectPath,
  loadLastProject,
  getOpenProjects,
  switchProject,
  closeProject,
  loadOpenProjects,
  saveTerminalState,
  getTerminalState,
  onToggleTerminal,
  onMenuOpenProject,
  onMenuNewFile,
  onMenuSaveFile,
  onMenuSaveFileAs,
  onProjectListChanged,
  saveFile,
  saveFileAs,
});

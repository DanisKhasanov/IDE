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
const saveProjectState = async (projectPath: string, state: any) => {
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

contextBridge.exposeInMainWorld('electronAPI', {
  // Новые методы для работы с проектом
  selectProjectFolder,
  createFile,
  createFolder,
  readFile,
  getProjectTree,
  // Методы для работы с конфигурацией
  getProjectState,
  saveProjectState,
  getLastProjectPath,
  loadLastProject,
  // Методы для работы с несколькими проектами
  getOpenProjects,
  switchProject,
  closeProject,
  loadOpenProjects,
  // Старые методы (для обратной совместимости)
  onFileOpened: (callback: (payload: { path: string; name: string; content: string }) => void) => {
    const unsubscribe = () => {};
    return unsubscribe;
  },
  onFileOpenError: (callback: (payload: { message: string }) => void) => {
    const unsubscribe = () => {};
    return unsubscribe;
  },
  onProjectOpened: (callback: (payload: any) => void) => {
    const unsubscribe = () => {};
    return unsubscribe;
  },
  onProjectOpenError: (callback: (payload: { message: string }) => void) => {
    const unsubscribe = () => {};
    return unsubscribe;
  },
  onProjectRemoved: (callback: (payload: { path: string }) => void) => {
    const unsubscribe = () => {};
    return unsubscribe;
  },
  openFileByPath: async (filePath: string): Promise<void> => {
    // Реализация может быть добавлена позже
  },
  removeProject: async (projectPath: string): Promise<void> => {
    // Реализация может быть добавлена позже
  },
});

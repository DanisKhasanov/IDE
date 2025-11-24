import { safeInvoke } from "./utils";

/**
 * API для работы с проектами
 */
export const projectAPI = {
  // Выбор папки проекта
  selectProjectFolder: async () => {
    return safeInvoke("select-project-folder");
  },

  // Выбор родительской папки (без открытия как проекта)
  selectParentFolder: async () => {
    return safeInvoke("select-parent-folder");
  },

  // Создание файла
  createFile: async (parentPath: string) => {
    return safeInvoke("create-file", parentPath);
  },

  // Создание папки
  createFolder: async (parentPath: string) => {
    return safeInvoke("create-folder", parentPath);
  },

  // Чтение файла
  readFile: async (filePath: string) => {
    return safeInvoke("read-file", filePath);
  },

  // Получение дерева проекта
  getProjectTree: async () => {
    return safeInvoke("get-project-tree");
  },

  // Получение состояния проекта
  getProjectState: async (projectPath: string) => {
    return safeInvoke("get-project-state", projectPath);
  },

  // Сохранение состояния проекта
  saveProjectState: async (
    projectPath: string,
    state: Partial<{
      expandedFolders: string[];
      openedFiles: Array<{ path: string; id: string }>;
      activeFileId: string | null;
      isTerminalVisible?: boolean;
    }>
  ) => {
    return safeInvoke("save-project-state", projectPath, state);
  },

  // Получение пути к последнему проекту
  getLastProjectPath: async () => {
    return safeInvoke("get-last-project-path");
  },

  // Загрузка последнего проекта
  loadLastProject: async () => {
    return safeInvoke("load-last-project");
  },

  // Получение списка открытых проектов
  getOpenProjects: async () => {
    return safeInvoke("get-open-projects");
  },

  // Переключение на другой проект
  switchProject: async (projectPath: string) => {
    return safeInvoke("switch-project", projectPath);
  },

  // Закрытие проекта
  closeProject: async (projectPath: string) => {
    return safeInvoke("close-project", projectPath);
  },

  // Загрузка всех открытых проектов при старте
  loadOpenProjects: async () => {
    return safeInvoke("load-open-projects");
  },

  // Создание нового проекта (создание папки и открытие)
  createNewProject: async (parentPath: string, projectName: string) => {
    return safeInvoke("create-new-project", parentPath, projectName);
  },

  // Обновление дерева проекта (например, после компиляции)
  refreshProjectTree: async (projectPath?: string) => {
    return safeInvoke("refresh-project-tree", projectPath);
  },
};

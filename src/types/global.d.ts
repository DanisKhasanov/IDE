export {};

import type { ProjectTreeNode } from './project';

type OpenedProjectPayload = {
  path: string;
  name: string;
  tree: ProjectTreeNode;
};

type ProjectState = {
  expandedFolders: string[];
  openedFiles: Array<{ path: string; id: string }>;
  activeFileId: string | null;
};

declare global {
  // Глобальные переменные, определенные Vite плагином для Electron
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
  const MAIN_WINDOW_VITE_NAME: string;

  interface Window {
    electronAPI: {
      // Новые методы для работы с проектом
      selectProjectFolder: () => Promise<OpenedProjectPayload | null>;
      selectParentFolder: () => Promise<{ path: string } | null>;
      createNewProject: (parentPath: string, projectName: string) => Promise<OpenedProjectPayload | null>;
      createFile: (parentPath: string, projectPath?: string) => Promise<OpenedProjectPayload | null>;
      createFolder: (parentPath: string, projectPath?: string) => Promise<OpenedProjectPayload | null>;
      deleteFile: (filePath: string, projectPath?: string) => Promise<OpenedProjectPayload | null>;
      deleteFolder: (folderPath: string, projectPath?: string) => Promise<OpenedProjectPayload | null>;
      readFile: (filePath: string) => Promise<import('./editor').EditorFile>;
      getProjectTree: () => Promise<OpenedProjectPayload | null>;
      // Методы для работы с конфигурацией
      getProjectState: (projectPath: string) => Promise<ProjectState | null>;
      saveProjectState: (projectPath: string, state: Partial<ProjectState>) => Promise<void>;
      getLastProjectPath: () => Promise<string | null>;
      loadLastProject: () => Promise<OpenedProjectPayload | null>;
      // Методы для работы с несколькими проектами
      getOpenProjects: () => Promise<Array<{ path: string; name: string }>>;
      switchProject: (projectPath: string) => Promise<OpenedProjectPayload>;
      closeProject: (projectPath: string) => Promise<{ success: boolean }>;
      loadOpenProjects: () => Promise<OpenedProjectPayload[]>;
      refreshProjectTree: (projectPath?: string) => Promise<OpenedProjectPayload>;
      // Методы для работы с терминалом
      saveTerminalState: (projectPath: string, isVisible: boolean) => Promise<{ success: boolean }>;
      getTerminalState: (projectPath: string) => Promise<boolean>;
      onToggleTerminal: (callback: () => void) => () => void;
      createTerminal: (cwd?: string) => Promise<number>;
      writeTerminal: (terminalId: number, data: string) => Promise<{ success: boolean }>;
      resizeTerminal: (terminalId: number, cols: number, rows: number) => Promise<{ success: boolean }>;
      destroyTerminal: (terminalId: number) => Promise<{ success: boolean }>;
      onTerminalData: (terminalId: number, callback: (data: string) => void) => () => void;
      // Обработчики событий меню
      onMenuOpenProject: (callback: () => void) => () => void;
      onMenuNewProject: (callback: () => void) => () => void;
      onMenuSaveFile: (callback: () => void) => () => void;
      onMenuSaveFileAs: (callback: () => void) => () => void;
      // Обработчик изменения списка проектов
      onProjectListChanged: (callback: () => void) => () => void;
      // Методы для сохранения файлов
      saveFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
      saveFileAs: (currentFilePath: string, content: string) => Promise<{ success: boolean; filePath: string } | null>;
      // Arduino компиляция
      arduinoCompile: (projectPath: string, boardName?: string) => Promise<import('./arduino').CompileResult>;
      arduinoDetectProject: (projectPath: string) => Promise<import('./arduino').ArduinoProjectInfo>;
      arduinoGetBoards: () => Promise<string[]>;
      arduinoGetBoardConfig: (boardName?: string) => Promise<import('./arduino').BoardConfig>;
    };
  }
}


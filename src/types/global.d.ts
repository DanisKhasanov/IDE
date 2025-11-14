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
  interface Window {
    electronAPI: {
      // Новые методы для работы с проектом
      selectProjectFolder: () => Promise<OpenedProjectPayload | null>;
      createFile: (parentPath: string, projectPath?: string) => Promise<OpenedProjectPayload | null>;
      createFolder: (parentPath: string, projectPath?: string) => Promise<OpenedProjectPayload | null>;
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
      onMenuNewFile: (callback: () => void) => () => void;
      onMenuSaveFile: (callback: () => void) => () => void;
      onMenuSaveFileAs: (callback: () => void) => () => void;
      // Обработчик изменения списка проектов
      onProjectListChanged: (callback: () => void) => () => void;
      // Методы для сохранения файлов
      saveFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
      saveFileAs: (currentFilePath: string, content: string) => Promise<{ success: boolean; filePath: string } | null>;
    };
  }
}


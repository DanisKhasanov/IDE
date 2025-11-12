export {};

import type { ProjectTreeNode } from './project';

type OpenedFilePayload = {
  path: string;
  name: string;
  content: string;
};

type FileOpenErrorPayload = {
  message: string;
};

type OpenedProjectPayload = {
  path: string;
  name: string;
  tree: ProjectTreeNode;
};

type ProjectOpenErrorPayload = {
  message: string;
};

type ProjectRemovedPayload = {
  path: string;
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
      // Старые методы (для обратной совместимости)
      onFileOpened: (callback: (payload: OpenedFilePayload) => void) => () => void;
      onFileOpenError: (callback: (payload: FileOpenErrorPayload) => void) => () => void;
      onProjectOpened: (callback: (payload: OpenedProjectPayload) => void) => () => void;
      onProjectOpenError: (callback: (payload: ProjectOpenErrorPayload) => void) => () => void;
      onProjectRemoved: (callback: (payload: ProjectRemovedPayload) => void) => () => void;
      openFileByPath: (filePath: string) => Promise<void>;
      removeProject: (projectPath: string) => Promise<void>;
    };
  }
}


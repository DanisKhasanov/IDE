export {};

import type { ToolchainStatus, InstallCommands, InstallProgress, InstallResult } from './toolchain';

import type { ProjectTreeNode } from './project';

// Типы для импорта изображений
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

// Типы для Vite import.meta.glob
declare global {
  interface ImportMeta {
    glob: <T = { [key: string]: any }>(
      pattern: string,
      options?: {
        eager?: boolean;
        import?: string;
        query?: string;
      }
    ) => Record<string, T>;
  }
}

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
      createNewProject: (parentPath: string, projectName: string, pinConfig?: any) => Promise<OpenedProjectPayload | null>;
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
      getProjectSourceFiles: (projectPath: string) => Promise<string[]>;
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
      // Обработчик переключения темы
      onToggleTheme: (callback: () => void) => () => void;
      // Обработчики показа панелей
      onShowGuiPanel: (callback: () => void) => () => void;
      onShowGraphicalInit: (callback: () => void) => () => void;
      // Методы для сохранения файлов
      saveFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
      saveFileAs: (currentFilePath: string, content: string) => Promise<{ success: boolean; filePath: string } | null>;
      // Arduino компиляция
      arduinoCompile: (projectPath: string, boardName?: string) => Promise<import('./arduino').CompileResult>;
      arduinoDetectProject: (projectPath: string) => Promise<import('./arduino').ArduinoProjectInfo>;
      arduinoGetBoards: () => Promise<string[]>;
      arduinoGetBoardConfig: (boardName?: string) => Promise<import('./arduino').BoardConfig>;
      // UI-конфиги плат (json для интерфейса: пины/периферия/конфликты)
      getBoardUiConfig: (boardName?: string) => Promise<{
        config: any;
        source: "external";
        externalDir: string;
        externalPath: string;
      }>;
      getBoardUiExternalDir: () => Promise<string>;
      // Arduino заливка прошивки и работа с портами
      // Единственный метод для получения списка портов - использует SerialPortWatcher
      arduinoDetectPorts: () => Promise<import('./arduino').SerialPortInfo[]>;
      arduinoUploadFirmware: (hexFilePath: string, portPath: string, boardName?: string) => Promise<import('./arduino').UploadResult>;
      arduinoCheckPortPermissions: () => Promise<import('./arduino').SerialPortPermissionStatus>;
      arduinoSetupPortPermissions: () => Promise<import('./arduino').SerialPortPermissionSetupResult>;
      // Подписки на события портов (event-driven)
      arduinoOnPortsChanged: (callback: (ports: import('./arduino').SerialPortInfo[]) => void) => () => void;
      arduinoOnPermissionsChanged: (callback: (permissions: import('./arduino').SerialPortPermissionStatus) => void) => () => void;
      // Toolchain API
      toolchainCheck: () => Promise<ToolchainStatus>;
      toolchainGetInstallCommands: () => Promise<InstallCommands>;
      toolchainGetInstallInstructions: () => Promise<string>;
      toolchainGetInstalledStatus: () => Promise<{ installed: boolean; checked: boolean }>;
      toolchainSetInstalled: (installed: boolean) => Promise<{ success: boolean; error?: string }>;
      toolchainInstall: () => Promise<InstallResult>;
      onToolchainInstallProgress: (callback: (progress: InstallProgress) => void) => () => void;
      // UI API
      getGuiPanelVisible: () => Promise<boolean>;
      setGuiPanelVisible: (visible: boolean) => Promise<{ success: boolean }>;
      getGraphicalInitVisible: () => Promise<boolean>;
      setGraphicalInitVisible: (visible: boolean) => Promise<{ success: boolean }>;
      // Serial Data API
      serialDataOpen: (portPath: string, baudRate?: number) => Promise<{ success: boolean; error?: string }>;
      serialDataClose: (portPath: string) => Promise<{ success: boolean; error?: string }>;
      serialDataWrite: (portPath: string, data: string) => Promise<{ success: boolean; error?: string }>;
      serialDataGetOpenPorts: () => Promise<{ success: boolean; ports?: string[] }>;
      serialDataOnData: (callback: (portPath: string, data: Record<string, any>) => void) => () => void;
      serialDataOnError: (callback: (portPath: string, error: string) => void) => () => void;
      serialDataOnClose: (callback: (portPath: string) => void) => () => void;
    };
  }
}


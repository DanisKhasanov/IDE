import { projectAPI } from './projectAPI';
import { fileAPI } from './fileAPI';
import { terminalAPI } from './terminalAPI';
import { arduinoAPI } from './arduinoAPI';
import { menuAPI } from './menuAPI';
import { toolchainAPI } from './toolchainAPI';

/**
 * Сборка всех API для экспорта через contextBridge
 */
export const electronAPI = {
  // API для работы с проектами
  selectProjectFolder: projectAPI.selectProjectFolder,
  selectParentFolder: projectAPI.selectParentFolder,
  createNewProject: projectAPI.createNewProject,
  createFile: projectAPI.createFile,
  createFolder: projectAPI.createFolder,
  deleteFile: projectAPI.deleteFile,
  deleteFolder: projectAPI.deleteFolder,
  readFile: projectAPI.readFile,
  getProjectTree: projectAPI.getProjectTree,
  getProjectState: projectAPI.getProjectState,
  saveProjectState: projectAPI.saveProjectState,
  getLastProjectPath: projectAPI.getLastProjectPath,
  loadLastProject: projectAPI.loadLastProject,
  getOpenProjects: projectAPI.getOpenProjects,
  switchProject: projectAPI.switchProject,
  closeProject: projectAPI.closeProject,
  loadOpenProjects: projectAPI.loadOpenProjects,
  refreshProjectTree: projectAPI.refreshProjectTree,

  // API для работы с файлами
  saveFile: fileAPI.saveFile,
  saveFileAs: fileAPI.saveFileAs,

  // API для работы с терминалом
  saveTerminalState: terminalAPI.saveTerminalState,
  getTerminalState: terminalAPI.getTerminalState,
  onToggleTerminal: terminalAPI.onToggleTerminal,
  createTerminal: terminalAPI.createTerminal,
  writeTerminal: terminalAPI.writeTerminal,
  resizeTerminal: terminalAPI.resizeTerminal,
  destroyTerminal: terminalAPI.destroyTerminal,
  onTerminalData: terminalAPI.onTerminalData,

  // API для работы с событиями меню
  onMenuOpenProject: menuAPI.onMenuOpenProject,
  onMenuNewProject: menuAPI.onMenuNewProject,
  onMenuSaveFile: menuAPI.onMenuSaveFile,
  onMenuSaveFileAs: menuAPI.onMenuSaveFileAs,
  onProjectListChanged: menuAPI.onProjectListChanged,

  // API для работы с Arduino
  arduinoCompile: arduinoAPI.compile,
  arduinoDetectProject: arduinoAPI.detectProject,
  arduinoGetBoards: arduinoAPI.getBoards,
  arduinoGetBoardConfig: arduinoAPI.getBoardConfig,

  // API для работы с toolchain
  toolchainCheck: toolchainAPI.check,
  toolchainGetInstallCommands: toolchainAPI.getInstallCommands,
  toolchainGetInstallInstructions: toolchainAPI.getInstallInstructions,
  toolchainGetInstalledStatus: toolchainAPI.getInstalledStatus,
  toolchainSetInstalled: toolchainAPI.setInstalled,
  toolchainInstall: toolchainAPI.install,
  onToolchainInstallProgress: toolchainAPI.onInstallProgress,
};


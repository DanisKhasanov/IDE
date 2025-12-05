import { ipcMain } from "electron";
import { registerProjectHandlers } from "./projectHandlers";
import { registerFileHandlers } from "./fileHandlers";
import { registerTerminalHandlers } from "./terminalHandlers";
import { registerArduinoHandlers } from "./arduinoHandlers";
import { registerToolchainHandlers } from "./toolchainHandlers";

/**
 * Список всех IPC обработчиков для удаления при hot reload
 */
const ALL_HANDLERS = [
  "select-project-folder",
  "select-parent-folder",
  "create-new-project",
  "create-file",
  "create-folder",
  "delete-file",
  "delete-folder",
  "read-file",
  "get-project-tree",
  "get-project-state",
  "save-project-state",
  "get-last-project-path",
  "load-last-project",
  "get-open-projects",
  "switch-project",
  "close-project",
  "load-open-projects",
  "save-terminal-state",
  "get-terminal-state",
  "create-terminal",
  "write-terminal",
  "resize-terminal",
  "destroy-terminal",
  "save-file",
  "save-file-as",
  "arduino-compile",
  "arduino-detect-project",
  "arduino-get-boards",
  "arduino-get-board-config",
  "toolchain-check",
  "toolchain-get-install-commands",
  "toolchain-get-install-instructions",
  "toolchain-get-installed-status",
  "toolchain-set-installed",
  "toolchain-install",
];

/**
 * Удалить все зарегистрированные обработчики (для hot reload)
 */
function removeAllHandlers(): void {
  ALL_HANDLERS.forEach((handler) => {
    try {
      ipcMain.removeHandler(handler);
    } catch (e) {
      // Игнорируем ошибки, если обработчика нет
    }
  });
}

/**
 * Регистрация всех IPC обработчиков
 */
export function registerIpcHandlers(): void {
  console.log("Регистрируем IPC обработчики...");

  // Удаляем старые обработчики, если они есть (для hot reload)
  removeAllHandlers();

  // Регистрируем все обработчики
  registerProjectHandlers();
  registerFileHandlers();
  registerTerminalHandlers();
  registerArduinoHandlers();
  registerToolchainHandlers();
}


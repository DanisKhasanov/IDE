import { ipcMain } from "electron";
import { saveProjectState, getProjectState } from "@utils/config/ConfigStorage";
import { terminalManager } from "@main/managers/TerminalManager";

/**
 * Регистрация IPC обработчиков для работы с терминалами
 */
export function registerTerminalHandlers(): void {
  // Сохранение состояния терминала
  ipcMain.handle(
    "save-terminal-state",
    async (_event, projectPath: string, isVisible: boolean) => {
      try {
        await saveProjectState(projectPath, { isTerminalVisible: isVisible });
        return { success: true };
      } catch (error) {
        console.error("Ошибка сохранения состояния терминала:", error);
        throw error;
      }
    }
  );

  // Получение состояния терминала
  ipcMain.handle("get-terminal-state", async (_event, projectPath: string) => {
    try {
      const state = await getProjectState(projectPath);
      return state?.isTerminalVisible ?? false;
    } catch (error) {
      console.error("Ошибка получения состояния терминала:", error);
      return false;
    }
  });

  // Создание терминала
  ipcMain.handle("create-terminal", async (_event, cwd?: string) => {
    try {
      return terminalManager.createTerminal(cwd);
    } catch (error) {
      console.error("Ошибка создания терминала:", error);
      throw error;
    }
  });

  // Запись данных в терминал
  ipcMain.handle("write-terminal", (_event, terminalId: number, data: string) => {
    try {
      terminalManager.writeToTerminal(terminalId, data);
      return { success: true };
    } catch (error) {
      console.error("Ошибка записи в терминал:", error);
      throw error;
    }
  });

  // Изменение размера терминала
  ipcMain.handle(
    "resize-terminal",
    (_event, terminalId: number, cols: number, rows: number) => {
      try {
        terminalManager.resizeTerminal(terminalId, cols, rows);
        return { success: true };
      } catch (error) {
        console.error("Ошибка изменения размера терминала:", error);
        throw error;
      }
    }
  );

  // Уничтожение терминала
  ipcMain.handle("destroy-terminal", (_event, terminalId: number) => {
    try {
      const success = terminalManager.destroyTerminal(terminalId);
      return { success };
    } catch (error) {
      console.error("Ошибка уничтожения терминала:", error);
      throw error;
    }
  });
}


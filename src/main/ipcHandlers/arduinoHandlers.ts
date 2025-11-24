import { ipcMain } from "electron";
import {
  compileArduinoProject,
  isArduinoProject,
  getAvailableBoards,
  parseBoardConfig,
} from "@utils/ArduinoCompiler";

/**
 * Регистрация IPC обработчиков для работы с Arduino
 */
export function registerArduinoHandlers(): void {
  // Arduino компиляция: компилировать проект
  ipcMain.handle(
    "arduino-compile",
    async (_event, projectPath: string, boardName: string = "uno") => {
      try {
        console.log("Запуск компиляции Arduino проекта:", projectPath);
        const result = await compileArduinoProject(projectPath, boardName);
        console.log("Результат компиляции:", result);
        return result;
      } catch (error) {
        console.error("Ошибка компиляции Arduino проекта:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  // Arduino: определение Arduino проекта
  ipcMain.handle(
    "arduino-detect-project",
    async (_event, projectPath: string) => {
      try {
        return await isArduinoProject(projectPath);
      } catch (error) {
        console.error("Ошибка определения Arduino проекта:", error);
        return { isArduino: false, projectPath };
      }
    }
  );

  // Arduino: получить список доступных плат
  ipcMain.handle("arduino-get-boards", async () => {
    try {
      return await getAvailableBoards();
    } catch (error) {
      console.error("Ошибка получения списка плат:", error);
      return ["uno", "nano", "mega", "leonardo"];
    }
  });

  // Arduino: получить конфигурацию платы
  ipcMain.handle(
    "arduino-get-board-config",
    async (_event, boardName: string = "uno") => {
      try {
        return await parseBoardConfig(boardName);
      } catch (error) {
        console.error("Ошибка получения конфигурации платы:", error);
        return {
          name: boardName,
          mcu: "atmega328p",
          fCpu: "16000000L",
          variant: "standard",
        };
      }
    }
  );
}


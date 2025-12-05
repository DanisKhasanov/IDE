import { ipcMain } from "electron";
import {
  compileArduinoProject,
  isArduinoProject,
  getAvailableBoards,
  parseBoardConfig,
} from "@utils/ArduinoCompiler";
import { listSerialPorts, detectArduinoPorts } from "@utils/SerialPortManager";
import { uploadFirmware } from "@utils/FirmwareUploader";

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

  // Arduino: получить список всех COM-портов
  ipcMain.handle("arduino-list-ports", async () => {
    try {
      return await listSerialPorts();
    } catch (error) {
      console.error("Ошибка получения списка портов:", error);
      return [];
    }
  });

  // Arduino: обнаружить Arduino порты
  ipcMain.handle("arduino-detect-ports", async () => {
    try {
      return await detectArduinoPorts();
    } catch (error) {
      console.error("Ошибка обнаружения Arduino портов:", error);
      return [];
    }
  });

  // Arduino: залить прошивку
  ipcMain.handle(
    "arduino-upload-firmware",
    async (
      _event,
      hexFilePath: string,
      portPath: string,
      boardName: string = "uno"
    ) => {
      try {
        console.log("Запуск заливки прошивки:", {
          hexFile: hexFilePath,
          port: portPath,
          board: boardName,
        });
        const boardConfig = await parseBoardConfig(boardName);
        const result = await uploadFirmware(hexFilePath, portPath, boardConfig);
        console.log("Результат заливки:", result);
        return result;
      } catch (error) {
        console.error("Ошибка заливки прошивки:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );
}


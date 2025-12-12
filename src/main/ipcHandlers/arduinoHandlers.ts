import { ipcMain } from "electron";
import {
  compileArduinoProject,
  isArduinoProject,
  getAvailableBoards,
  parseBoardConfig,
} from "@utils/arduino/ArduinoCompiler";
import { uploadFirmware } from "@utils/arduino/FirmwareUploader";
import { 
  setupSerialPortPermissions 
} from "@utils/serial/SerialPortPermissions";
import { serialPortWatcher } from "@main/managers/SerialPortWatcher";

/**
 * Регистрация IPC обработчиков для работы с Arduino
 */
export function registerArduinoHandlers(): void {
  // Arduino компиляция: компилировать проект
  ipcMain.handle(
    "arduino-compile",
    async (_event, projectPath: string, boardName = "uno") => {
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
    async (_event, boardName = "uno") => {
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

  // Arduino: обнаружить Arduino порты
  // Единственный метод для получения списка портов - использует SerialPortWatcher
  // Это централизованный источник данных о портах для всего приложения
  ipcMain.handle("arduino-detect-ports", async () => {
    try {
      // Получаем текущий список портов из watcher (быстро, из кеша)
      const cachedPorts = serialPortWatcher.getCurrentPorts();
      if (cachedPorts.length > 0) {
        return cachedPorts;
      }

      // Если кеш пуст, принудительно обновляем
      return await serialPortWatcher.refreshPorts();
    } catch (error) {
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
      boardName = "uno"
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

  // Arduino: проверить права доступа к COM-портам
  // Использует SerialPortWatcher для получения актуального статуса
  ipcMain.handle("arduino-check-port-permissions", async () => {
    try {
      // Получаем текущий статус из watcher (быстро, из кеша)
      const cachedPermissions = serialPortWatcher.getCurrentPermissions();
      if (cachedPermissions) {
        return cachedPermissions;
      }

      // Если кеш пуст, принудительно обновляем
      return await serialPortWatcher.refreshPermissions();
    } catch (error) {
      return {
        hasAccess: false,
        needsSetup: true,
        platform: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux",
        message: "Ошибка проверки прав доступа",
        canAutoFix: false,
      };
    }
  });

  // Arduino: настроить права доступа к COM-портам
  ipcMain.handle("arduino-setup-port-permissions", async () => {
    try {
      const result = await setupSerialPortPermissions();
      // После настройки прав обновляем статус в watcher
      if (result.success) {
        await serialPortWatcher.refreshPermissions();
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
}


import { ipcMain } from "electron";
import { checkToolchain } from "@utils/ToolchainChecker";
import { getInstallCommands, getInstallInstructions, ToolchainInstaller } from "@utils/ToolchainInstaller";
import { getToolchainInstalled, setToolchainInstalled, getToolchainChecked, setToolchainChecked } from "@utils/ConfigStorage";
import type { InstallProgress } from "@/types/toolchain";

/**
 * Регистрация IPC обработчиков для работы с toolchain
 */
export function registerToolchainHandlers(): void {
  // Проверка наличия toolchain
  ipcMain.handle("toolchain-check", async () => {
    try {
      const status = await checkToolchain();
      
      // Сохраняем статус установки и проверки в конфигурацию
      await setToolchainInstalled(status.installed);
      await setToolchainChecked(true);
      
      return status;
    } catch (error) {
      console.error("Ошибка проверки toolchain:", error);
      // При ошибке проверки помечаем, что проверка была выполнена, но toolchain не установлен
      await setToolchainChecked(true);
      await setToolchainInstalled(false);
      return {
        installed: false,
        tools: {
          avrGcc: false,
          avrObjcopy: false,
          avrdude: false,
        },
        versions: {},
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });

  // Получение команд установки для текущей платформы
  ipcMain.handle("toolchain-get-install-commands", async () => {
    try {
      return getInstallCommands();
    } catch (error) {
      console.error("Ошибка получения команд установки:", error);
      return {
        platform: "linux" as const,
        commands: [],
        description: "Ошибка определения платформы",
        instructions: ["Не удалось определить платформу для установки toolchain"],
      };
    }
  });

  // Получение инструкций по установке
  ipcMain.handle("toolchain-get-install-instructions", async () => {
    try {
      return getInstallInstructions();
    } catch (error) {
      console.error("Ошибка получения инструкций:", error);
      return "Не удалось получить инструкции по установке toolchain";
    }
  });

  // Получение статуса установки из конфигурации
  ipcMain.handle("toolchain-get-installed-status", async () => {
    try {
      const installed = await getToolchainInstalled();
      const checked = await getToolchainChecked();
      return { installed, checked };
    } catch (error) {
      console.error("Ошибка получения статуса toolchain:", error);
      return { installed: false, checked: false };
    }
  });

  // Установка статуса toolchain (после успешной установки)
  ipcMain.handle("toolchain-set-installed", async (_event, installed: boolean) => {
    try {
      await setToolchainInstalled(installed);
      return { success: true };
    } catch (error) {
      console.error("Ошибка сохранения статуса toolchain:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Установка toolchain
  ipcMain.handle("toolchain-install", async (event) => {
    try {
      const installer = new ToolchainInstaller();
      
      // Отправляем прогресс через события
      installer.on("progress", (progress: InstallProgress) => {
        event.sender.send("toolchain-install-progress", progress);
      });

      const result = await installer.install();
      
      // После установки проверяем toolchain
      if (result.success) {
        const status = await checkToolchain();
        await setToolchainInstalled(status.installed);
        await setToolchainChecked(true);
      }

      return result;
    } catch (error) {
      console.error("Ошибка установки toolchain:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}


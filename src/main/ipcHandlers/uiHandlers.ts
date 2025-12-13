import { ipcMain } from "electron";
import {
  getGuiPanelVisible,
  setGuiPanelVisible,
  getGraphicalInitVisible,
  setGraphicalInitVisible,
} from "@utils/config/ConfigStorage";

/**
 * Регистрация IPC обработчиков для работы с UI настройками
 */
export function registerUIHandlers(): void {
  // Получение видимости панели GUI
  ipcMain.handle("get-gui-panel-visible", async () => {
    try {
      return await getGuiPanelVisible();
    } catch (error) {
      console.error("Ошибка получения видимости панели GUI:", error);
      return true; // Возвращаем значение по умолчанию
    }
  });

  // Сохранение видимости панели GUI
  ipcMain.handle("set-gui-panel-visible", async (_event, visible: boolean) => {
    try {
      await setGuiPanelVisible(visible);
      return { success: true };
    } catch (error) {
      console.error("Ошибка сохранения видимости панели GUI:", error);
      throw error;
    }
  });

  // Получение видимости панели графической инициализации
  ipcMain.handle("get-graphical-init-visible", async () => {
    try {
      return await getGraphicalInitVisible();
    } catch (error) {
      console.error("Ошибка получения видимости панели графической инициализации:", error);
      return true; // Возвращаем значение по умолчанию
    }
  });

  // Сохранение видимости панели графической инициализации
  ipcMain.handle("set-graphical-init-visible", async (_event, visible: boolean) => {
    try {
      await setGraphicalInitVisible(visible);
      return { success: true };
    } catch (error) {
      console.error("Ошибка сохранения видимости панели графической инициализации:", error);
      throw error;
    }
  });
}


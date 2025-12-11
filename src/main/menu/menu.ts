import { app, Menu } from "electron";
import { windowManager } from "@main/managers/WindowManager";
import process from "node:process";

/**
 * Создание меню приложения с горячими клавишами
 */
export function createApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Файл",
      submenu: [
        {
          label: "Открыть проект",
          accelerator: "CommandOrControl+O",
          click: async () => {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              // Отправляем событие для открытия проекта
              mainWindow.webContents.send("menu-open-project");
              // После открытия проекта отправляем событие обновления списка проектов
              // Это событие будет обработано в ProjectTree для перезагрузки списка
              setTimeout(() => {
                const window = windowManager.getMainWindow();
                if (window && !window.isDestroyed()) {
                  window.webContents.send("project-list-changed");
                }
              }, 100);
            }
          },
        },
        {
          label: "Новый проект",
          accelerator: "CommandOrControl+N",
          click: () => {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("menu-new-project");
            }
          },
        },
        { type: "separator" },
        {
          label: "Сохранить",
          accelerator: "CommandOrControl+S",
          click: () => {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("menu-save-file");
            }
          },
        },
        {
          label: "Сохранить как",
          accelerator: "CommandOrControl+Shift+S",
          click: () => {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("menu-save-file-as");
            }
          },
        },
        { type: "separator" },
        {
          label: process.platform === "darwin" ? "Выход" : "Выход",
          accelerator: process.platform === "darwin" ? "Command+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Вид",
      submenu: [
        {
          label: "Переключить терминал",
          accelerator: "CommandOrControl+Shift+T",
          click: () => {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("toggle-terminal");
            }
          },
        },
        {
          label: "Переключить тему",
          accelerator: "CommandOrControl+Shift+M",
          click: () => {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("toggle-theme");
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}


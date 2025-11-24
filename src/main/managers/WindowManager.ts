import { BrowserWindow, screen } from "electron";
import path from "node:path";

/**
 * Менеджер для управления главным окном приложения
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  /**
   * Создать главное окно
   */
  createWindow(): BrowserWindow {
    // Получаем размеры экрана
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Create the browser window.
    this.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      x: primaryDisplay.workArea.x,
      y: primaryDisplay.workArea.y,
      autoHideMenuBar: false, // Меню всегда видимо
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Отключаем sandbox для решения проблемы с SUID sandbox helper на Linux
      },
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }

    return this.mainWindow;
  }

  /**
   * Получить главное окно
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Установить главное окно (для случаев, когда окно создано извне)
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Получить активное окно, если главное окно не создано
   */
  getActiveWindow(): BrowserWindow | null {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow;
    }

    // Получаем активное окно, если mainWindow еще не создан
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      this.mainWindow = windows[0];
      return this.mainWindow;
    }

    return null;
  }
}

// Экспортируем singleton экземпляр
export const windowManager = new WindowManager();


import { app, BrowserWindow, globalShortcut } from "electron";
import started from "electron-squirrel-startup";
import { registerIpcHandlers } from "./main/ipcHandlers";
import { windowManager } from "./main/managers/WindowManager";
import { terminalManager } from "./main/managers/TerminalManager";
import { createApplicationMenu } from "./main/menu/menu";

/**
 * Главный процесс Electron приложения
 * 
 * Этот файл отвечает за инициализацию приложения и управление жизненным циклом.
 * Вся бизнес-логика вынесена в отдельные модули для лучшей организации кода.
 */

// Отключаем sandbox для Linux (решает проблему с SUID sandbox helper)
// Должно быть вызвано ДО app.ready() и ДО любых других операций с app
if (process.platform === "linux") {
  app.commandLine.appendSwitch("--no-sandbox");
  app.commandLine.appendSwitch("--disable-setuid-sandbox");
}

// Обработка создания/удаления ярлыков на Windows при установке/удалении приложения
// Если приложение запущено через electron-squirrel-startup, завершаем его
if (started) {
  app.quit();
}

/**
 * Создание главного окна приложения
 * 
 * Инициализирует главное окно, настраивает менеджеры и создает меню приложения.
 */
const createWindow = () => {
  // Создаем главное окно через WindowManager
  const mainWindow = windowManager.createWindow();
  
  // Устанавливаем окно в менеджер терминалов для отправки данных в рендерер
  terminalManager.setMainWindow(mainWindow);
  
  // Создаем меню приложения с горячими клавишами
  createApplicationMenu();
};

/**
 * Обработчик события готовности Electron
 * 
 * Вызывается когда Electron завершил инициализацию и готов создавать окна браузера.
 * Некоторые API можно использовать только после этого события.
 */
app.whenReady().then(() => {
  console.log("Electron готов, создаем окно...");
  
  // Регистрируем все IPC обработчики для связи между главным процессом и рендерером
  // Перерегистрируем на случай hot reload во время разработки
  registerIpcHandlers();
  
  // Создаем главное окно приложения
  createWindow();
});

/**
 * Обработчик закрытия всех окон
 * 
 * На macOS приложения обычно остаются активными в меню, даже когда все окна закрыты,
 * пока пользователь явно не выйдет через Cmd + Q.
 * На других платформах приложение завершается при закрытии всех окон.
 */
app.on("window-all-closed", () => {
  // Отменяем регистрацию всех глобальных горячих клавиш
  globalShortcut.unregisterAll();

  // На macOS не завершаем приложение, на других платформах - завершаем
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * Обработчик активации приложения (macOS)
 * 
 * На macOS принято пересоздавать окно в приложении, когда пользователь
 * кликает на иконку в доке и нет других открытых окон.
 */
app.on("activate", () => {
  // Если нет открытых окон, создаем новое
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * Обработчик выхода из приложения
 * 
 * Выполняет очистку ресурсов перед завершением работы приложения:
 * - Отменяет регистрацию глобальных горячих клавиш
 * - Очищает все активные терминалы
 */
app.on("will-quit", () => {
  // Отменяем регистрацию всех глобальных горячих клавиш
  globalShortcut.unregisterAll();
  
  // Очищаем все терминалы и освобождаем ресурсы
  terminalManager.clear();
});

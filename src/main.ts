import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  globalShortcut,
  Menu,
  screen,
} from "electron";
import path from "node:path";
import fs from "fs/promises";
import { existsSync } from "fs";
import started from "electron-squirrel-startup";
import {
  getProjectState,
  saveProjectState,
  getLastProjectPath,
  saveLastProjectPath,
  getOpenProjects,
  addOpenProject,
  removeOpenProject,
  type ProjectState,
} from "@utils/ConfigStorage";
import {
  buildProjectTree,
  getParentDirectory,
  createProjectData,
  findProjectForFile,
  type OpenProjectData,
} from "@utils/ProjectUtils";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let currentProjectPath: string | null = null;
let mainWindow: BrowserWindow | null = null;
// Map для хранения открытых проектов: путь -> данные проекта
const openProjects = new Map<string, OpenProjectData>();

// Функция для регистрации всех IPC обработчиков
const registerIpcHandlers = () => {
  console.log("Регистрируем IPC обработчики...");

  // Удаляем старые обработчики, если они есть (для hot reload)
  const handlers = [
    "select-project-folder",
    "create-file",
    "create-folder",
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
    "save-file",
    "save-file-as",
  ];

  handlers.forEach((handler) => {
    try {
      ipcMain.removeHandler(handler);
    } catch (e) {
      // Игнорируем ошибки, если обработчика нет
    }
  });

  // Регистрируем все обработчики
  ipcMain.handle("select-project-folder", async () => {
    try {
      console.log("Показываем диалог выбора папки...");
      console.log("mainWindow:", mainWindow ? "существует" : "не существует");

      if (!mainWindow) {
        // Получаем активное окно, если mainWindow еще не создан
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          mainWindow = windows[0];
          console.log("Используем существующее окно");
        }
      }

      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ["openDirectory"],
        title: "Выберите папку проекта",
      });

      console.log("Результат диалога:", JSON.stringify(result));

      if (result.canceled || result.filePaths.length === 0) {
        console.log("Диалог отменен или файлы не выбраны");
        return null;
      }

      const projectPath = result.filePaths[0];
      console.log("Выбранный путь проекта:", projectPath);

      // Проверяем, не открыт ли уже этот проект
      if (openProjects.has(projectPath)) {
        // Проект уже открыт, просто делаем его текущим
        currentProjectPath = projectPath;
        await saveLastProjectPath(projectPath);
        const existingProject = openProjects.get(projectPath);
        if (!existingProject) {
          throw new Error("Проект не найден в списке открытых");
        }
        return existingProject;
      }

      // Открываем новый проект
      currentProjectPath = projectPath;
      await saveLastProjectPath(projectPath);
      await addOpenProject(projectPath);

      console.log("Строим дерево проекта...");
      const children = await buildProjectTree(projectPath, projectPath);
      console.log("Дерево проекта построено, элементов:", children.length);

      const projectData = createProjectData(projectPath, children);

      // Сохраняем проект в Map
      openProjects.set(projectPath, projectData);

      return projectData;
    } catch (error) {
      console.error("Ошибка в select-project-folder:", error);
      throw error;
    }
  });
  // Создание файла
  ipcMain.handle(
    "create-file",
    async (_event, parentPath: string, projectPath?: string) => {
      const targetProjectPath = projectPath || currentProjectPath;
      if (!targetProjectPath) {
        throw new Error("Проект не открыт");
      }

      // Определяем родительскую папку
      const targetDir = await getParentDirectory(parentPath, targetProjectPath);

      const result = await dialog.showSaveDialog({
        defaultPath: targetDir,
        buttonLabel: "Создать файл",
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      const filePath = result.filePath;

      // Проверяем, что файл находится в пределах проекта
      if (!filePath.startsWith(targetProjectPath)) {
        throw new Error("Файл должен находиться в пределах проекта");
      }

      // Создаем файл, если его нет
      if (!existsSync(filePath)) {
        // Создаем родительские директории, если их нет
        const dir = path.dirname(filePath);
        if (!existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(filePath, "", "utf-8");
      }

      // Обновляем дерево проекта
      const children = await buildProjectTree(
        targetProjectPath,
        targetProjectPath
      );
      const projectData = createProjectData(targetProjectPath, children);

      // Обновляем проект в Map
      openProjects.set(targetProjectPath, projectData);

      return projectData;
    }
  );

  // Создание папки
  ipcMain.handle(
    "create-folder",
    async (_event, parentPath: string, projectPath?: string) => {
      const targetProjectPath = projectPath || currentProjectPath;
      if (!targetProjectPath) {
        throw new Error("Проект не открыт");
      }

      // Определяем родительскую папку
      const targetDir = await getParentDirectory(parentPath, targetProjectPath);

      // Используем showSaveDialog для ввода имени папки
      const result = await dialog.showSaveDialog({
        defaultPath: path.join(targetDir, "Новая папка"),
        buttonLabel: "Создать папку",
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      const folderPath = result.filePath;

      // Проверяем, что папка находится в пределах проекта
      if (!folderPath.startsWith(targetProjectPath)) {
        throw new Error("Папка должна находиться в пределах проекта");
      }

      // Создаем папку, если ее нет
      if (!existsSync(folderPath)) {
        await fs.mkdir(folderPath, { recursive: true });
      }

      // Обновляем дерево проекта
      const children = await buildProjectTree(
        targetProjectPath,
        targetProjectPath
      );
      const projectData = createProjectData(targetProjectPath, children);

      // Обновляем проект в Map
      openProjects.set(targetProjectPath, projectData);

      return projectData;
    }
  );

  // Чтение файла
  ipcMain.handle("read-file", async (_event, filePath: string) => {
    // Проверяем, что файл принадлежит одному из открытых проектов
    const projectPath = findProjectForFile(filePath, openProjects);

    if (!projectPath) {
      throw new Error("Файл не принадлежит открытому проекту");
    }

    const content = await fs.readFile(filePath, "utf-8");
    const name = path.basename(filePath);

    // Определяем язык по расширению
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      ".js": "javascript",
      ".ts": "typescript",
      ".tsx": "typescript",
      ".jsx": "javascript",
      ".json": "json",
      ".html": "html",
      ".css": "css",
      ".c": "c",
      ".cpp": "cpp",
      ".h": "c",
      ".hpp": "cpp",
      ".py": "python",
      ".java": "java",
      ".go": "go",
      ".rs": "rust",
      ".md": "markdown",
      ".xml": "xml",
      ".yaml": "yaml",
      ".yml": "yaml",
    };

    const language = languageMap[ext] || "plaintext";

    return {
      id: filePath,
      name,
      path: filePath,
      language,
      content,
    };
  });

  // Получение дерева проекта
  ipcMain.handle("get-project-tree", async (_event, projectPath?: string) => {
    try {
      const targetProjectPath = projectPath || currentProjectPath;
      console.log("get-project-tree вызван, projectPath:", targetProjectPath);
      if (!targetProjectPath) {
        console.log("Проект не открыт, возвращаем null");
        return null;
      }

      // Проверяем, есть ли проект в Map
      const existingProject = openProjects.get(targetProjectPath);
      if (existingProject) {
        return existingProject;
      }

      // Если проекта нет в Map, загружаем его
      const children = await buildProjectTree(
        targetProjectPath,
        targetProjectPath
      );
      console.log("Дерево проекта построено, элементов:", children.length);
      const projectData = createProjectData(targetProjectPath, children);

      openProjects.set(targetProjectPath, projectData);
      return projectData;
    } catch (error) {
      console.error("Ошибка в get-project-tree:", error);
      throw error;
    }
  });

  // IPC обработчики для работы с конфигурацией
  ipcMain.handle("get-project-state", async (_event, projectPath: string) => {
    try {
      return await getProjectState(projectPath);
    } catch (error) {
      console.error("Ошибка получения состояния проекта:", error);
      return null;
    }
  });

  // Сохранение состояния проекта
  ipcMain.handle(
    "save-project-state",
    async (_event, projectPath: string, state: Partial<ProjectState>) => {
      try {
        await saveProjectState(projectPath, state);
      } catch (error) {
        console.error("Ошибка сохранения состояния проекта:", error);
        throw error;
      }
    }
  );

  // Получение последнего пути проекта
  ipcMain.handle("get-last-project-path", async () => {
    try {
      return await getLastProjectPath();
    } catch (error) {
      console.error("Ошибка получения последнего пути проекта:", error);
      return null;
    }
  });

  // Загрузка последнего проекта
  ipcMain.handle("load-last-project", async () => {
    try {
      const lastProjectPath = await getLastProjectPath();
      if (!lastProjectPath || !existsSync(lastProjectPath)) {
        return null;
      }

      currentProjectPath = lastProjectPath;
      await addOpenProject(lastProjectPath);

      // Проверяем, есть ли проект в Map
      const existingProject = openProjects.get(lastProjectPath);
      if (existingProject) {
        return existingProject;
      }

      const children = await buildProjectTree(lastProjectPath, lastProjectPath);
      const projectData = createProjectData(lastProjectPath, children);

      openProjects.set(lastProjectPath, projectData);
      return projectData;
    } catch (error) {
      console.error("Ошибка загрузки последнего проекта:", error);
      return null;
    }
  });

  // Получение списка открытых проектов
  ipcMain.handle("get-open-projects", async () => {
    try {
      const projects = Array.from(openProjects.values());
      return projects.map((p) => ({ path: p.path, name: p.name }));
    } catch (error) {
      console.error("Ошибка получения списка открытых проектов:", error);
      return [];
    }
  });

  // Переключение на другой проект
  ipcMain.handle("switch-project", async (_event, projectPath: string) => {
    try {
      if (!openProjects.has(projectPath)) {
        throw new Error("Проект не открыт");
      }

      currentProjectPath = projectPath;
      await saveLastProjectPath(projectPath);
      const project = openProjects.get(projectPath);
      if (!project) {
        throw new Error("Проект не найден в списке открытых");
      }
      return project;
    } catch (error) {
      console.error("Ошибка переключения проекта:", error);
      throw error;
    }
  });

  // Закрытие проекта
  ipcMain.handle("close-project", async (_event, projectPath: string) => {
    try {
      if (!openProjects.has(projectPath)) {
        return;
      }

      openProjects.delete(projectPath);
      await removeOpenProject(projectPath);

      // Если закрыли текущий проект, переключаемся на другой
      if (currentProjectPath === projectPath) {
        const remainingProjects = Array.from(openProjects.keys());
        if (remainingProjects.length > 0) {
          currentProjectPath = remainingProjects[0];
          await saveLastProjectPath(currentProjectPath);
        } else {
          currentProjectPath = null;
          await saveLastProjectPath(null);
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Ошибка закрытия проекта:", error);
      throw error;
    }
  });

  // Загрузка всех открытых проектов при старте
  ipcMain.handle("load-open-projects", async () => {
    try {
      const openProjectsPaths = await getOpenProjects();
      const loadedProjects = [];

      for (const projectPath of openProjectsPaths) {
        if (existsSync(projectPath)) {
          const children = await buildProjectTree(projectPath, projectPath);
          const projectData = createProjectData(projectPath, children);

          openProjects.set(projectPath, projectData);
          loadedProjects.push(projectData);
        } else {
          // Удаляем несуществующий проект из списка
          await removeOpenProject(projectPath);
        }
      }

      // Устанавливаем последний проект как текущий
      const lastProjectPath = await getLastProjectPath();
      if (lastProjectPath && openProjects.has(lastProjectPath)) {
        currentProjectPath = lastProjectPath;
      } else if (loadedProjects.length > 0) {
        currentProjectPath = loadedProjects[0].path;
        await saveLastProjectPath(currentProjectPath);
      }

      return loadedProjects;
    } catch (error) {
      console.error("Ошибка загрузки открытых проектов:", error);
      return [];
    }
  });

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

  // Сохранение файла
  ipcMain.handle(
    "save-file",
    async (_event, filePath: string, content: string) => {
      try {
        // Проверяем, что файл принадлежит одному из открытых проектов
        const projectPath = findProjectForFile(filePath, openProjects);

        if (!projectPath) {
          throw new Error("Файл не принадлежит открытому проекту");
        }

        await fs.writeFile(filePath, content, "utf-8");
        return { success: true };
      } catch (error) {
        console.error("Ошибка сохранения файла:", error);
        throw error;
      }
    }
  );

  // Сохранение файла как
  ipcMain.handle(
    "save-file-as",
    async (_event, currentFilePath: string, content: string) => {
      try {
        const result = await dialog.showSaveDialog(mainWindow || undefined, {
          defaultPath: currentFilePath,
          buttonLabel: "Сохранить",
        });

        if (result.canceled || !result.filePath) {
          return null;
        }

        const newFilePath = result.filePath;

        // Проверяем, что файл находится в пределах одного из открытых проектов
        const projectPath = findProjectForFile(newFilePath, openProjects);

        if (!projectPath) {
          throw new Error(
            "Файл должен находиться в пределах открытого проекта"
          );
        }

        await fs.writeFile(newFilePath, content, "utf-8");
        return { success: true, filePath: newFilePath };
      } catch (error) {
        console.error("Ошибка сохранения файла как:", error);
        throw error;
      }
    }
  );
};

const createWindow = () => {
  // Получаем размеры экрана
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    autoHideMenuBar: false, // Меню всегда видимо
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Создаем меню приложения с горячими клавишами
  createApplicationMenu();
};

// Создание меню приложения с горячими клавишами
const createApplicationMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Файл",
      submenu: [
        {
          label: "Открыть проект",
          accelerator: "CommandOrControl+O",
          click: async () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              // Отправляем событие для открытия проекта
              mainWindow.webContents.send("menu-open-project");
              // После открытия проекта отправляем событие обновления списка проектов
              // Это событие будет обработано в ProjectTree для перезагрузки списка
              setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send("project-list-changed");
                }
              }, 100);
            }
          },
        },
        {
          label: "Новый файл",
          accelerator: "CommandOrControl+N",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("menu-new-file");
            }
          },
        },
        { type: "separator" },
        {
          label: "Сохранить",
          accelerator: "CommandOrControl+S",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("menu-save-file");
            }
          },
        },
        {
          label: "Сохранить как",
          accelerator: "CommandOrControl+Shift+S",
          click: () => {
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
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("toggle-terminal");
            }
          },
        },
        {
          label: "Переключить DevTools",
          accelerator: "F12",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log("Electron готов, создаем окно...");
  // Перерегистрируем обработчики на случай hot reload
  registerIpcHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  // Отменяем регистрацию всех глобальных горячих клавиш
  globalShortcut.unregisterAll();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Отменяем регистрацию глобальных горячих клавиш при выходе из приложения
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

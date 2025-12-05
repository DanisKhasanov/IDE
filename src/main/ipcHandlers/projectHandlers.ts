import { ipcMain, dialog, app } from "electron";
import { existsSync } from "fs";
import path from "node:path";
import fs from "fs/promises";
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
import { buildProjectTree, createProjectData } from "@utils/ProjectUtils";
import { projectManager } from "@main/managers/ProjectManager";
import { windowManager } from "@main/managers/WindowManager";
import type { ProjectPinConfig } from "../../types/boardConfig";

/**
 * Регистрация IPC обработчиков для работы с проектами
 */
export function registerProjectHandlers(): void {
  // Выбор папки проекта
  ipcMain.handle("select-project-folder", async () => {
    try {
      console.log("Показываем диалог выбора папки...");
      const mainWindow = windowManager.getActiveWindow();
      console.log("mainWindow:", mainWindow ? "существует" : "не существует");

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
      if (projectManager.hasProject(projectPath)) {
        // Проект уже открыт, просто делаем его текущим
        projectManager.setCurrentProjectPath(projectPath);
        await saveLastProjectPath(projectPath);
        const existingProject = projectManager.getProject(projectPath);
        if (!existingProject) {
          throw new Error("Проект не найден в списке открытых");
        }
        return existingProject;
      }

      // Открываем новый проект
      projectManager.setCurrentProjectPath(projectPath);
      await saveLastProjectPath(projectPath);
      await addOpenProject(projectPath);

      console.log("Строим дерево проекта...");
      const children = await buildProjectTree(projectPath, projectPath);
      console.log("Дерево проекта построено, элементов:", children.length);

      const projectData = createProjectData(projectPath, children);

      // Сохраняем проект в Map
      projectManager.addProject(projectPath, projectData);

      return projectData;
    } catch (error) {
      console.error("Ошибка в select-project-folder:", error);
      throw error;
    }
  });

  // Получение дерева проекта
  ipcMain.handle("get-project-tree", async (_event, projectPath?: string) => {
    try {
      const targetProjectPath =
        projectPath || projectManager.getCurrentProjectPath();
      console.log("get-project-tree вызван, projectPath:", targetProjectPath);
      if (!targetProjectPath) {
        console.log("Проект не открыт, возвращаем null");
        return null;
      }

      // Проверяем, есть ли проект в Map
      const existingProject = projectManager.getProject(targetProjectPath);
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

      projectManager.addProject(targetProjectPath, projectData);
      return projectData;
    } catch (error) {
      console.error("Ошибка в get-project-tree:", error);
      throw error;
    }
  });

  // Получение состояния проекта
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

      projectManager.setCurrentProjectPath(lastProjectPath);
      await addOpenProject(lastProjectPath);

      // Проверяем, есть ли проект в Map
      const existingProject = projectManager.getProject(lastProjectPath);
      if (existingProject) {
        return existingProject;
      }

      const children = await buildProjectTree(lastProjectPath, lastProjectPath);
      const projectData = createProjectData(lastProjectPath, children);

      projectManager.addProject(lastProjectPath, projectData);
      return projectData;
    } catch (error) {
      console.error("Ошибка загрузки последнего проекта:", error);
      return null;
    }
  });

  // Получение списка открытых проектов
  ipcMain.handle("get-open-projects", async () => {
    try {
      const projects = projectManager.getAllProjects();
      return projects.map((p) => ({ path: p.path, name: p.name }));
    } catch (error) {
      console.error("Ошибка получения списка открытых проектов:", error);
      return [];
    }
  });

  // Переключение на другой проект
  ipcMain.handle("switch-project", async (_event, projectPath: string) => {
    try {
      if (!projectManager.hasProject(projectPath)) {
        throw new Error("Проект не открыт");
      }

      projectManager.setCurrentProjectPath(projectPath);
      await saveLastProjectPath(projectPath);
      const project = projectManager.getProject(projectPath);
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
      if (!projectManager.hasProject(projectPath)) {
        return;
      }

      projectManager.removeProject(projectPath);
      await removeOpenProject(projectPath);

      // Если закрыли текущий проект, переключаемся на другой
      if (projectManager.getCurrentProjectPath() === projectPath) {
        const remainingProjects = projectManager.getAllProjectPaths();
        if (remainingProjects.length > 0) {
          projectManager.setCurrentProjectPath(remainingProjects[0]);
          await saveLastProjectPath(remainingProjects[0]);
        } else {
          projectManager.setCurrentProjectPath(null);
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
          // Проверяем, есть ли уже обновленное дерево в projectManager
          // Это важно после refreshProjectTree, чтобы использовать актуальное дерево
          const existingProject = projectManager.getProject(projectPath);
          
          if (existingProject) {
            // Используем существующее дерево из projectManager
            loadedProjects.push(existingProject);
          } else {
            // Если дерева нет, пересобираем его
            const children = await buildProjectTree(projectPath, projectPath);
            const projectData = createProjectData(projectPath, children);

            projectManager.addProject(projectPath, projectData);
            loadedProjects.push(projectData);
          }
        } else {
          // Удаляем несуществующий проект из списка
          await removeOpenProject(projectPath);
        }
      }

      // Устанавливаем последний проект как текущий
      const lastProjectPath = await getLastProjectPath();
      if (lastProjectPath && projectManager.hasProject(lastProjectPath)) {
        projectManager.setCurrentProjectPath(lastProjectPath);
      } else if (loadedProjects.length > 0) {
        projectManager.setCurrentProjectPath(loadedProjects[0].path);
        await saveLastProjectPath(loadedProjects[0].path);
      }

      return loadedProjects;
    } catch (error) {
      console.error("Ошибка загрузки открытых проектов:", error);
      return [];
    }
  });

  // Выбор родительской папки (без открытия как проекта)
  ipcMain.handle("select-parent-folder", async () => {
    try {
      const mainWindow = windowManager.getActiveWindow();
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ["openDirectory"],
        title: "Выберите папку для создания проекта",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      // Просто возвращаем путь, без открытия проекта
      return { path: result.filePaths[0] };
    } catch (error) {
      console.error("Ошибка выбора родительской папки:", error);
      throw error;
    }
  });

  // Создание нового проекта (создание папки и открытие)
  ipcMain.handle(
    "create-new-project",
    async (
      _event,
      parentPath: string,
      projectName: string,
      pinConfig?: ProjectPinConfig
    ) => {
      try {
        if (!projectName || !projectName.trim()) {
          throw new Error("Название проекта не может быть пустым");
        }

        // Проверяем, что parentPath определен
        if (!parentPath || typeof parentPath !== 'string') {
          throw new Error("Родительская папка не указана");
        }

        // Проверяем, что родительская папка существует
        if (!existsSync(parentPath)) {
          throw new Error("Родительская папка не существует");
        }

        // Создаем путь к новому проекту
        const projectPath = path.join(parentPath, projectName.trim());

        // Проверяем, не существует ли уже папка с таким именем
        if (existsSync(projectPath)) {
          throw new Error("Папка с таким названием уже существует");
        }

        // Создаем папку проекта
        await fs.mkdir(projectPath, { recursive: true });

        // Создаем папку src
        const srcPath = path.join(projectPath, "src");
        await fs.mkdir(srcPath, { recursive: true });

        // Генерируем код инициализации
        let mainCode: string;
        if (
          pinConfig &&
          pinConfig.selectedPins &&
          pinConfig.selectedPins.length > 0
        ) {
          // Импортируем конфигурацию платы и генератор кода
          // Определяем путь к конфигурационному файлу
          const appPath = app.getAppPath();

          // Определяем базовый путь проекта
          // В dev: используем путь относительно исходного кода
          // В prod: файл должен быть скопирован в out/main/config при сборке
          const isDev =
            process.env.NODE_ENV === "development" || !app.isPackaged;

          // Пробуем разные варианты путей
          const possiblePaths = isDev
            ? [
                // Dev режим - относительно исходного кода
                path.join(process.cwd(), "src/config/boards/atmega328p.json"),
                path.resolve(
                  __dirname,
                  "../../../src/config/boards/atmega328p.json"
                ),
              ]
            : [
                // Prod режим - в собранном приложении
                // В упакованном приложении файлы находятся в asar архиве
                // __dirname указывает на .vite/build/ внутри asar
                // Конфигурация должна быть в .vite/build/config/boards/atmega328p.json
                path.join(__dirname, "config/boards/atmega328p.json"), // .vite/build/config/boards
                path.join(__dirname, "../config/boards/atmega328p.json"), // .vite/build/../config/boards
                path.join(appPath, ".vite/build/config/boards/atmega328p.json"),
                path.join(appPath, "config/boards/atmega328p.json"),
                path.join(appPath, "dist/config/boards/atmega328p.json"),
                // Также пробуем путь относительно ресурсов приложения
                path.join(process.resourcesPath, "app", "config", "boards", "atmega328p.json"),
                path.join(process.resourcesPath, "app", ".vite", "build", "config", "boards", "atmega328p.json"),
              ];

          const boardConfigPath = possiblePaths.find((p) => existsSync(p));

          if (!boardConfigPath) {
            console.error("Не удалось найти конфигурацию платы.");
            console.error("isDev:", isDev);
            console.error("__dirname:", __dirname);
            console.error("app.getAppPath():", appPath);
            console.error("process.resourcesPath:", process.resourcesPath);
            console.error("process.cwd():", process.cwd());
            console.error("Проверенные пути:", possiblePaths);
            // Попробуем вывести список файлов в директориях для отладки
            try {
              const configDir = path.join(__dirname, "../config");
              console.error("Содержимое __dirname/../config:", existsSync(configDir) ? "существует" : "не существует");
              if (existsSync(configDir)) {
                const files = await fs.readdir(configDir);
                console.error("Файлы в config:", files);
              }
            } catch (e) {
              console.error("Ошибка при проверке директории:", e);
            }
            throw new Error(
              `Не удалось найти конфигурацию платы. Проверьте, что файл src/config/boards/atmega328p.json существует и скопирован при сборке.`
            );
          }

          const boardConfig = JSON.parse(
            await fs.readFile(boardConfigPath, "utf-8")
          );

          // Используем динамический импорт для CodeGenerator
          const { CodeGenerator } = await import("../../utils/CodeGenerator");
          const generator = new CodeGenerator(
            boardConfig,
            pinConfig.fCpu || "16000000L"
          );

          // Генерируем заголовочный файл и файл реализации
          const headerCode = generator.generateInitHeader(
            pinConfig.selectedPins
          );
          const implementationCode = generator.generateInitImplementation(
            pinConfig.selectedPins
          );

          // Создаем файлы pins_init.h и pins_init.cpp
          const pinsInitHeaderPath = path.join(srcPath, "pins_init.h");
          const pinsInitCppPath = path.join(srcPath, "pins_init.cpp");

          await fs.writeFile(pinsInitHeaderPath, headerCode, "utf-8");
          await fs.writeFile(pinsInitCppPath, implementationCode, "utf-8");

          // Генерируем main.cpp с подключением заголовочного файла
          mainCode = `#include <Arduino.h>
#include "pins_init.h"

void setup() {
  // Инициализация пинов
  pins_init_all();
}

void loop() {
  // Основной цикл
  
}
`;
        } else {
          // Базовый код по умолчанию
          mainCode = `#include <Arduino.h>

void setup() {
  // Инициализация

  }

void loop() {
  // Основной цикл
  
}
`;
        }

        // Создаем базовую структуру проекта (файл main.cpp в папке src)
        const mainCppPath = path.join(srcPath, "main.cpp");
        await fs.writeFile(mainCppPath, mainCode, "utf-8");

        // Открываем новый проект
        projectManager.setCurrentProjectPath(projectPath);
        await saveLastProjectPath(projectPath);
        await addOpenProject(projectPath);

        // Строим дерево проекта
        const children = await buildProjectTree(projectPath, projectPath);
        const projectData = createProjectData(projectPath, children);

        // Сохраняем проект в Map
        projectManager.addProject(projectPath, projectData);

        return projectData;
      } catch (error) {
        console.error("Ошибка создания нового проекта:", error);
        throw error;
      }
    }
  );

  // Обновление дерева проекта (например, после компиляции)
  ipcMain.handle(
    "refresh-project-tree",
    async (_event, projectPath?: string) => {
      try {
        const targetProjectPath =
          projectPath || projectManager.getCurrentProjectPath();
        if (!targetProjectPath) {
          throw new Error("Проект не открыт");
        }

        // Проверяем, что проект существует в менеджере
        if (!projectManager.hasProject(targetProjectPath)) {
          throw new Error("Проект не найден в списке открытых");
        }

        // Пересобираем дерево проекта
        const children = await buildProjectTree(
          targetProjectPath,
          targetProjectPath
        );
        const projectData = createProjectData(targetProjectPath, children);

        // Обновляем проект в Map
        projectManager.addProject(targetProjectPath, projectData);

        // Отправляем событие обновления списка проектов
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("project-list-changed");
        }

        return projectData;
      } catch (error) {
        console.error("Ошибка обновления дерева проекта:", error);
        throw error;
      }
    }
  );
}

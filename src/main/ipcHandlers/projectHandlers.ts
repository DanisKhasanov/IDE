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
} from "@utils/config/ConfigStorage";
import { buildProjectTree, createProjectData } from "@utils/project/ProjectUtils";
import { projectManager } from "@main/managers/ProjectManager";
import { windowManager } from "@main/managers/WindowManager";
import type { ProjectPinConfig, SelectedPinFunction } from "../../types/boardConfig";

/**
 * Получение пути к Arduino Core из resources/arduino-core
 */
function getArduinoCorePath(): string {
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  
  // В dev режиме используем путь относительно исходного кода
  if (isDev) {
    const devPath = path.join(process.cwd(), "resources", "arduino-core");
    if (existsSync(devPath)) {
      return devPath;
    }
    
    // Пробуем альтернативный путь
    const altDevPath = path.resolve(__dirname, "../../../resources/arduino-core");
    if (existsSync(altDevPath)) {
      return altDevPath;
    }
  }
  
  // В production режиме пробуем разные пути
  const prodPaths = [
    path.join(process.resourcesPath || "", "arduino-core"),
    path.join(__dirname, "../resources/arduino-core"),
    path.join(__dirname, "../../resources/arduino-core"),
  ];
  
  for (const prodPath of prodPaths) {
    if (prodPath && existsSync(prodPath)) {
      return prodPath;
    }
  }
  
  throw new Error(
    "Arduino Core не найден. Убедитесь, что resources/arduino-core существует."
  );
}

/**
 * Рекурсивное копирование директории
 */
async function copyDirectoryRecursive(
  sourceDir: string,
  destDir: string
): Promise<void> {
  // Создаем целевую директорию, если её нет
  await fs.mkdir(destDir, { recursive: true });

  // Читаем содержимое исходной директории
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Рекурсивно копируем поддиректории
      await copyDirectoryRecursive(sourcePath, destPath);
    } else {
      // Копируем файлы
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

/**
 * Регистрация IPC обработчиков для работы с проектами
 */
export function registerProjectHandlers(): void {
  // Выбор папки проекта
  ipcMain.handle("select-project-folder", async () => {
    try {
      const mainWindow = windowManager.getActiveWindow();

      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ["openDirectory"],
        title: "Выберите папку проекта",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const projectPath = result.filePaths[0];

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

      const children = await buildProjectTree(projectPath, projectPath);
      const projectData = createProjectData(projectPath, children);

      // Сохраняем проект в Map
      projectManager.addProject(projectPath, projectData);

      // Отправляем событие обновления списка проектов
      const mainWin = windowManager.getMainWindow();
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send("project-list-changed");
      }

      console.log(`[select-project-folder] Проект открыт: ${projectPath}`);
      return projectData;
    } catch (error) {
      console.error("[select-project-folder] Ошибка:", error);
      throw error;
    }
  });

  // Получение дерева проекта
  ipcMain.handle("get-project-tree", async (_event, projectPath?: string) => {
    try {
      const targetProjectPath =
        projectPath || projectManager.getCurrentProjectPath();
      if (!targetProjectPath) {
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
      const projectData = createProjectData(targetProjectPath, children);

      projectManager.addProject(targetProjectPath, projectData);
      return projectData;
    } catch (error) {
      console.error("[get-project-tree] Ошибка:", error);
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
        console.log(`[load-open-projects] Восстановлен последний проект: ${lastProjectPath}`);
      } else if (loadedProjects.length > 0) {
        projectManager.setCurrentProjectPath(loadedProjects[0].path);
        await saveLastProjectPath(loadedProjects[0].path);
        console.log(`[load-open-projects] Загружено проектов: ${loadedProjects.length}, активный: ${loadedProjects[0].path}`);
      }

      return loadedProjects;
    } catch (error) {
      console.error("[load-open-projects] Ошибка загрузки открытых проектов:", error);
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

        // Копируем папки cores и variants из resources/arduino-core согласно документации
        try {
          const arduinoCorePath = getArduinoCorePath();
          const coresSourcePath = path.join(arduinoCorePath, "cores");
          const variantsSourcePath = path.join(arduinoCorePath, "variants");
          
          const coresDestPath = path.join(projectPath, "cores");
          const variantsDestPath = path.join(projectPath, "variants");

          // Проверяем существование исходных директорий
          if (existsSync(coresSourcePath)) {
            await copyDirectoryRecursive(coresSourcePath, coresDestPath);
            console.log(`Скопирована папка cores в проект: ${coresDestPath}`);
          } else {
            console.warn(`Папка cores не найдена: ${coresSourcePath}`);
          }

          if (existsSync(variantsSourcePath)) {
            await copyDirectoryRecursive(variantsSourcePath, variantsDestPath);
            console.log(`Скопирована папка variants в проект: ${variantsDestPath}`);
          } else {
            console.warn(`Папка variants не найдена: ${variantsSourcePath}`);
          }
        } catch (error) {
          console.error("Ошибка копирования папок cores и variants:", error);
          // Не прерываем создание проекта, но логируем ошибку
        }

        // Генерируем код инициализации
        let mainCode: string;
        if (pinConfig && pinConfig.selectedPinFunctions && pinConfig.systemPeripherals) {
          // Используем новый генератор кода из CodeGenUtils
          const { generateInitCode } = await import("../../utils/codegen/CodeGenUtils");

          const fCpu = parseInt(pinConfig.fCpu?.replace("L", "") || "16000000", 10);

          // Генерируем код
          const generatedCode = generateInitCode(
            pinConfig.selectedPinFunctions,
            pinConfig.systemPeripherals,
            fCpu
          );

          // Создаем файлы pins_init.h и pins_init.cpp
          const pinsInitHeaderPath = path.join(srcPath, "pins_init.h");
          const pinsInitCppPath = path.join(srcPath, "pins_init.cpp");

          await fs.writeFile(pinsInitHeaderPath, generatedCode.header, "utf-8");
          await fs.writeFile(pinsInitCppPath, generatedCode.implementation, "utf-8");

          console.log("Сгенерированы файлы инициализации пинов");

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

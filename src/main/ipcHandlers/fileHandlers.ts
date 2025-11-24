import { ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "fs/promises";
import { existsSync } from "fs";
import {
  getParentDirectory,
  createProjectData,
  findProjectForFile,
} from "@utils/ProjectUtils";
import { buildProjectTree } from "@utils/ProjectUtils";
import { projectManager } from "../managers/ProjectManager";
import { windowManager } from "../managers/WindowManager";

/**
 * Регистрация IPC обработчиков для работы с файлами
 */
export function registerFileHandlers(): void {
  // Создание файла
  ipcMain.handle(
    "create-file",
    async (_event, parentPath: string, projectPath?: string) => {
      const targetProjectPath =
        projectPath || projectManager.getCurrentProjectPath();
      if (!targetProjectPath) {
        throw new Error("Проект не открыт");
      }

      // Определяем родительскую папку
      const targetDir = await getParentDirectory(
        parentPath,
        targetProjectPath
      );

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
      projectManager.addProject(targetProjectPath, projectData);

      return projectData;
    }
  );

  // Создание папки
  ipcMain.handle(
    "create-folder",
    async (_event, parentPath: string, projectPath?: string) => {
      const targetProjectPath =
        projectPath || projectManager.getCurrentProjectPath();
      if (!targetProjectPath) {
        throw new Error("Проект не открыт");
      }

      // Определяем родительскую папку
      const targetDir = await getParentDirectory(
        parentPath,
        targetProjectPath
      );

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
      projectManager.addProject(targetProjectPath, projectData);

      return projectData;
    }
  );

  // Чтение файла
  ipcMain.handle("read-file", async (_event, filePath: string) => {
    // Проверяем, что файл принадлежит одному из открытых проектов
    const projectPath = findProjectForFile(
      filePath,
      projectManager.getProjectsMap()
    );

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

  // Сохранение файла
  ipcMain.handle(
    "save-file",
    async (_event, filePath: string, content: string) => {
      try {
        // Проверяем, что файл принадлежит одному из открытых проектов
        const projectPath = findProjectForFile(
          filePath,
          projectManager.getProjectsMap()
        );

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
        const mainWindow = windowManager.getMainWindow();
        const result = await dialog.showSaveDialog(mainWindow || undefined, {
          defaultPath: currentFilePath,
          buttonLabel: "Сохранить",
        });

        if (result.canceled || !result.filePath) {
          return null;
        }

        const newFilePath = result.filePath;

        // Проверяем, что файл находится в пределах одного из открытых проектов
        const projectPath = findProjectForFile(
          newFilePath,
          projectManager.getProjectsMap()
        );

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
}


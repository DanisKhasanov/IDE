import path from "node:path";
import fs from "fs/promises";
import { existsSync } from "fs";
import type { ProjectTreeNode } from "@/types/project";

// Тип для данных открытого проекта
export type OpenProjectData = {
  path: string;
  name: string;
  tree: Extract<ProjectTreeNode, { type: "directory" }>;
};

// Функция для построения дерева проекта
export async function buildProjectTree(
  dirPath: string,
  basePath: string = dirPath
): Promise<ProjectTreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: ProjectTreeNode[] = [];

  for (const entry of entries) {
    // Пропускаем скрытые файлы 
    if (entry.name.startsWith(".") ) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    if (entry.isDirectory()) {
      const children = await buildProjectTree(fullPath, basePath);
      nodes.push({
        id: relativePath,
        name: entry.name,
        path: fullPath,
        type: "directory",
        children,
      });
    } else {
      nodes.push({
        id: relativePath,
        name: entry.name,
        path: fullPath,
        type: "file",
      });
    }
  }

  return nodes.sort((a, b) => {
    // Сначала папки, потом файлы
    if (a.type === "directory" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name);
  });
}

// Вспомогательная функция для определения родительской директории
export async function getParentDirectory(
  parentPath: string,
  defaultPath: string
): Promise<string> {
  if (!parentPath) {
    return defaultPath;
  }

  try {
    const stats = await fs.stat(parentPath);
    return stats.isDirectory() ? parentPath : path.dirname(parentPath);
  } catch {
    if (existsSync(parentPath)) {
      try {
        const stats = await fs.stat(parentPath);
        return stats.isDirectory() ? parentPath : path.dirname(parentPath);
      } catch {
        return path.dirname(parentPath);
      }
    }
    return path.dirname(parentPath);
  }
}

// Вспомогательная функция для создания объекта проекта
export function createProjectData(
  projectPath: string,
  children: ProjectTreeNode[]
): OpenProjectData {
  return {
    path: projectPath,
    name: path.basename(projectPath),
    tree: {
      id: ".",
      name: path.basename(projectPath),
      path: projectPath,
      type: "directory" as const,
      children,
    },
  };
}

// Вспомогательная функция для проверки принадлежности файла проекту
export function findProjectForFile(
  filePath: string,
  openProjects: Map<string, OpenProjectData>
): string | null {
  for (const [projectPath] of openProjects) {
    if (filePath.startsWith(projectPath)) {
      return projectPath;
    }
  }
  return null;
}





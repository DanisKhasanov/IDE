import { useState, useEffect, useCallback } from "react";
import type { ProjectTreeNode } from "@/types/project";
import type { OpenProject } from "./useProjectTree";

interface UseExpandedFoldersOptions {
  activeProjectPath: string | null;
  openProjects: OpenProject[];
  activeFilePath?: string | null;
}

export const useExpandedFolders = ({
  activeProjectPath,
  openProjects,
  activeFilePath,
}: UseExpandedFoldersOptions) => {
  const [expandedFolders, setExpandedFolders] = useState<
    Map<string, Set<string>>
  >(new Map());

  // Загрузка сохраненных состояний при изменении проектов
  useEffect(() => {
    const loadSavedStates = async () => {
      const newExpandedFolders = new Map<string, Set<string>>();
      for (const project of openProjects) {
        const savedState = await window.electronAPI.getProjectState(
          project.path
        );
        if (savedState && savedState.expandedFolders.length > 0) {
          newExpandedFolders.set(
            project.path,
            new Set(savedState.expandedFolders)
          );
        } else {
          // Раскрываем корневую папку по умолчанию
          if (project.tree.type === "directory") {
            newExpandedFolders.set(project.path, new Set([project.tree.id]));
          }
        }
      }
      setExpandedFolders(newExpandedFolders);
    };

    if (openProjects.length > 0) {
      loadSavedStates();
    }
  }, [openProjects]);

  // Сохранение раскрытых папок при изменении (с debounce)
  useEffect(() => {
    if (!activeProjectPath) {
      return;
    }

    // Проверяем, что проект все еще открыт
    const projectExists = openProjects.some(
      (p) => p.path === activeProjectPath
    );
    if (!projectExists) {
      return;
    }

    const folders = expandedFolders.get(activeProjectPath);
    if (!folders || folders.size === 0) {
      return;
    }

    // Debounce: сохраняем состояние через 500ms после последнего изменения
    const timeoutId = setTimeout(async () => {
      try {
        await window.electronAPI.saveProjectState(activeProjectPath, {
          expandedFolders: Array.from(folders),
        });
      } catch (error) {
        console.error("Ошибка сохранения раскрытых папок:", error);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [expandedFolders, activeProjectPath, openProjects]);

  // Автоматическое раскрытие родительских папок активного файла
  useEffect(() => {
    if (!activeFilePath || !activeProjectPath) {
      return;
    }

    // Находим проект, которому принадлежит активный файл
    const project = openProjects.find((p) =>
      activeFilePath.startsWith(p.path)
    );
    if (!project || project.tree.type !== "directory") {
      return;
    }

    // Функция для поиска пути к файлу в дереве
    const findPathToFile = (
      node: ProjectTreeNode,
      targetPath: string,
      currentPath: string[] = []
    ): string[] | null => {
      const nodePath = node.path;
      if (nodePath === targetPath) {
        return currentPath;
      }

      if (node.type === "directory" && node.children) {
        for (const child of node.children) {
          const result = findPathToFile(child, targetPath, [
            ...currentPath,
            node.id,
          ]);
          if (result) {
            return result;
          }
        }
      }

      return null;
    };

    const pathToFile = findPathToFile(project.tree, activeFilePath);
    if (pathToFile) {
      // Раскрываем все родительские папки
      setExpandedFolders((prev) => {
        const newMap = new Map(prev);
        const currentFolders = newMap.get(project.path) || new Set<string>();
        const newFolders = new Set(currentFolders);
        pathToFile.forEach((folderId) => newFolders.add(folderId));
        newMap.set(project.path, newFolders);
        return newMap;
      });
    }
  }, [activeFilePath, activeProjectPath, openProjects]);

  const toggleFolder = useCallback(
    (nodeId: string, projectPath?: string) => {
      // Используем переданный projectPath или активный проект
      const targetProjectPath = projectPath || activeProjectPath;
      if (!targetProjectPath) return;

      setExpandedFolders((prev) => {
        const newMap = new Map(prev);
        const currentFolders =
          newMap.get(targetProjectPath) || new Set<string>();
        const newSet = new Set(currentFolders);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        newMap.set(targetProjectPath, newSet);
        return newMap;
      });
    },
    [activeProjectPath]
  );

  const expandFolder = useCallback(
    (nodeId: string, projectPath: string) => {
      setExpandedFolders((prev) => {
        const newMap = new Map(prev);
        const currentFolders = newMap.get(projectPath) || new Set<string>();
        const newFolders = new Set(currentFolders);
        newFolders.add(nodeId);
        newMap.set(projectPath, newFolders);
        return newMap;
      });
    },
    []
  );

  const removeProjectFolders = useCallback((projectPath: string) => {
    setExpandedFolders((prev) => {
      const newMap = new Map(prev);
      newMap.delete(projectPath);
      return newMap;
    });
  }, []);

  const initializeProjectFolders = useCallback(
    (projectPath: string, rootNodeId: string) => {
      setExpandedFolders((prev) => {
        const newMap = new Map(prev);
        const currentFolders = newMap.get(projectPath) || new Set<string>();
        const newFolders = new Set(currentFolders);
        newFolders.add(rootNodeId);
        newMap.set(projectPath, newFolders);
        return newMap;
      });
    },
    []
  );

  return {
    expandedFolders,
    toggleFolder,
    expandFolder,
    removeProjectFolders,
    initializeProjectFolders,
  };
};


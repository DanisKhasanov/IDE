import { useCallback } from "react";
import { useSnackbar } from "@/contexts/SnackbarContext";
import type { OpenProject } from "./useProjectTree";
import type { ProjectTreeNode } from "@/types/project";

interface UseProjectOperationsOptions {
  activeProjectPath: string | null;
  updateProject: (project: OpenProject) => void;
  expandFolder: (nodeId: string, projectPath: string) => void;
}

export const useProjectOperations = ({
  activeProjectPath,
  updateProject,
  expandFolder,
}: UseProjectOperationsOptions) => {
  const { showSuccess, showError } = useSnackbar();

  const findParentId = (
    tree: ProjectTreeNode,
    parentPath: string
  ): string | null => {
    if (tree.type === "directory" && tree.children) {
      const found = tree.children.find(
        (child: ProjectTreeNode) =>
          child.path === parentPath || child.path.startsWith(parentPath)
      );
      if (found) {
        return found.id;
      }
      // Рекурсивно ищем в дочерних папках
      for (const child of tree.children) {
        if (child.type === "directory") {
          const result = findParentId(child, parentPath);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  };

  const handleCreateFile = useCallback(
    async (nodePath: string) => {
      if (!activeProjectPath) return;
      try {
        const project = await window.electronAPI.createFile(
          nodePath,
          activeProjectPath
        );
        if (project) {
          updateProject(project);
          // Раскрываем папку, в которой создан файл
          if (project.tree.type === "directory") {
            const parentId = findParentId(project.tree, nodePath);
            if (parentId) {
              expandFolder(parentId, project.path);
            }
          }
          showSuccess("Файл успешно создан");
        }
      } catch (error) {
        console.error("Ошибка создания файла:", error);
        showError(
          `Ошибка создания файла: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [activeProjectPath, updateProject, expandFolder, showSuccess, showError]
  );

  const handleCreateFolder = useCallback(
    async (nodePath: string) => {
      if (!activeProjectPath) return;
      try {
        const project = await window.electronAPI.createFolder(
          nodePath,
          activeProjectPath
        );
        if (project) {
          updateProject(project);
          // Раскрываем папку, в которой создана папка
          if (project.tree.type === "directory") {
            const parentId = findParentId(project.tree, nodePath);
            if (parentId) {
              expandFolder(parentId, project.path);
            }
          }
          showSuccess("Папка успешно создана");
        }
      } catch (error) {
        console.error("Ошибка создания папки:", error);
        showError(
          `Ошибка создания папки: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [activeProjectPath, updateProject, expandFolder, showSuccess, showError]
  );

  const handleDeleteFile = useCallback(
    async (nodePath: string) => {
      if (!activeProjectPath) return;

      // Подтверждение удаления
      if (!confirm("Вы уверены, что хотите удалить этот файл?")) {
        return;
      }

      try {
        const project = await window.electronAPI.deleteFile(
          nodePath,
          activeProjectPath
        );
        if (project) {
          updateProject(project);
          showSuccess("Файл успешно удален");
        }
      } catch (error) {
        console.error("Ошибка удаления файла:", error);
        showError(
          `Ошибка удаления файла: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [activeProjectPath, updateProject, showSuccess, showError]
  );

  const handleDeleteFolder = useCallback(
    async (nodePath: string) => {
      if (!activeProjectPath) return;

      // Подтверждение удаления
      if (
        !confirm(
          "Вы уверены, что хотите удалить эту папку? Все файлы внутри будут удалены."
        )
      ) {
        return;
      }

      try {
        const project = await window.electronAPI.deleteFolder(
          nodePath,
          activeProjectPath
        );
        if (project) {
          updateProject(project);
        }
      } catch (error) {
        console.error("Ошибка удаления папки:", error);
        alert(
          `Ошибка удаления папки: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [activeProjectPath, updateProject]
  );

  return {
    handleCreateFile,
    handleCreateFolder,
    handleDeleteFile,
    handleDeleteFolder,
  };
};


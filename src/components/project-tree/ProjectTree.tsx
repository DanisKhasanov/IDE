import React, { useState, useCallback } from "react";
import { Card, CardContent, List, Box } from "@mui/material";
import NewProjectModal from "@/components/new-project/NewProjectModal";
import {
  useProjectTree,
  useExpandedFolders,
  useContextMenu,
  useProjectOperations,
} from "@/hooks";
import { ProjectHeader } from "./ProjectHeader";
import { TreeNode } from "./TreeNode";
import { EmptyState } from "./EmptyState";
import { ContextMenu } from "./ContextMenu";

type ProjectTreeProps = {
  onFileOpen?: (filePath: string) => void;
  onProjectPathChange?: (projectPath: string | null) => void;
  activeFilePath?: string | null;
};

const ProjectTree = ({
  onFileOpen,
  onProjectPathChange,
  activeFilePath,
}: ProjectTreeProps) => {
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Хуки для управления состоянием
  const {
    openProjects,
    activeProjectPath,
    expandedProjects,
    loadOpenProjects,
    handleSelectProject,
    handleToggleProject,
    handleSwitchProject,
    handleCloseProject,
    updateProject,
    setActiveProjectPath,
    setExpandedProjects,
  } = useProjectTree({ onProjectPathChange });

  const {
    expandedFolders,
    toggleFolder,
    expandFolder,
    removeProjectFolders,
    initializeProjectFolders,
  } = useExpandedFolders({
    activeProjectPath,
    openProjects,
    activeFilePath,
  });

  const { contextMenu, handleContextMenu, handleCloseContextMenu } =
    useContextMenu();

  const {
    handleCreateFile: createFile,
    handleCreateFolder: createFolder,
    handleDeleteFile: deleteFile,
    handleDeleteFolder: deleteFolder,
  } = useProjectOperations({
    activeProjectPath,
    updateProject,
    expandFolder,
  });

  // Обработчики для контекстного меню
  const handleCreateFile = useCallback(() => {
    if (contextMenu) {
      createFile(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  }, [contextMenu, createFile, handleCloseContextMenu]);

  const handleCreateFolder = useCallback(() => {
    if (contextMenu) {
      createFolder(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  }, [contextMenu, createFolder, handleCloseContextMenu]);

  const handleDeleteFile = useCallback(() => {
    if (contextMenu) {
      deleteFile(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  }, [contextMenu, deleteFile, handleCloseContextMenu]);

  const handleDeleteFolder = useCallback(() => {
    if (contextMenu) {
      deleteFolder(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  }, [contextMenu, deleteFolder, handleCloseContextMenu]);

  const handleFileClick = useCallback(
    (filePath: string) => {
      if (onFileOpen) {
        onFileOpen(filePath);
      }
    },
    [onFileOpen]
  );

  const handleNewProjectClick = () => {
    setIsNewProjectModalOpen(true);
  };

  const handleNewProjectClose = () => {
    setIsNewProjectModalOpen(false);
  };

  const handleNewProjectCreate = async (projectPath: string) => {
    // Обновляем список проектов
    await loadOpenProjects();
    // Устанавливаем созданный проект как активный
    setActiveProjectPath(projectPath);
    if (onProjectPathChange) {
      onProjectPathChange(projectPath);
    }
    // Раскрываем новый проект
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      newSet.add(projectPath);
      return newSet;
    });
    // Инициализируем раскрытые папки для нового проекта
    const project = openProjects.find((p) => p.path === projectPath);
    if (project && project.tree.type === "directory") {
      initializeProjectFolders(projectPath, project.tree.id);
    }
    // Закрываем модальное окно
    setIsNewProjectModalOpen(false);
  };

  const handleCloseProjectWithEvent = useCallback(
    (projectPath: string, event: React.MouseEvent) => {
      event.stopPropagation();
      handleCloseProject(projectPath);
      removeProjectFolders(projectPath);
    },
    [handleCloseProject, removeProjectFolders]
  );

  return (
    <Card
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: "none",
        border: "none",
        backgroundColor: "transparent",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          width: "100%",
          p: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {openProjects.length === 0 ? (
          <EmptyState
            onNewProjectClick={handleNewProjectClick}
            onSelectProjectClick={handleSelectProject}
          />
        ) : (
          <List
            sx={{
              flexGrow: 1,
              overflow: "auto",
              py: 0,
            }}
          >
            {openProjects.map((project) => {
              const isActive = activeProjectPath === project.path;
              const isExpanded = expandedProjects.has(project.path);
              const projectExpandedFolders =
                expandedFolders.get(project.path) || new Set<string>();

              return (
                <Box key={project.path}>
                  <ProjectHeader
                    project={project}
                    isActive={isActive}
                    isExpanded={isExpanded}
                    onToggle={handleToggleProject}
                    onSwitch={handleSwitchProject}
                    onClose={handleCloseProjectWithEvent}
                  />

                  {/* Дерево файлов проекта (показывается только для раскрытых проектов) */}
                  {isExpanded && project.tree.type === "directory" && (
                    <Box sx={{ pl: 2 }}>
                      <List component="div" disablePadding>
                        {project.tree.children.map((child) => (
                          <TreeNode
                            key={child.id}
                            node={child}
                            projectPath={project.path}
                            expandedFolders={projectExpandedFolders}
                            activeFilePath={activeFilePath}
                            onToggle={toggleFolder}
                            onFileClick={handleFileClick}
                            onContextMenu={handleContextMenu}
                          />
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>

      {/* Контекстное меню для создания файла и папки */}
      <ContextMenu
        contextMenu={contextMenu}
        onClose={handleCloseContextMenu}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        onDeleteFile={handleDeleteFile}
        onDeleteFolder={handleDeleteFolder}
      />

      {/* Модальное окно создания нового проекта */}
      <NewProjectModal
        open={isNewProjectModalOpen}
        onClose={handleNewProjectClose}
        onProjectCreate={handleNewProjectCreate}
      />
    </Card>
  );
};

export default ProjectTree;

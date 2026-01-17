import React, { useState } from "react";
import { Card, CardContent, List, Box, IconButton } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SearchIcon from "@mui/icons-material/Search";
import InitProjectModal from "@/components/init-project/InitProjectModal";
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
import SearchTab from "./SearchTab";

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
  const [activeTab, setActiveTab] = useState(0);

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
  const handleCreateFile = () => {
    if (contextMenu) {
      createFile(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  };

  const handleCreateFolder = () => {
    if (contextMenu) {
      createFolder(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  };

  const handleDeleteFile = () => {
    if (contextMenu) {
      deleteFile(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  };

  const handleDeleteFolder = () => {
    if (contextMenu) {
      deleteFolder(contextMenu.nodePath);
    }
    handleCloseContextMenu();
  };

  const handleFileClick = (filePath: string) => {
    if (onFileOpen) {
      onFileOpen(filePath);
    }
  };

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

  const handleCloseProjectWithEvent = (
    projectPath: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    handleCloseProject(projectPath);
    removeProjectFolders(projectPath);
  };

  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
  };

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
      {/* Иконки переключения */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "center",
          gap: 0.5,
          p: 0.85,
        }}
      >
        <IconButton
          onClick={() => handleTabChange(0)}
          aria-label="Дерево проекта"
          size="small"
          sx={{
            color: activeTab === 0 ? "primary.main" : "text.secondary",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <AccountTreeIcon />
        </IconButton>
        <IconButton
          onClick={() => handleTabChange(1)}
          aria-label="Поиск"
          size="small"
          sx={{
            color: activeTab === 1 ? "primary.main" : "text.secondary",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <SearchIcon />
        </IconButton>
      </Box>

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
        {activeTab === 0 ? (
          // Таб "Дерево проекта"
          <>
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
          </>
        ) : (
          // Таб "Поиск"
          <SearchTab onFileOpen={onFileOpen} />
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
      <InitProjectModal
        open={isNewProjectModalOpen}
        onClose={handleNewProjectClose}
        onProjectCreate={handleNewProjectCreate}
      />
    </Card>
  );
};

export default ProjectTree;

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Button,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { ProjectTreeNode } from "@/types/project";
import NewProjectModal from "./NewProjectModal";
import { useSnackbar } from "@/contexts/SnackbarContext";

type ProjectTreeProps = {
  onFileOpen?: (filePath: string) => void;
  onProjectPathChange?: (projectPath: string | null) => void;
  activeFilePath?: string | null;
};

type OpenProject = {
  path: string;
  name: string;
  tree: ProjectTreeNode;
};

const ProjectTree = ({
  onFileOpen,
  onProjectPathChange,
  activeFilePath,
}: ProjectTreeProps) => {
  const [openProjects, setOpenProjects] = useState<OpenProject[]>([]);
  const [activeProjectPath, setActiveProjectPath] = useState<string | null>(
    null
  );
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );
  const [expandedFolders, setExpandedFolders] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    nodePath: string;
    nodeType: "file" | "folder";
  } | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const { showSuccess, showError } = useSnackbar();

  const loadOpenProjects = useCallback(async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.loadOpenProjects) {
        console.log("loadOpenProjects не доступен, пропускаем загрузку");
        return;
      }
      const projects = await window.electronAPI.loadOpenProjects();
      if (projects && projects.length > 0) {
        setOpenProjects(projects);
        // Устанавливаем активный проект
        const lastProjectPath = await window.electronAPI.getLastProjectPath();
        const activePath =
          lastProjectPath && projects.find((p) => p.path === lastProjectPath)
            ? lastProjectPath
            : projects[0].path;
        setActiveProjectPath(activePath);
        if (onProjectPathChange) {
          onProjectPathChange(activePath);
        }
        // Загружаем сохраненные состояния для всех проектов
        const newExpandedFolders = new Map<string, Set<string>>();
        const newExpandedProjects = new Set<string>();
        for (const project of projects) {
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
            newExpandedFolders.set(project.path, new Set([project.tree.id]));
          }
          // По умолчанию раскрываем активный проект
          if (project.path === activePath) {
            newExpandedProjects.add(project.path);
          }
        }
        setExpandedFolders(newExpandedFolders);
        setExpandedProjects(newExpandedProjects);
      }
    } catch (error) {
      console.error("Ошибка загрузки открытых проектов:", error);
    }
  }, [onProjectPathChange]);

  // Загрузка открытых проектов при монтировании
  useEffect(() => {
    loadOpenProjects();
  }, [loadOpenProjects]);

  // Функция для обновления конкретного проекта без перезагрузки всех проектов
  const updateProjectTree = useCallback((updatedProject: OpenProject) => {
    // Обновляем только конкретный проект в состоянии, сохраняя состояние раскрытых папок
    setOpenProjects((prev) => {
      const index = prev.findIndex((p) => p.path === updatedProject.path);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = updatedProject;
        return updated;
      }
      return prev;
    });
  }, []);

  // Подписка на событие изменения списка проектов
  useEffect(() => {
    const handleProjectListChanged = async () => {
      // Увеличиваем задержку для обеспечения обновления файловой системы
      // Особенно важно после компиляции, когда создаются файлы в build/
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Всегда перезагружаем все проекты из конфига при изменении списка проектов
      // Это гарантирует, что все открытые проекты будут отображены
      await loadOpenProjects();
    };
    
    // Обработчик кастомного события с обновленным деревом проекта
    const handleProjectTreeUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<OpenProject>;
      if (customEvent.detail) {
        updateProjectTree(customEvent.detail);
      }
    };

    const unsubscribe = window.electronAPI.onProjectListChanged(
      handleProjectListChanged
    );

    // Также слушаем кастомное событие из App.tsx
    window.addEventListener("project-list-changed", handleProjectListChanged);
    
    // Слушаем кастомное событие с обновленным деревом проекта (от ArduinoToolbar)
    window.addEventListener("project-tree-updated", handleProjectTreeUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener(
        "project-list-changed",
        handleProjectListChanged
      );
      window.removeEventListener(
        "project-tree-updated",
        handleProjectTreeUpdated
      );
    };
  }, [loadOpenProjects, activeProjectPath, updateProjectTree]);

  // Сохранение раскрытых папок при изменении (с debounce)
  useEffect(() => {
    if (!activeProjectPath) {
      return;
    }

    // Проверяем, что проект все еще открыт
    const projectExists = openProjects.some(p => p.path === activeProjectPath);
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
    const project = openProjects.find((p) => activeFilePath.startsWith(p.path));
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

  const handleSelectProject = async () => {
    try {
      console.log("Начинаем выбор проекта...");
      if (!window.electronAPI) {
        console.error("window.electronAPI не доступен");
        return;
      }
      if (!window.electronAPI.selectProjectFolder) {
        console.error("selectProjectFolder не доступен");
        return;
      }
      const project = await window.electronAPI.selectProjectFolder();
      console.log("Получен проект:", project);
      if (project) {
        // Проверяем, не открыт ли уже этот проект в локальном состоянии
        const existingIndex = openProjects.findIndex(
          (p) => p.path === project.path
        );
        if (existingIndex >= 0) {
          // Проект уже открыт, просто переключаемся на него и раскрываем
          setActiveProjectPath(project.path);
          setExpandedProjects((prev) => {
            const newSet = new Set(prev);
            newSet.add(project.path);
            return newSet;
          });
          if (onProjectPathChange) {
            onProjectPathChange(project.path);
          }
        } else {
          // После открытия нового проекта полагаемся на событие project-list-changed
          // которое отправится из select-project-folder и вызовет loadOpenProjects()
          // Но на всякий случай добавляем проект в локальное состояние, если событие не придет
          const activePath = project.path;
          console.log("Открыт новый проект, путь:", activePath);
          console.log("Текущее состояние openProjects перед обновлением:", openProjects.length);
          
          // Устанавливаем только что открытый проект как активный
          setActiveProjectPath(activePath);
          if (onProjectPathChange) {
            onProjectPathChange(activePath);
          }
          
          // Добавляем проект в локальное состояние, если его там еще нет
          // Это нужно на случай, если событие project-list-changed не придет или придет с задержкой
          setOpenProjects((prev) => {
            const exists = prev.find((p) => p.path === project.path);
            if (exists) {
              return prev;
            }
            // Добавляем новый проект к существующим, а не заменяем их
            console.log("Добавляем проект в локальное состояние:", project.path);
            return [...prev, project];
          });
          
          // Раскрываем новый проект
          setExpandedProjects((prev) => {
            const newSet = new Set(prev);
            newSet.add(activePath);
            return newSet;
          });
          
          // Раскрываем корневую папку нового проекта
          if (project.tree.type === "directory") {
            setExpandedFolders((prev) => {
              const newMap = new Map(prev);
              const currentFolders = newMap.get(activePath) || new Set<string>();
              const newFolders = new Set(currentFolders);
              newFolders.add(project.tree.id);
              newMap.set(activePath, newFolders);
              return newMap;
            });
          }
          
          // Ждем немного и перезагружаем все проекты из конфига
          // Это гарантирует, что все проекты будут отображены, даже если событие не придет
          setTimeout(async () => {
            try {
              const allProjects = await window.electronAPI.loadOpenProjects();
              if (allProjects && allProjects.length > 0) {
                console.log("Перезагружены все проекты из конфига:", allProjects.length);
                console.log("Пути проектов:", allProjects.map(p => p.path));
                setOpenProjects([...allProjects]);
                
                // Устанавливаем активный проект
                setActiveProjectPath(activePath);
                if (onProjectPathChange) {
                  onProjectPathChange(activePath);
                }
                
                // Загружаем сохраненные состояния для всех проектов
                const newExpandedFolders = new Map<string, Set<string>>();
                const newExpandedProjects = new Set<string>();
                
                for (const proj of allProjects) {
                  const savedState = await window.electronAPI.getProjectState(proj.path);
                  if (savedState && savedState.expandedFolders.length > 0) {
                    newExpandedFolders.set(
                      proj.path,
                      new Set(savedState.expandedFolders)
                    );
                  } else {
                    // Раскрываем корневую папку по умолчанию
                    if (proj.tree.type === "directory") {
                      newExpandedFolders.set(proj.path, new Set([proj.tree.id]));
                    }
                  }
                  // Раскрываем активный проект
                  if (proj.path === activePath) {
                    newExpandedProjects.add(proj.path);
                  }
                }
                
                setExpandedFolders(newExpandedFolders);
                setExpandedProjects(newExpandedProjects);
              }
            } catch (error) {
              console.error("Ошибка перезагрузки проектов:", error);
            }
          }, 200);
        }
      } else {
        console.log("Проект не выбран (пользователь отменил)");
      }
    } catch (error) {
      console.error("Ошибка выбора проекта:", error);
      alert(
        `Ошибка при выборе проекта: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleToggleProject = (projectPath: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectPath)) {
        newSet.delete(projectPath);
      } else {
        newSet.add(projectPath);
      }
      return newSet;
    });
  };

  const handleSwitchProject = async (projectPath: string) => {
    try {
      const project = await window.electronAPI.switchProject(projectPath);
      if (project) {
        setActiveProjectPath(project.path);
        if (onProjectPathChange) {
          onProjectPathChange(project.path);
        }
        // Раскрываем проект при переключении, если он был свернут
        setExpandedProjects((prev) => {
          const newSet = new Set(prev);
          newSet.add(project.path);
          return newSet;
        });
        // Обновляем проект в списке, если он изменился
        setOpenProjects((prev) => {
          const index = prev.findIndex((p) => p.path === project.path);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = project;
            return updated;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Ошибка переключения проекта:", error);
    }
  };

  const handleCloseProject = async (
    projectPath: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    try {
      await window.electronAPI.closeProject(projectPath);
      const newProjects = openProjects.filter((p) => p.path !== projectPath);
      setOpenProjects(newProjects);

      // Удаляем состояние раскрытых папок для закрытого проекта
      const newExpandedFolders = new Map(expandedFolders);
      newExpandedFolders.delete(projectPath);
      setExpandedFolders(newExpandedFolders);

      // Удаляем из раскрытых проектов
      setExpandedProjects((prev) => {
        const newSet = new Set(prev);
        newSet.delete(projectPath);
        return newSet;
      });

      // Переключаемся на другой проект, если закрыли активный
      if (activeProjectPath === projectPath) {
        if (newProjects.length > 0) {
          const newActivePath = newProjects[0].path;
          setActiveProjectPath(newActivePath);
          // Раскрываем новый активный проект
          setExpandedProjects((prev) => {
            const newSet = new Set(prev);
            newSet.add(newActivePath);
            return newSet;
          });
          if (onProjectPathChange) {
            onProjectPathChange(newActivePath);
          }
        } else {
          setActiveProjectPath(null);
          if (onProjectPathChange) {
            onProjectPathChange(null);
          }
        }
      }
    } catch (error) {
      console.error("Ошибка закрытия проекта:", error);
    }
  };

  const toggleFolder = (nodeId: string, projectPath?: string) => {
    // Используем переданный projectPath или активный проект
    const targetProjectPath = projectPath || activeProjectPath;
    if (!targetProjectPath) return;

    setExpandedFolders((prev) => {
      const newMap = new Map(prev);
      const currentFolders = newMap.get(targetProjectPath) || new Set<string>();
      const newSet = new Set(currentFolders);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      newMap.set(targetProjectPath, newSet);
      return newMap;
    });
  };

  const handleContextMenu = (
    event: React.MouseEvent,
    nodePath: string,
    nodeType: "file" | "folder"
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            nodePath,
            nodeType,
          }
        : null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCreateFile = async () => {
    if (!contextMenu || !activeProjectPath) return;
    try {
      const project = await window.electronAPI.createFile(
        contextMenu.nodePath,
        activeProjectPath
      );
      if (project) {
        // Обновляем проект в списке
        setOpenProjects((prev) => {
          const index = prev.findIndex((p) => p.path === project.path);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = project;
            return updated;
          }
          return prev;
        });
        // Раскрываем папку, в которой создан файл
        const parentPath = contextMenu.nodePath;
        if (project.tree.type === "directory") {
          const parentId = project.tree.children.find(
            (child: ProjectTreeNode) =>
              child.path === parentPath || child.path.startsWith(parentPath)
          )?.id;
          if (parentId) {
            setExpandedFolders((prev) => {
              const newMap = new Map(prev);
              const currentFolders =
                newMap.get(project.path) || new Set<string>();
              newMap.set(project.path, new Set([...currentFolders, parentId]));
              return newMap;
            });
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
    handleCloseContextMenu();
  };

  const handleCreateFolder = async () => {
    if (!contextMenu || !activeProjectPath) return;
    try {
      const project = await window.electronAPI.createFolder(
        contextMenu.nodePath,
        activeProjectPath
      );
      if (project) {
        // Обновляем проект в списке
        setOpenProjects((prev) => {
          const index = prev.findIndex((p) => p.path === project.path);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = project;
            return updated;
          }
          return prev;
        });
        // Раскрываем папку, в которой создана папка
        const parentPath = contextMenu.nodePath;
        if (project.tree.type === "directory") {
          const parentId = project.tree.children.find(
            (child: ProjectTreeNode) =>
              child.path === parentPath || child.path.startsWith(parentPath)
          )?.id;
          if (parentId) {
            setExpandedFolders((prev) => {
              const newMap = new Map(prev);
              const currentFolders =
                newMap.get(project.path) || new Set<string>();
              newMap.set(project.path, new Set([...currentFolders, parentId]));
              return newMap;
            });
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
    handleCloseContextMenu();
  };

  const handleDeleteFile = async () => {
    if (!contextMenu || !activeProjectPath) return;
    if (contextMenu.nodeType !== "file") return;

    // Подтверждение удаления
    if (!confirm("Вы уверены, что хотите удалить этот файл?")) {
      handleCloseContextMenu();
      return;
    }

    try {
      const project = await window.electronAPI.deleteFile(
        contextMenu.nodePath,
        activeProjectPath
      );
      if (project) {
        // Обновляем проект в списке
        setOpenProjects((prev) => {
          const index = prev.findIndex((p) => p.path === project.path);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = project;
            return updated;
          }
          return prev;
        });
        showSuccess("Файл успешно удален");
      }
    } catch (error) {
      console.error("Ошибка удаления файла:", error);
      showError(
        `Ошибка удаления файла: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    handleCloseContextMenu();
  };

  const handleDeleteFolder = async () => {
    if (!contextMenu || !activeProjectPath) return;
    if (contextMenu.nodeType !== "folder") return;

    // Подтверждение удаления
    if (
      !confirm(
        "Вы уверены, что хотите удалить эту папку? Все файлы внутри будут удалены."
      )
    ) {
      handleCloseContextMenu();
      return;
    }

    try {
      const project = await window.electronAPI.deleteFolder(
        contextMenu.nodePath,
        activeProjectPath
      );
      if (project) {
        // Обновляем проект в списке
        setOpenProjects((prev) => {
          const index = prev.findIndex((p) => p.path === project.path);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = project;
            return updated;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Ошибка удаления папки:", error);
      alert(
        `Ошибка удаления папки: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    handleCloseContextMenu();
  };

  const handleFileClick = async (filePath: string) => {
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
    // Закрываем модальное окно
    setIsNewProjectModalOpen(false);
  };

  const renderTreeNode = (
    node: ProjectTreeNode,
    projectPath: string,
    level = 0
  ): React.JSX.Element => {
    // Используем раскрытые папки конкретного проекта, а не только активного
    const projectExpandedFolders = expandedFolders.get(projectPath) || new Set<string>();
    const isExpanded = projectExpandedFolders.has(node.id);
    const isDirectory = node.type === "directory";
    const isActive = activeFilePath === node.path;

    return (
      <Box key={node.id}>
        <ListItem
          disablePadding
          sx={{ pl: level * 2 }}
          onContextMenu={(e) =>
            handleContextMenu(e, node.path, isDirectory ? "folder" : "file")
          }
        >
          <ListItemButton
            onClick={() => {
              if (isDirectory) {
                toggleFolder(node.id, projectPath);
              } else {
                handleFileClick(node.path);
              }
            }}
            sx={{
              py: 0.25,
              backgroundColor: isActive ? "action.selected" : "transparent",
              "&:hover": {
                backgroundColor: isActive ? "action.selected" : "action.hover",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {isDirectory ? (
                isExpanded ? (
                  <FolderOpenIcon fontSize="small" />
                ) : (
                  <FolderIcon fontSize="small" />
                )
              ) : (
                <InsertDriveFileIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={node.name}
              primaryTypographyProps={{
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "primary.main" : "inherit",
              }}
            />
          </ListItemButton>
        </ListItem>
        {isDirectory && isExpanded && node.children && (
          <List component="div" disablePadding>
            {node.children.map((child) => renderTreeNode(child, projectPath, level + 1))}
          </List>
        )}
      </Box>
    );
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 2,
              p: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" align="center">
              Папка еще не открыта
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleNewProjectClick}
                sx={{
                  textTransform: "none",
                }}
              >
                Новый проект
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleSelectProject}
                sx={{
                  textTransform: "none",
                }}
              >
                Открыть папку
              </Button>
            </Box>
          </Box>
        ) : (
          <List
            sx={{
              flexGrow: 1,
              overflow: "auto",
              py: 0,
            }}
          >
            {/* Список проектов вертикально */}
            {openProjects.map((project) => {
              const isActive = activeProjectPath === project.path;
              const isExpanded = expandedProjects.has(project.path);
              return (
                <Box key={project.path}>
                  {/* Заголовок проекта */}
                  <ListItem
                    disablePadding
                    sx={{
                      backgroundColor: isActive
                        ? "action.selected"
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isActive
                          ? "action.selected"
                          : "action.hover",
                      },
                      borderLeft: isActive ? 2 : 0,
                      borderColor: "primary.main",
                    }}
                  >
                    <ListItemButton
                      onClick={(e) => {
                        // Если клик на кнопку закрытия, не обрабатываем
                        if (
                          (e.target as HTMLElement).closest(
                            'button[title="Закрыть проект"]'
                          )
                        ) {
                          return;
                        }
                        // При клике на всю кнопку сворачиваем/разворачиваем проект
                        handleToggleProject(project.path);
                        // Если проект был свернут, также переключаемся на него
                        if (!isExpanded) {
                          handleSwitchProject(project.path);
                        }
                      }}
                      sx={{
                        py: 0.25,
                        px: 1,
                        minHeight: 24,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {isExpanded ? (
                            <FolderOpenIcon fontSize="small" />
                          ) : (
                            <FolderIcon fontSize="small" />
                          )}
                          {isExpanded ? (
                            <ExpandMoreIcon fontSize="small" />
                          ) : (
                            <ChevronRightIcon fontSize="small" />
                          )}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={project.name}
                        primaryTypographyProps={{
                          fontSize: "0.75rem",
                          fontWeight: isActive ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => handleCloseProject(project.path, e)}
                        sx={{
                          ml: 0.5,
                          p: 0.25,
                          opacity: 0.6,
                          "&:hover": {
                            opacity: 1,
                            backgroundColor: "error.main",
                            color: "error.contrastText",
                          },
                        }}
                        title="Закрыть проект"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  </ListItem>

                  {/* Дерево файлов проекта (показывается только для раскрытых проектов) */}
                  {isExpanded && project.tree.type === "directory" && (
                    <Box sx={{ pl: 2 }}>
                      <List component="div" disablePadding>
                        {project.tree.children.map((child) =>
                          renderTreeNode(child, project.path)
                        )}
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
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleCreateFile}>Создать файл</MenuItem>
        <MenuItem onClick={handleCreateFolder}>Создать папку</MenuItem>
        {contextMenu?.nodeType === "file" && (
          <MenuItem onClick={handleDeleteFile}>Удалить файл</MenuItem>
        )}
        {contextMenu?.nodeType === "folder" && (
          <MenuItem onClick={handleDeleteFolder}>Удалить папку</MenuItem>
        )}
      </Menu>

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

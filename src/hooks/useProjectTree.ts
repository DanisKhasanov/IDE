import { useState, useEffect, useCallback } from "react";
import type { ProjectTreeNode } from "@/types/project";

export type OpenProject = {
  path: string;
  name: string;
  tree: ProjectTreeNode;
};

interface UseProjectTreeOptions {
  onProjectPathChange?: (projectPath: string | null) => void;
}

export const useProjectTree = ({ onProjectPathChange }: UseProjectTreeOptions = {}) => {
  const [openProjects, setOpenProjects] = useState<OpenProject[]>([]);
  const [activeProjectPath, setActiveProjectPath] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const loadOpenProjects = useCallback(async () => {
    try {
      if (!window.electronAPI?.loadOpenProjects) {
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
        // По умолчанию раскрываем активный проект
        const newExpandedProjects = new Set<string>();
        newExpandedProjects.add(activePath);
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
      await new Promise((resolve) => setTimeout(resolve, 300));

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
  }, [loadOpenProjects, updateProjectTree]);

  const handleSelectProject = useCallback(async () => {
    try {
      console.log("Начинаем выбор проекта...");
      if (!window.electronAPI?.selectProjectFolder) {
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
          console.log(
            "Текущее состояние openProjects перед обновлением:",
            openProjects.length
          );

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

          // Ждем немного и перезагружаем все проекты из конфига
          // Это гарантирует, что все проекты будут отображены, даже если событие не придет
          setTimeout(async () => {
            try {
              const allProjects = await window.electronAPI.loadOpenProjects();
              if (allProjects && allProjects.length > 0) {
                console.log(
                  "Перезагружены все проекты из конфига:",
                  allProjects.length
                );
                console.log(
                  "Пути проектов:",
                  allProjects.map((p) => p.path)
                );
                setOpenProjects([...allProjects]);

                // Устанавливаем активный проект
                setActiveProjectPath(activePath);
                if (onProjectPathChange) {
                  onProjectPathChange(activePath);
                }

                // Раскрываем активный проект
                const newExpandedProjects = new Set<string>();
                newExpandedProjects.add(activePath);
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
  }, [openProjects, onProjectPathChange]);

  const handleToggleProject = useCallback((projectPath: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectPath)) {
        newSet.delete(projectPath);
      } else {
        newSet.add(projectPath);
      }
      return newSet;
    });
  }, []);

  const handleSwitchProject = useCallback(
    async (projectPath: string) => {
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
    },
    [onProjectPathChange]
  );

  const handleCloseProject = useCallback(
    async (projectPath: string) => {
      try {
        await window.electronAPI.closeProject(projectPath);
        const newProjects = openProjects.filter((p) => p.path !== projectPath);
        setOpenProjects(newProjects);

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
    },
    [openProjects, activeProjectPath, onProjectPathChange]
  );

  const updateProject = useCallback((project: OpenProject) => {
    setOpenProjects((prev) => {
      const index = prev.findIndex((p) => p.path === project.path);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = project;
        return updated;
      }
      return prev;
    });
  }, []);

  return {
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
  };
};


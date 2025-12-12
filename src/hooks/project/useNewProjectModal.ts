import { useState, useEffect } from "react";

interface UseNewProjectModalOptions {
  onProjectCreate?: (projectPath: string) => void;
}

export const useNewProjectModal = ({
  onProjectCreate,
}: UseNewProjectModalOptions = {}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onMenuNewProject) {
      console.warn("electronAPI.onMenuNewProject не доступен");
      return;
    }

    const unsubscribe = window.electronAPI.onMenuNewProject(() => {
      setIsOpen(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleProjectCreate = async (projectPath: string) => {
    try {
      if (onProjectCreate) {
        onProjectCreate(projectPath);
      }
      // Отправляем событие обновления списка проектов
      window.dispatchEvent(new CustomEvent("project-list-changed"));
    } catch (error) {
      console.error("Ошибка создания проекта:", error);
    }
  };

  return {
    isOpen,
    handleClose,
    handleProjectCreate,
  };
};


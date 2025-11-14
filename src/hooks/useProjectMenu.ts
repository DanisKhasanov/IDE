import { useEffect } from "react";

interface UseProjectMenuOptions {
  onProjectOpen: (projectPath: string) => void;
}

export const useProjectMenu = ({ onProjectOpen }: UseProjectMenuOptions) => {
  useEffect(() => {
    const unsubscribeOpenProject = window.electronAPI.onMenuOpenProject(async () => {
      try {
        const project = await window.electronAPI.selectProjectFolder();
        if (project) {
          onProjectOpen(project.path);
          // Отправляем событие обновления списка проектов для ProjectTree
          window.dispatchEvent(new CustomEvent('project-list-changed'));
        }
      } catch (error) {
        console.error('Ошибка открытия проекта из меню:', error);
      }
    });

    return () => {
      unsubscribeOpenProject();
    };
  }, [onProjectOpen]);
};




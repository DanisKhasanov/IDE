import { useEffect, useState, useCallback } from "react";

interface UseTerminalOptions {
  currentProjectPath: string | null;
}

export const useTerminal = ({ currentProjectPath }: UseTerminalOptions) => {
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);

  const toggleTerminal = useCallback(async () => {
    setIsTerminalVisible((prevValue) => {
      const newValue = !prevValue;
      
      // Сохраняем состояние терминала в проекте
      if (currentProjectPath) {
        window.electronAPI.saveTerminalState(currentProjectPath, newValue).catch((error) => {
          console.error('Ошибка сохранения состояния терминала:', error);
        });
      }
      
      return newValue;
    });
  }, [currentProjectPath]);

  // Загрузка состояния терминала при открытии проекта
  useEffect(() => {
    const loadTerminalState = async () => {
      if (!currentProjectPath) {
        setIsTerminalVisible(false);
        return;
      }

      try {
        const terminalState = await window.electronAPI.getTerminalState(currentProjectPath);
        setIsTerminalVisible(terminalState);
      } catch (error) {
        console.error('Ошибка загрузки состояния терминала:', error);
        setIsTerminalVisible(false);
      }
    };

    loadTerminalState();
  }, [currentProjectPath]);

  // Подписка на глобальную горячую клавишу для переключения терминала
  useEffect(() => {
    const unsubscribe = window.electronAPI.onToggleTerminal(() => {
      toggleTerminal();
    });

    // Отписываемся при размонтировании компонента
    return () => {
      unsubscribe();
    };
  }, [toggleTerminal]);

  return {
    isTerminalVisible,
    toggleTerminal,
  };
};




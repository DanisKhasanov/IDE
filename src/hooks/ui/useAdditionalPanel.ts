import { useState, useEffect, useCallback } from "react";

export const useAdditionalPanel = () => {
  const [isGuiPanelVisible, setIsGuiPanelVisible] = useState<boolean>(true);
  const [isGraphicalInitVisible, setIsGraphicalInitVisible] = useState<boolean>(true);

  // Загрузка начальных значений из конфигурации
  useEffect(() => {
    const loadInitialVisibility = async () => {
      try {
        const [guiVisible, graphicalInitVisible] = await Promise.all([
          window.electronAPI.getGuiPanelVisible(),
          window.electronAPI.getGraphicalInitVisible(),
        ]);
        setIsGuiPanelVisible(guiVisible);
        setIsGraphicalInitVisible(graphicalInitVisible);
      } catch (error) {
        console.error("Ошибка загрузки видимости панелей:", error);
        // Используем значения по умолчанию при ошибке
        setIsGuiPanelVisible(true);
        setIsGraphicalInitVisible(true);
      }
    };

    loadInitialVisibility();
  }, []);

  const hideGuiPanel = useCallback(async () => {
    setIsGuiPanelVisible(false);
    try {
      await window.electronAPI.setGuiPanelVisible(false);
    } catch (error) {
      console.error("Ошибка сохранения видимости панели GUI:", error);
    }
  }, []);

  const showGuiPanel = useCallback(async () => {
    setIsGuiPanelVisible(true);
    try {
      await window.electronAPI.setGuiPanelVisible(true);
    } catch (error) {
      console.error("Ошибка сохранения видимости панели GUI:", error);
    }
  }, []);

  const hideGraphicalInit = useCallback(async () => {
    setIsGraphicalInitVisible(false);
    try {
      await window.electronAPI.setGraphicalInitVisible(false);
    } catch (error) {
      console.error("Ошибка сохранения видимости панели графической инициализации:", error);
    }
  }, []);

  const showGraphicalInit = useCallback(async () => {
    setIsGraphicalInitVisible(true);
    try {
      await window.electronAPI.setGraphicalInitVisible(true);
    } catch (error) {
      console.error("Ошибка сохранения видимости панели графической инициализации:", error);
    }
  }, []);

  // Подписка на события меню для переключения панелей
  useEffect(() => {
    const unsubscribeShowGui = window.electronAPI.onShowGuiPanel(() => {
      // Переключаем состояние панели GUI
      if (isGuiPanelVisible) {
        hideGuiPanel();
      } else {
        showGuiPanel();
      }
    });

    const unsubscribeShowGraphicalInit = window.electronAPI.onShowGraphicalInit(() => {
      // Переключаем состояние панели графической инициализации
      if (isGraphicalInitVisible) {
        hideGraphicalInit();
      } else {
        showGraphicalInit();
      }
    });

    return () => {
      unsubscribeShowGui();
      unsubscribeShowGraphicalInit();
    };
  }, [isGuiPanelVisible, isGraphicalInitVisible, showGuiPanel, hideGuiPanel, showGraphicalInit, hideGraphicalInit]);

  return {
    isGuiPanelVisible,
    isGraphicalInitVisible,
    hideGuiPanel,
    showGuiPanel,
    hideGraphicalInit,
    showGraphicalInit,
  };
};


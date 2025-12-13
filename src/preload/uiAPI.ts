import { safeInvoke } from './utils';

/**
 * API для работы с UI настройками
 */
export const uiAPI = {
  // Получение видимости панели GUI
  getGuiPanelVisible: async (): Promise<boolean> => {
    return safeInvoke<boolean>('get-gui-panel-visible');
  },

  // Сохранение видимости панели GUI
  setGuiPanelVisible: async (visible: boolean): Promise<{ success: boolean }> => {
    return safeInvoke<{ success: boolean }>('set-gui-panel-visible', visible);
  },

  // Получение видимости панели графической инициализации
  getGraphicalInitVisible: async (): Promise<boolean> => {
    return safeInvoke<boolean>('get-graphical-init-visible');
  },

  // Сохранение видимости панели графической инициализации
  setGraphicalInitVisible: async (visible: boolean): Promise<{ success: boolean }> => {
    return safeInvoke<{ success: boolean }>('set-graphical-init-visible', visible);
  },
};


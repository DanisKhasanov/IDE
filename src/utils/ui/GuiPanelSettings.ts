const GUI_PANEL_VISIBLE_FIELDS_KEY = 'gui-panel-visible-fields';

export interface GuiPanelSettings {
  visibleFields: string[];
}

const DEFAULT_SETTINGS: GuiPanelSettings = {
  visibleFields: [],
};

/**
 * Сохранение настроек мини-панели GUI
 */
export function saveGuiPanelSettings(settings: GuiPanelSettings): void {
  try {
    localStorage.setItem(GUI_PANEL_VISIBLE_FIELDS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Ошибка сохранения настроек мини-панели GUI:', error);
    throw error;
  }
}

/**
 * Загрузка настроек мини-панели GUI
 */
export function loadGuiPanelSettings(): GuiPanelSettings {
  try {
    const stored = localStorage.getItem(GUI_PANEL_VISIBLE_FIELDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        visibleFields: parsed.visibleFields || DEFAULT_SETTINGS.visibleFields,
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Ошибка загрузки настроек мини-панели GUI:', error);
    return DEFAULT_SETTINGS;
  }
}


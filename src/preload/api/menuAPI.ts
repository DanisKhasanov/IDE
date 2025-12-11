import { createIpcListener } from './utils';

/**
 * API для работы с событиями меню
 */
export const menuAPI = {
  // Подписка на событие открытия проекта
  onMenuOpenProject: (callback: () => void) => {
    return createIpcListener('menu-open-project', callback);
  },

  // Подписка на событие создания нового проекта
  onMenuNewProject: (callback: () => void) => {
    return createIpcListener('menu-new-project', callback);
  },

  // Подписка на событие сохранения файла
  onMenuSaveFile: (callback: () => void) => {
    return createIpcListener('menu-save-file', callback);
  },

  // Подписка на событие сохранения файла как
  onMenuSaveFileAs: (callback: () => void) => {
    return createIpcListener('menu-save-file-as', callback);
  },

  // Подписка на событие изменения списка проектов
  onProjectListChanged: (callback: () => void) => {
    return createIpcListener('project-list-changed', callback);
  },

  // Подписка на событие переключения темы
  onToggleTheme: (callback: () => void) => {
    return createIpcListener('toggle-theme', callback);
  },
};


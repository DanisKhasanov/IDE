import { ipcRenderer } from 'electron';
import { safeInvoke, createIpcListener } from './utils';

/**
 * API для работы с терминалом
 */
export const terminalAPI = {
  // Сохранение состояния терминала
  saveTerminalState: async (projectPath: string, isVisible: boolean) => {
    return safeInvoke('save-terminal-state', projectPath, isVisible);
  },

  // Получение состояния терминала
  getTerminalState: async (projectPath: string) => {
    return safeInvoke('get-terminal-state', projectPath);
  },

  // Подписка на событие переключения терминала
  onToggleTerminal: (callback: () => void) => {
    return createIpcListener('toggle-terminal', callback);
  },

  // Создание терминала
  createTerminal: async (cwd?: string) => {
    return safeInvoke('create-terminal', cwd);
  },

  // Запись данных в терминал
  writeTerminal: async (terminalId: number, data: string) => {
    return safeInvoke('write-terminal', terminalId, data);
  },

  // Изменение размера терминала
  resizeTerminal: async (terminalId: number, cols: number, rows: number) => {
    return safeInvoke('resize-terminal', terminalId, cols, rows);
  },

  // Уничтожение терминала
  destroyTerminal: async (terminalId: number) => {
    return safeInvoke('destroy-terminal', terminalId);
  },

  // Подписка на данные терминала
  onTerminalData: (terminalId: number, callback: (data: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: number, data: string) => {
      if (id === terminalId) {
        callback(data);
      }
    };
    ipcRenderer.on('terminal-data', handler);
    // Возвращаем функцию для отписки
    return () => {
      ipcRenderer.removeListener('terminal-data', handler);
    };
  },
};


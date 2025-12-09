import { ipcRenderer } from 'electron';

/**
 * Утилита для безопасного вызова IPC методов с обработкой ошибок
 */
export const safeInvoke = async <T>(
  channel: string,
  ...args: any[]
): Promise<T> => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`Ошибка в ${channel}:`, error);
    console.error('Детали ошибки:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    throw error;
  }
};

/**
 * Утилита для создания подписчика на IPC события с функцией отписки
 */
export const createIpcListener = (
  channel: string,
  callback: (...args: any[]) => void
): (() => void) => {
  const handler = (_event: Electron.IpcRendererEvent, ...args: any[]) => {
    callback(...args);
  };
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
};


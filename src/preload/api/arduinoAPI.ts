import { ipcRenderer } from 'electron';
import { safeInvoke, createIpcListener } from './utils';
import type { SerialPortInfo, SerialPortPermissionStatus } from '@/types/arduino';

/**
 * API для работы с Arduino
 */
export const arduinoAPI = {
  // Компиляция проекта
  compile: async (projectPath: string, boardName: string = 'uno') => {
    return safeInvoke('arduino-compile', projectPath, boardName);
  },

  // Определение Arduino проекта
  detectProject: async (projectPath: string) => {
    return safeInvoke('arduino-detect-project', projectPath);
  },

  // Получение списка плат
  getBoards: async () => {
    return safeInvoke('arduino-get-boards');
  },

  // Получение конфигурации платы
  getBoardConfig: async (boardName: string = 'uno') => {
    return safeInvoke('arduino-get-board-config', boardName);
  },

  // Обнаружение Arduino портов
  // Единственный метод для получения списка портов - использует SerialPortWatcher
  detectArduinoPorts: async () => {
    return safeInvoke('arduino-detect-ports');
  },

  // Заливка прошивки
  uploadFirmware: async (hexFilePath: string, portPath: string, boardName: string = 'uno') => {
    return safeInvoke('arduino-upload-firmware', hexFilePath, portPath, boardName);
  },

  // Проверка прав доступа к COM-портам
  checkPortPermissions: async () => {
    return safeInvoke('arduino-check-port-permissions');
  },

  // Настройка прав доступа к COM-портам
  setupPortPermissions: async () => {
    return safeInvoke('arduino-setup-port-permissions');
  },

  // Подписка на изменения списка портов (event-driven)
  onPortsChanged: (callback: (ports: SerialPortInfo[]) => void) => {
    return createIpcListener('serial-ports-changed', callback);
  },

  // Подписка на изменения прав доступа (event-driven)
  onPermissionsChanged: (callback: (permissions: SerialPortPermissionStatus) => void) => {
    return createIpcListener('serial-permissions-changed', callback);
  },
};


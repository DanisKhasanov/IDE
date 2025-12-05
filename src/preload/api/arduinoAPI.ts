import { safeInvoke } from './utils';

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

  // Получение списка всех COM-портов
  listPorts: async () => {
    return safeInvoke('arduino-list-ports');
  },

  // Обнаружение Arduino портов
  detectArduinoPorts: async () => {
    return safeInvoke('arduino-detect-ports');
  },

  // Заливка прошивки
  uploadFirmware: async (hexFilePath: string, portPath: string, boardName: string = 'uno') => {
    return safeInvoke('arduino-upload-firmware', hexFilePath, portPath, boardName);
  },
};


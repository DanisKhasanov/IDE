import { safeInvoke } from './utils';

/**
 * API для работы с файлами
 */
export const fileAPI = {
  // Сохранение файла
  saveFile: async (filePath: string, content: string) => {
    return safeInvoke('save-file', filePath, content);
  },

  // Сохранение файла как
  saveFileAs: async (currentFilePath: string, content: string) => {
    return safeInvoke('save-file-as', currentFilePath, content);
  },
};


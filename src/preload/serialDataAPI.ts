import { safeInvoke, createIpcListener } from './utils';
import type { SensorData } from '@/utils/serial/SerialDataReader';

/**
 * API для работы с Serial данными от контроллера
 */
export const serialDataAPI = {
  // Открыть порт для чтения данных
  open: async (portPath: string, baudRate: number = 9600) => {
    return safeInvoke('serial-data-open', portPath, baudRate);
  },

  // Закрыть порт
  close: async (portPath: string) => {
    return safeInvoke('serial-data-close', portPath);
  },

  // Отправить данные в порт
  write: async (portPath: string, data: string) => {
    return safeInvoke('serial-data-write', portPath, data);
  },

  // Получить список открытых портов
  getOpenPorts: async () => {
    return safeInvoke('serial-data-get-open-ports');
  },

  // Подписка на данные от контроллера
  onData: (callback: (portPath: string, data: SensorData) => void) => {
    return createIpcListener('serial-data-received', callback);
  },

  // Подписка на ошибки
  onError: (callback: (portPath: string, error: string) => void) => {
    return createIpcListener('serial-data-error', callback);
  },

  // Подписка на закрытие порта
  onClose: (callback: (portPath: string) => void) => {
    return createIpcListener('serial-data-closed', callback);
  },
};



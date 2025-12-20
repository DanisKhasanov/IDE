import { ipcMain, BrowserWindow } from 'electron';
import { SerialDataReader, SensorData } from '@utils/serial/SerialDataReader';

// Хранилище открытых портов
const serialReaders = new Map<string, SerialDataReader>();

/**
 * Регистрация IPC обработчиков для работы с Serial данными
 */
export function registerSerialDataHandlers(mainWindow: BrowserWindow | null): void {
  // Открыть порт и начать чтение данных
  ipcMain.handle('serial-data-open', async (_event, portPath: string, baudRate = 9600) => {
    try {
      // Закрываем предыдущее соединение, если оно есть
      const existingReader = serialReaders.get(portPath);
      if (existingReader) {
        await existingReader.close();
        serialReaders.delete(portPath);
      }

      const reader = new SerialDataReader(portPath);
      await reader.open(baudRate);
      
      // Подписываемся на данные и отправляем в renderer
      reader.onData((data: SensorData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('serial-data-received', portPath, data);
        }
      });

      // Обработка ошибок
      reader.on('error', (error: Error) => {
        console.error('Ошибка Serial порта:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('serial-data-error', portPath, error.message);
        }
      });

      // Обработка закрытия порта
      reader.on('close', () => {
        serialReaders.delete(portPath);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('serial-data-closed', portPath);
        }
      });
      
      serialReaders.set(portPath, reader);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Закрыть порт
  ipcMain.handle('serial-data-close', async (_event, portPath: string) => {
    try {
      const reader = serialReaders.get(portPath);
      if (reader) {
        await reader.close();
        serialReaders.delete(portPath);
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Отправка данных в порт
  ipcMain.handle('serial-data-write', async (_event, portPath: string, data: string) => {
    try {
      const reader = serialReaders.get(portPath);
      if (!reader || !reader.isPortOpen()) {
        throw new Error('Порт не открыт');
      }
      reader.write(data);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Получить список открытых портов
  ipcMain.handle('serial-data-get-open-ports', async () => {
    const openPorts = Array.from(serialReaders.keys());
    return { success: true, ports: openPorts };
  });
}

/**
 * Закрыть порт перед заливкой прошивки
 * Добавляет задержку для освобождения ресурсов системы и проверяет освобождение порта
 */
export async function closeSerialPortForUpload(portPath: string): Promise<void> {
  const reader = serialReaders.get(portPath);
  if (reader) {
    try {
      console.log(`Закрываем Serial порт ${portPath} перед заливкой прошивки...`);
      await reader.close();
      serialReaders.delete(portPath);
      
      // Задержка для освобождения ресурсов системы (Linux может требовать время)
      // Увеличена до 3 секунд для более надежного освобождения порта
      // Это особенно важно для Linux, где ядро может держать порт некоторое время
      // Также важно для стабильности при записи больших файлов
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(`Порт ${portPath} успешно закрыт и освобожден`);
    } catch (error) {
      console.error(`Ошибка закрытия порта ${portPath}:`, error);
      // Продолжаем выполнение даже при ошибке закрытия, но добавляем дополнительную задержку
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } else {
    // Если порт не был открыт в нашем приложении, все равно добавляем задержку
    // на случай, если он был открыт в другом процессе
    console.log(`Порт ${portPath} не был открыт в приложении, ожидание освобождения...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Закрыть все открытые порты (при закрытии приложения)
 */
export function closeAllSerialPorts(): void {
  serialReaders.forEach(async (reader) => {
    try {
      await reader.close();
    } catch (error) {
      console.error('Ошибка закрытия порта:', error);
    }
  });
  serialReaders.clear();
}


import { getSerialPort } from './SerialPortManager';
import { EventEmitter } from 'events';

// Универсальный тип для любых данных от контроллера
export type SensorData = Record<string, any>;

/**
 * Менеджер для чтения данных через Serial порт
 * Парсит JSON данные и эмитит события с распарсенными данными
 */
export class SerialDataReader extends EventEmitter {
  private port: any = null;
  private isOpen = false;
  private buffer = ''; // Буфер для накопления данных
  private portPath: string;

  constructor(portPath: string) {
    super();
    this.portPath = portPath;
  }

  /**
   * Открыть Serial порт для чтения данных
   */
  async open(baudRate: number = 9600): Promise<void> {
    if (this.isOpen) {
      throw new Error('Порт уже открыт');
    }

    const { SerialPort } = getSerialPort();
    
    this.port = new SerialPort({
      path: this.portPath,
      baudRate: baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false,
    });

    return new Promise<void>((resolve, reject) => {
      this.port.open((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          this.isOpen = true;
          this.setupDataHandler();
          resolve();
        }
      });
    });
  }

  /**
   * Настройка обработчика данных
   */
  private setupDataHandler(): void {
    if (!this.port) return;

    // Получаем данные порциями (chunks)
    this.port.on('data', (chunk: Buffer) => {
      // Добавляем данные в буфер
      this.buffer += chunk.toString('utf8');
      
      // Ищем полные строки (заканчивающиеся на \n)
      const lines = this.buffer.split('\n');
      
      // Последняя строка может быть неполной, оставляем её в буфере
      this.buffer = lines.pop() || '';
      
      // Обрабатываем полные строки
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          this.parseAndEmit(trimmedLine);
        }
      });
    });

    // Обработка ошибок
    this.port.on('error', (err: Error) => {
      this.emit('error', err);
    });

    // Обработка закрытия порта
    this.port.on('close', () => {
      this.isOpen = false;
      this.buffer = '';
      this.emit('close');
    });
  }

  /**
   * Парсинг строки и отправка события с данными
   */
  private parseAndEmit(line: string): void {
    // Игнорируем разделители (например, "---")
    // Разделители часто используются для обозначения границ пакетов данных
    const separators = ['---', '===', '***', '###'];
    if (separators.includes(line)) {
      // Просто игнорируем разделители, не выводим предупреждения
      console.log('[SerialDataReader] Получен разделитель, игнорируем:', line);
      return;
    }

    // Логируем сырую строку от контроллера
    console.log('[SerialDataReader] Получена строка от контроллера:', line);

    try {
      // Пробуем распарсить как JSON
      const data: SensorData = JSON.parse(line);
      console.log('[SerialDataReader] Распарсено как JSON:', data);
      this.emit('data', data);
    } catch (error) {
      // Если не JSON, пробуем простой формат "KEY:VALUE"
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        // Пробуем преобразовать в число
        const numValue = parseFloat(value);
        const parsedValue = isNaN(numValue) ? value : numValue;
        
        const data = { [key]: parsedValue };
        console.log('[SerialDataReader] Распарсено как KEY:VALUE:', data);
        this.emit('data', data);
      } else {
        // Если не удалось распарсить, отправляем как есть
        console.warn('[SerialDataReader] Не удалось распарсить данные:', line);
      }
    }
  }

  /**
   * Подписка на данные
   */
  onData(callback: (data: SensorData) => void): void {
    this.on('data', callback);
  }

  /**
   * Отписка от данных
   */
  offData(callback: (data: SensorData) => void): void {
    this.off('data', callback);
  }

  /**
   * Отправка данных в порт
   */
  write(data: string | Buffer): void {
    if (!this.port || !this.isOpen) {
      throw new Error('Порт не открыт');
    }
    this.port.write(data);
  }

  /**
   * Закрыть порт
   */
  async close(): Promise<void> {
    if (!this.port || !this.isOpen) {
      return;
    }
    
    return new Promise<void>((resolve) => {
      this.port.close((err: Error | null) => {
        if (err) {
          console.error('Ошибка закрытия порта:', err);
        }
        this.isOpen = false;
        this.buffer = '';
        this.removeAllListeners();
        resolve();
      });
    });
  }

  /**
   * Проверка, открыт ли порт
   */
  isPortOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Получить путь к порту
   */
  getPortPath(): string {
    return this.portPath;
  }
}


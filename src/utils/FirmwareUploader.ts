import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import type { BoardConfig } from '@/types/arduino';
import type { UploadResult } from '@/types/arduino';

const execAsync = promisify(exec);

/**
 * Определение протокола программирования и скорости бод по имени платы
 */
function getUploadProtocol(boardName: string): { protocol: string; baudRate: number } {
  const lowerName = boardName.toLowerCase();
  
  // Arduino Leonardo и Micro используют протокол avr109 с меньшей скоростью
  if (lowerName === 'leonardo' || lowerName === 'micro') {
    return { protocol: 'avr109', baudRate: 57600 };
  }
  
  // По умолчанию для Uno, Nano, Mega используется протокол arduino с 115200 бод
  return { protocol: 'arduino', baudRate: 115200 };
}

/**
 * Заливка прошивки в микроконтроллер через avrdude
 * 
 * @param hexFilePath - путь к HEX файлу прошивки
 * @param portPath - путь к COM-порту (например, /dev/ttyUSB0 или COM3)
 * @param boardConfig - конфигурация платы (MCU, имя и т.д.)
 * @returns результат заливки
 */
export async function uploadFirmware(
  hexFilePath: string,
  portPath: string,
  boardConfig: BoardConfig
): Promise<UploadResult> {
  try {
    // Проверка существования HEX файла
    if (!existsSync(hexFilePath)) {
      return {
        success: false,
        error: `HEX файл не найден: ${hexFilePath}`,
      };
    }

    // Определение протокола программирования
    const { protocol, baudRate } = getUploadProtocol(boardConfig.name);

    // Формирование команды avrdude согласно документации (doc2.txt, строка 162)
    // Формат: avrdude -v -p atmega328p -c arduino -P /dev/ttyUSB0 -b 115200 -U flash:w:build/firmware.hex
    const avrdudeCmd = [
      'avrdude',
      '-v',                                    // verbose режим
      `-p ${boardConfig.mcu}`,                 // микроконтроллер
      `-c ${protocol}`,                        // протокол программирования
      `-P ${portPath}`,                        // путь к порту
      `-b ${baudRate}`,                        // скорость бод
      `-U flash:w:${hexFilePath}:i`,           // запись HEX файла во flash
      '-D',                                    // отключить авто-стирание (быстрее)
    ].join(' ');

    console.log('Выполнение команды заливки:', avrdudeCmd);

    // Выполнение команды с таймаутом 30 секунд
    const { stdout, stderr } = await execAsync(avrdudeCmd, {
      timeout: 30000,
      maxBuffer: 1024 * 1024, // 1MB буфер для вывода
    });

    const output = (stdout || stderr || '').trim();
    
    // Проверка успешности заливки
    // avrdude выводит "avrdude done.  Thank you." при успехе
    const isSuccess = 
      output.includes('avrdude done') ||
      output.includes('Thank you') ||
      (output.includes('bytes of flash') && 
       !output.toLowerCase().includes('error') && 
       !output.toLowerCase().includes('failed'));

    if (isSuccess) {
      return {
        success: true,
        message: 'Прошивка успешно залита',
        stdout: output,
      };
    } else {
      // Парсим ошибку из вывода
      let errorMessage = 'Ошибка заливки прошивки';
      if (output.toLowerCase().includes('not found')) {
        errorMessage = 'Порт не найден или устройство не подключено';
      } else if (output.toLowerCase().includes('permission denied')) {
        errorMessage = 'Нет доступа к порту. На Linux может потребоваться добавить пользователя в группу dialout';
      } else if (output.toLowerCase().includes('timeout')) {
        errorMessage = 'Таймаут ожидания ответа от устройства';
      } else if (output.toLowerCase().includes('sync')) {
        errorMessage = 'Ошибка синхронизации с bootloader. Попробуйте нажать кнопку Reset на плате';
      }
      
      return {
        success: false,
        error: errorMessage,
        stderr: output,
      };
    }
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string; code?: string };
    const errorOutput = err.stderr || err.stdout || err.message;
    
    // Обработка специфичных ошибок
    let errorMessage = `Ошибка выполнения avrdude: ${errorOutput}`;
    
    if (err.code === 'ETIMEDOUT' || err.code === 'TIMEOUT') {
      errorMessage = 'Таймаут выполнения команды. Убедитесь, что устройство подключено и bootloader активен';
    } else if (errorOutput.includes('not found') || errorOutput.includes('ENOENT')) {
      errorMessage = 'avrdude не найден. Убедитесь, что toolchain установлен';
    } else if (errorOutput.includes('permission denied')) {
      errorMessage = 'Нет доступа к порту. На Linux выполните: sudo usermod -a -G dialout $USER и перелогиньтесь';
    }
    
    return {
      success: false,
      error: errorMessage,
      stderr: errorOutput,
    };
  }
}


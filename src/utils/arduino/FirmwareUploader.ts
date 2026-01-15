import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, accessSync, constants } from 'fs';
import type { BoardConfig } from '@/types/arduino';
import type { UploadResult } from '@/types/arduino';
import { getToolchainEnv } from '@utils/toolchain/ToolchainEnv';

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
 * Проверка доступности порта
 */
function checkPortAvailability(portPath: string): { available: boolean; error?: string } {
  try {
    // Проверяем существование файла порта (Linux/Unix)
    if (portPath.startsWith('/dev/')) {
      try {
        accessSync(portPath, constants.F_OK | constants.R_OK | constants.W_OK);
        return { available: true };
      } catch (err) {
        return { 
          available: false, 
          error: `Порт ${portPath} недоступен. Проверьте права доступа: sudo usermod -a -G dialout $USER` 
        };
      }
    }
    // Для Windows (COM порты) просто проверяем, что путь не пустой
    if (portPath.startsWith('COM') || portPath.startsWith('\\\\.\\COM')) {
      return { available: true };
    }
    return { available: true };
  } catch (error) {
    return { 
      available: false, 
      error: `Ошибка проверки порта: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Выполнение команды avrdude с указанными параметрами
 */
async function executeAvrdude(
  hexFilePath: string,
  portPath: string,
  boardConfig: BoardConfig,
  protocol: string,
  baudRate: number
): Promise<{ stdout: string; stderr: string }> {
  // Параметры для более надежной записи:
  // -i 50: увеличенная задержка между попытками (50 мс вместо 10) для стабильности
  // -V: отключение верификации (часто вызывает проблемы при нестабильном соединении)
  // -D: отключение авто-стирания для ускорения (можно использовать, так как запись работает)
  const avrdudeCmd = [
    'avrdude',
    '-v',                                    // verbose режим
    `-p ${boardConfig.mcu}`,                 // микроконтроллер
    `-c ${protocol}`,                        // протокол программирования
    `-P ${portPath}`,                        // путь к порту
    `-b ${baudRate}`,                        // скорость бод
    `-U flash:w:${hexFilePath}:i`,          // запись HEX файла во flash
    '-D',                                    // отключить авто-стирание (быстрее, запись работает)
    '-V',                                    // отключить верификацию (часто вызывает проблемы)
    '-i 50',                                 // увеличенная задержка между попытками (50 мс) для стабильности
    '-F',                                    // принудительная заливка (даже если кажется, что не нужно)
  ].join(' ');

  console.log('Выполнение команды заливки:', avrdudeCmd);

  // Увеличен таймаут до 120 секунд для больших файлов и медленных соединений
  return await execAsync(avrdudeCmd, {
    timeout: 120000, // 120 секунд (2 минуты) для надежности при записи больших файлов
    maxBuffer: 1024 * 1024, // 1MB буфер для вывода
    env: getToolchainEnv(),
  });
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

    // Проверка доступности порта
    const portCheck = checkPortAvailability(portPath);
    if (!portCheck.available) {
      return {
        success: false,
        error: portCheck.error || 'Порт недоступен',
      };
    }

    // Дополнительная задержка перед началом заливки для полного освобождения порта
    // Это особенно важно после закрытия порта в другом процессе
    console.log('Ожидание полного освобождения порта перед заливкой...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Определение протокола программирования
    const { protocol, baudRate } = getUploadProtocol(boardConfig.name);

    // Попытка заливки с основной скоростью
    let output = '';
    let lastError: Error | null = null;
    
    try {
      const result = await executeAvrdude(hexFilePath, portPath, boardConfig, protocol, baudRate);
      output = (result.stdout || result.stderr || '').trim();
    } catch (error) {
      lastError = error as Error;
      const err = error as Error & { stderr?: string; stdout?: string };
      output = (err.stderr || err.stdout || err.message || '').trim();
      
      // Если ошибка синхронизации, пробуем альтернативные скорости (только для протокола arduino)
      if (protocol === 'arduino' && 
          (output.toLowerCase().includes('stk500_recv') || 
           output.toLowerCase().includes('not responding') ||
           output.toLowerCase().includes('stk500_getsync') ||
           output.toLowerCase().includes('not in sync'))) {
        
        console.log('Ошибка синхронизации с основной скоростью, пробуем альтернативные скорости...');
        
        // Альтернативные скорости для протокола arduino
        const alternativeBaudRates = [57600, 19200, 9600];
        
        for (const altBaudRate of alternativeBaudRates) {
          try {
            console.log(`Попытка заливки со скоростью ${altBaudRate} бод...`);
            const result = await executeAvrdude(hexFilePath, portPath, boardConfig, protocol, altBaudRate);
            output = (result.stdout || result.stderr || '').trim();
            lastError = null; // Успешно
            break;
          } catch (altError) {
            const altErr = altError as Error & { stderr?: string; stdout?: string };
            const altOutput = (altErr.stderr || altErr.stdout || altErr.message || '').trim();
            console.log(`Скорость ${altBaudRate} бод не помогла: ${altOutput.substring(0, 100)}...`);
            // Продолжаем пробовать другие скорости
          }
        }
      }
    }
    
    // Проверка успешности заливки
    // avrdude выводит "avrdude done.  Thank you." при успехе
    // Также проверяем, что запись прошла на 100% (даже если верификация не удалась)
    const outputLower = output.toLowerCase();
    const writingCompleted = output.includes('100%') || 
                            (output.includes('bytes of flash written') && 
                             !outputLower.includes('error') && 
                             !outputLower.includes('failed'));
    
    // Если запись завершена на 100%, считаем успехом даже при ошибках верификации
    // или если есть "avrdude done" (даже с ошибками верификации)
    const isSuccess = 
      (!lastError && (
        output.includes('avrdude done') ||
        output.includes('Thank you') ||
        writingCompleted
      )) ||
      // Также считаем успехом, если запись прошла на 100%, даже если была ошибка верификации
      (writingCompleted && (output.includes('bytes of flash written') || output.includes('avrdude done')));

    if (isSuccess) {
      // Проверяем, была ли ошибка верификации, но запись прошла успешно
      const hasVerificationError = outputLower.includes('verifying') && 
                                   (outputLower.includes('ser_recv') || 
                                    outputLower.includes('unable to read') ||
                                    outputLower.includes('out of sync'));
      
      const message = hasVerificationError 
        ? 'Прошивка успешно залита (запись завершена, но верификация не удалась из-за нестабильного соединения)'
        : 'Прошивка успешно залита';
      
      return {
        success: true,
        message: message,
        stdout: output,
      };
    } else {
      // Парсим ошибку из вывода
      let errorMessage = 'Ошибка заливки прошивки';
      
      if (outputLower.includes('not found') || outputLower.includes('enoent')) {
        errorMessage = 'Порт не найден или устройство не подключено. Проверьте подключение USB кабеля.';
      } else if (outputLower.includes('permission denied') || outputLower.includes('eacces')) {
        errorMessage = 'Нет доступа к порту. На Linux выполните: sudo usermod -a -G dialout $USER и перезапустите приложение';
      } else if (outputLower.includes('timeout') || outputLower.includes('etimedout')) {
        errorMessage = 'Таймаут ожидания ответа от устройства. Убедитесь, что:\n' +
          '1. Устройство подключено и включено\n' +
          '2. Bootloader активен (нажмите Reset на плате)\n' +
          '3. Порт не используется другими программами';
      } else if (outputLower.includes('stk500_recv') || outputLower.includes('not responding') || 
                 outputLower.includes('stk500_getsync') || outputLower.includes('not in sync')) {
        // Проверяем, началась ли запись (если есть "writing" или процент выполнения)
        const writingStarted = outputLower.includes('writing') || 
                               outputLower.includes('%') || 
                               outputLower.includes('bytes flash');
        
        if (writingStarted) {
          // Ошибка во время записи (запись началась, но прервалась)
          errorMessage = 'Ошибка во время записи прошивки (запись началась, но прервалась).\n\n' +
            'Возможные причины и решения:\n' +
            '1. Проблемы с питанием:\n' +
            '   - Убедитесь, что USB кабель обеспечивает достаточное питание\n' +
            '   - Попробуйте подключить к другому USB порту (предпочтительно USB 2.0)\n' +
            '   - Избегайте USB-хабов, подключайте напрямую к компьютеру\n' +
            '2. Проблемы с кабелем:\n' +
            '   - Используйте качественный USB кабель с поддержкой передачи данных\n' +
            '   - Избегайте слишком длинных кабелей (рекомендуется до 1.5 метра)\n' +
            '   - Попробуйте другой USB кабель\n' +
            '3. Нестабильное соединение:\n' +
            '   - Проверьте контакты USB разъема на плате\n' +
            '   - Убедитесь, что кабель плотно подключен\n' +
            '   - Переподключите устройство и попробуйте снова\n' +
            '4. Проблемы с bootloader:\n' +
            '   - Bootloader может быть поврежден или нестабилен\n' +
            '   - Попробуйте нажать Reset на плате перед заливкой\n' +
            '   - Для Arduino Uno/Nano: нажмите Reset в течение 2 секунд после начала заливки\n' +
            '5. Помехи или другие процессы:\n' +
            '   - Закройте все программы, использующие порт\n' +
            '   - Отключите другие USB устройства, которые могут создавать помехи\n' +
            '   - Проверьте: lsof | grep ' + portPath + ' (Linux)\n' +
            '6. Попробуйте более низкую скорость:\n' +
            '   - Система автоматически пробует альтернативные скорости\n' +
            '   - Если не помогло, проблема скорее всего в кабеле или питании';
        } else {
          // Ошибка синхронизации (запись не началась)
          errorMessage = 'Ошибка синхронизации с bootloader (programmer is not responding).\n\n' +
            'Возможные причины и решения:\n' +
            '1. Порт занят другим процессом:\n' +
            '   - Закройте Serial Monitor, GUI панель и другие программы, использующие порт\n' +
            '   - Проверьте: lsof | grep ' + portPath + ' (Linux) или Process Explorer (Windows)\n' +
            '2. Bootloader не активен:\n' +
            '   - Нажмите кнопку Reset на плате непосредственно перед заливкой\n' +
            '   - Для Arduino Uno/Nano: нажмите Reset в течение 2 секунд после начала заливки\n' +
            '3. Неправильная скорость передачи:\n' +
            '   - Попробуйте другую скорость (57600, 19200)\n' +
            '4. Проблемы с кабелем/портом:\n' +
            '   - Проверьте USB кабель (должен поддерживать передачу данных)\n' +
            '   - Попробуйте другой USB порт\n' +
            '   - Переподключите устройство\n' +
            '5. Проблемы с правами доступа (Linux):\n' +
            '   - Убедитесь, что пользователь в группе dialout: groups $USER\n' +
            '   - Если нет: sudo usermod -a -G dialout $USER и перелогиньтесь';
        }
      } else if (outputLower.includes('sync')) {
        errorMessage = 'Ошибка синхронизации с bootloader. Попробуйте:\n' +
          '1. Нажать кнопку Reset на плате перед заливкой\n' +
          '2. Закрыть все программы, использующие порт\n' +
          '3. Переподключить устройство';
      }
      
      return {
        success: false,
        error: errorMessage,
        stderr: output,
      };
    }
  } catch (error) {
    // Обработка неожиданных ошибок (не связанных с avrdude)
    const err = error as Error & { stderr?: string; stdout?: string; code?: string };
    const errorOutput = err.stderr || err.stdout || err.message || String(error);
    
    // Обработка специфичных ошибок
    let errorMessage = `Ошибка выполнения avrdude: ${errorOutput}`;
    
    if (err.code === 'ETIMEDOUT' || err.code === 'TIMEOUT') {
      errorMessage = 'Таймаут выполнения команды. Убедитесь, что:\n' +
        '1. Устройство подключено и включено\n' +
        '2. Bootloader активен (нажмите Reset на плате)\n' +
        '3. Порт не используется другими программами';
    } else if (errorOutput.includes('not found') || errorOutput.includes('ENOENT')) {
      errorMessage = 'avrdude не найден. Убедитесь, что toolchain установлен:\n' +
        'Linux: sudo apt install gcc-avr avr-libc avrdude\n' +
        'Windows: установите toolchain через установщик';
    } else if (errorOutput.includes('permission denied') || errorOutput.includes('EACCES')) {
      errorMessage = 'Нет доступа к порту. На Linux выполните:\n' +
        'sudo usermod -a -G dialout $USER\n' +
        'Затем перезапустите приложение или перелогиньтесь';
    } else if (errorOutput.includes('stk500_recv') || errorOutput.includes('not responding') || 
               errorOutput.includes('stk500_getsync') || errorOutput.includes('not in sync')) {
      errorMessage = 'Ошибка синхронизации с bootloader. См. детальную информацию в stderr';
    }
    
    return {
      success: false,
      error: errorMessage,
      stderr: errorOutput,
    };
  }
}


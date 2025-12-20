import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ToolchainStatus {
  installed: boolean;
  tools: {
    avrGcc: boolean;
    avrObjcopy: boolean;
    avrdude: boolean;
  };
  versions: {
    avrGcc?: string;
    avrObjcopy?: string;
    avrdude?: string;
  };
  errors: string[];
}

/**
 * Проверка наличия AVR toolchain в системе
 */
export async function checkToolchain(): Promise<ToolchainStatus> {
  const status: ToolchainStatus = {
    installed: false,
    tools: {
      avrGcc: false,
      avrObjcopy: false,
      avrdude: false,
    },
    versions: {},
    errors: [],
  };

  // Проверка avr-gcc
  try {
    const { stdout } = await execAsync("avr-gcc --version", { timeout: 5000 });
    status.tools.avrGcc = true;
    // Извлекаем версию из первой строки вывода
    const versionMatch = stdout.split("\n")[0].match(/(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      status.versions.avrGcc = versionMatch[1];
    }
  } catch (error) {
    status.errors.push("avr-gcc не найден в PATH");
  }

  // Проверка avr-objcopy
  try {
    const { stdout } = await execAsync("avr-objcopy --version", { timeout: 5000 });
    status.tools.avrObjcopy = true;
    // Извлекаем версию из первой строки вывода
    const versionMatch = stdout.split("\n")[0].match(/(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      status.versions.avrObjcopy = versionMatch[1];
    }
  } catch (error) {
    status.errors.push("avr-objcopy не найден в PATH");
  }

  // Проверка avrdude
  // Сначала проверяем наличие команды через which/where
  try {
    // Проверяем наличие avrdude в PATH
    const whichCmd = process.platform === "win32" ? "where avrdude" : "which avrdude";
    try {
      await execAsync(whichCmd, { timeout: 3000 });
      // Команда найдена, теперь проверяем версию
    } catch (whichError) {
      // Команда не найдена в PATH
      status.errors.push("avrdude не найден в PATH");
      return status;
    }

    // Если команда найдена, проверяем версию
    // avrdude -v выводит версию, но завершается с ошибкой, если не указан программист
    // Используем -? для вывода справки, которая содержит версию
    try {
      const { stdout, stderr } = await execAsync("avrdude -? 2>&1", { timeout: 5000 });
      const output = (stdout + stderr).toLowerCase();
      
      // Проверяем, что это не ошибка "команда не найдена"
      if (output.includes("command not found") || 
          output.includes("не найдена") ||
          output.includes("не найден") ||
          output.includes("could not be found")) {
        status.errors.push("avrdude не найден в PATH");
        return status;
      }
      
      // Ищем версию в формате "avrdude: Version X.Y" или "avrdude version X.Y"
      const versionMatch = (stdout + stderr).match(/avrdude[:\s]+version[:\s]+(\d+\.\d+(?:\.\d+)?)/i);
      
      if (versionMatch) {
        status.tools.avrdude = true;
        status.versions.avrdude = versionMatch[1];
      } else if (output.includes("avrdude") && output.length > 0) {
        // Если в выводе есть упоминание avrdude, значит он установлен
        status.tools.avrdude = true;
      } else {
        status.errors.push("avrdude найден, но не удалось определить версию");
        status.tools.avrdude = true; // Считаем установленным, если команда выполнилась
      }
    } catch (versionError) {
      // Если команда which нашла avrdude, но проверка версии не удалась,
      // все равно считаем, что avrdude установлен (возможно, проблема с правами доступа)
      const err = versionError as Error & { code?: number };
      if (err.code === 127) {
        status.errors.push("avrdude не найден в PATH");
      } else {
        // Команда существует, но возможно есть другие проблемы
        // Проверяем через более простую команду
        try {
          await execAsync("avrdude 2>&1", { timeout: 3000 });
          status.tools.avrdude = true;
        } catch {
          status.errors.push("avrdude найден, но не работает корректно");
        }
      }
    }
  } catch (error) {
    status.errors.push("avrdude не найден в PATH");
  }

  // Toolchain считается установленным, если все три инструмента доступны
  status.installed = status.tools.avrGcc && status.tools.avrObjcopy && status.tools.avrdude;

  return status;
}


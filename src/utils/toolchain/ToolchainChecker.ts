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
  // avrdude -v выводит версию, но завершается с ошибкой, если не указан программист
  // Поэтому проверяем и stdout и stderr, и ищем версию в обоих потоках
  try {
    const { stdout, stderr } = await execAsync("avrdude -v 2>&1", { timeout: 5000 });
    const output = stdout + stderr;
    
    // Проверяем, что команда не была "не найдена"
    const lowerOutput = output.toLowerCase();
    if (lowerOutput.includes("command not found") || 
        lowerOutput.includes("не найдена") ||
        lowerOutput.includes("не найден") ||
        lowerOutput.includes("could not be found")) {
      throw new Error("avrdude не найден");
    }
    
    // Ищем версию в формате "avrdude: Version X.Y" или "avrdude version X.Y"
    const versionMatch = output.match(/avrdude[:\s]+version[:\s]+(\d+\.\d+)/i);
    
    if (versionMatch) {
      status.tools.avrdude = true;
      status.versions.avrdude = versionMatch[1];
    } else {
      // Если версия не найдена, но команда выполнилась и вывела что-то,
      // значит avrdude установлен, просто не удалось извлечь версию
      if (output.length > 0 && !lowerOutput.includes("error")) {
        status.tools.avrdude = true;
      } else {
        throw new Error("avrdude не найден");
      }
    }
  } catch (error) {
    // Проверяем, не является ли ошибка просто отсутствием программиста
    const err = error as Error & { stderr?: string; stdout?: string; code?: number };
    const errorMessage = (err.stderr || err.stdout || err.message || "").toLowerCase();
    
    // Код 127 означает "command not found" в Unix системах
    if (err.code === 127) {
      status.errors.push("avrdude не найден в PATH");
      return status;
    }
    
    // Проверяем, что это не ошибка "команда не найдена"
    if (errorMessage.includes("command not found") || 
        errorMessage.includes("не найдена") ||
        errorMessage.includes("не найден") ||
        errorMessage.includes("could not be found")) {
      status.errors.push("avrdude не найден в PATH");
      return status;
    }
    
    // Если в выводе есть "version" и нет ошибок "не найдена", значит avrdude установлен
    if (errorMessage.includes("version") && 
        !errorMessage.includes("command not found") &&
        !errorMessage.includes("не найдена")) {
      status.tools.avrdude = true;
      const versionMatch = (err.stderr || err.stdout || err.message || "").match(/version[:\s]+(\d+\.\d+)/i);
      if (versionMatch) {
        status.versions.avrdude = versionMatch[1];
      }
    } else {
      status.errors.push("avrdude не найден в PATH");
    }
  }

  // Toolchain считается установленным, если все три инструмента доступны
  status.installed = status.tools.avrGcc && status.tools.avrObjcopy && status.tools.avrdude;

  return status;
}


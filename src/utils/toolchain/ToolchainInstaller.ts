import { platform } from "os";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import type { InstallCommands, InstallResult } from "@/types/toolchain";

/**
 * Получение команд установки toolchain для текущей платформы
 */
export function getInstallCommands(): InstallCommands {
  const osPlatform = platform();

  if (osPlatform === "linux") {
    return {
      platform: "linux",
      commands: [
        "sudo apt update",
        "sudo apt install -y gcc-avr avr-libc avrdude",
      ],
      description: "Установка через apt (Ubuntu/Debian)",
      instructions: [
        "Откройте терминал и выполните следующие команды:",
        "sudo apt update",
        "sudo apt install -y gcc-avr avr-libc avrdude",
        "После установки проверьте наличие инструментов:",
        "avr-gcc --version",
        "avr-objcopy --version",
        "avrdude -v",
      ],
    };
  }

  if (osPlatform === "darwin") {
    return {
      platform: "macos",
      commands: [
        "brew tap osx-cross/avr",
        "brew install avr-gcc",
      ],
      description: "Установка через Homebrew",
      instructions: [
        "Убедитесь, что у вас установлен Homebrew (https://brew.sh/)",
        "Откройте терминал и выполните следующие команды:",
        "brew tap osx-cross/avr",
        "brew install avr-gcc",
        "После установки проверьте наличие инструментов:",
        "avr-gcc --version",
        "avr-objcopy --version",
        "avrdude -v",
      ],
    };
  }

  // Windows
  return {
    platform: "windows",
    commands: [],
    description: "Установка через MSYS2 или вручную",
    instructions: [
      "Для Windows рекомендуется использовать MSYS2:",
      "",
      "1. Установите MSYS2 с https://www.msys2.org/",
      "2. Откройте MSYS2 MinGW 64-bit терминал",
      "3. Выполните команды:",
      "   pacman -Syu",
      "   pacman -S mingw-w64-x86_64-avr-gcc mingw-w64-x86_64-avr-libc mingw-w64-x86_64-avrdude",
      "",
      "Альтернативно:",
      "Скачайте и установите avr-gcc-build с https://github.com/ZakKemble/avr-gcc-build",
      "Убедитесь, что путь к компилятору добавлен в переменную окружения PATH",
      "",
      "После установки проверьте наличие инструментов в командной строке:",
      "avr-gcc --version",
      "avr-objcopy --version",
      "avrdude -v",
    ],
  };
}

/**
 * Получение текста инструкций для отображения пользователю
 */
export function getInstallInstructions(): string {
  const installInfo = getInstallCommands();
  return installInfo.instructions.join("\n");
}

/**
 * Класс для автоматической установки toolchain
 */
export class ToolchainInstaller extends EventEmitter {
  private isInstalling = false;

  /**
   * Установка toolchain для текущей платформы
   */
  async install(): Promise<InstallResult> {
    if (this.isInstalling) {
      return { success: false, error: "Установка уже выполняется" };
    }

    this.isInstalling = true;
    const osPlatform = platform();

    try {
      if (osPlatform === "linux") {
        return await this.installLinux();
      } else if (osPlatform === "darwin") {
        return await this.installMacOS();
      } else {
        return { 
          success: false, 
          error: "Автоматическая установка для Windows не поддерживается. Используйте MSYS2 или установите вручную." 
        };
      }
    } finally {
      this.isInstalling = false;
    }
  }

  /**
   * Установка для Linux через apt
   * Использует pkexec для GUI-запроса пароля sudo
   */
  private async installLinux(): Promise<InstallResult> {
    return new Promise((resolve) => {
      // Используем pkexec для GUI-запроса пароля sudo
      // pkexec требует polkit, который обычно установлен в современных дистрибутивах
      const cmd = 'pkexec sh -c "apt update && apt install -y gcc-avr avr-libc avrdude"';
      
      this.emit("progress", {
        step: "Запрос прав доступа",
        output: "Запрашиваем права администратора для установки пакетов..."
      });

      const process = spawn("sh", ["-c", cmd], {
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stderr = "";

      process.stdout?.on("data", (data) => {
        const output = data.toString();
        this.emit("progress", {
          step: "Установка пакетов",
          output: output.trim()
        });
      });

      process.stderr?.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        // На Linux stderr часто содержит информационные сообщения
        // Проверяем, не является ли это ошибкой
        if (output.toLowerCase().includes("error") || 
            output.toLowerCase().includes("failed") ||
            output.toLowerCase().includes("не удалось")) {
          this.emit("progress", {
            step: "Установка пакетов",
            output: output.trim(),
            error: output.trim()
          });
        } else {
          this.emit("progress", {
            step: "Установка пакетов",
            output: output.trim()
          });
        }
      });

      process.on("close", (code) => {
        if (code === 0) {
          this.emit("progress", {
            step: "Завершено",
            output: "Установка успешно завершена!"
          });
          resolve({ success: true });
        } else {
          // Код 126 обычно означает отмену пользователем в pkexec
          if (code === 126) {
            resolve({ 
              success: false, 
              error: "Установка отменена пользователем или недостаточно прав доступа" 
            });
          } else {
            resolve({ 
              success: false, 
              error: stderr || `Процесс завершился с кодом ${code}` 
            });
          }
        }
      });

      process.on("error", (error) => {
        // Если pkexec не найден, предлагаем альтернативу
        if (error.message.includes("ENOENT") || error.message.includes("не найдена")) {
          resolve({ 
            success: false, 
            error: "pkexec не найден. Установите пакет policykit-1 или выполните установку вручную через терминал." 
          });
        } else {
          resolve({ 
            success: false, 
            error: error.message || "Ошибка выполнения команды установки" 
          });
        }
      });
    });
  }

  /**
   * Установка для macOS через Homebrew
   */
  private async installMacOS(): Promise<InstallResult> {
    return new Promise((resolve) => {
      // Проверяем наличие Homebrew
      const checkBrew = spawn("which", ["brew"]);
      
      checkBrew.on("close", (code) => {
        if (code !== 0) {
          resolve({ 
            success: false, 
            error: "Homebrew не найден. Установите Homebrew с https://brew.sh/" 
          });
          return;
        }

        // Выполняем установку через Homebrew
        const cmd = "brew tap osx-cross/avr && brew install avr-gcc";
        
        this.emit("progress", {
          step: "Подготовка",
          output: "Начинаем установку через Homebrew..."
        });

        const process = spawn("sh", ["-c", cmd], {
          stdio: ["ignore", "pipe", "pipe"]
        });

        let stderr = "";

        process.stdout?.on("data", (data) => {
          const output = data.toString();
          this.emit("progress", {
            step: "Установка через Homebrew",
            output: output.trim()
          });
        });

        process.stderr?.on("data", (data) => {
          const output = data.toString();
          stderr += output;
          // Homebrew часто выводит информацию в stderr
          this.emit("progress", {
            step: "Установка через Homebrew",
            output: output.trim()
          });
        });

        process.on("close", (code) => {
          if (code === 0) {
            this.emit("progress", {
              step: "Завершено",
              output: "Установка успешно завершена!"
            });
            resolve({ success: true });
          } else {
            resolve({ 
              success: false, 
              error: stderr || `Процесс завершился с кодом ${code}` 
            });
          }
        });

        process.on("error", (error) => {
          resolve({ 
            success: false, 
            error: error.message || "Ошибка выполнения команды установки" 
          });
        });
      });

      checkBrew.on("error", () => {
        resolve({ 
          success: false, 
          error: "Не удалось проверить наличие Homebrew" 
        });
      });
    });
  }
}


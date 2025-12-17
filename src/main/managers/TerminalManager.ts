import { BrowserWindow, app } from "electron";
import type { IPty } from "node-pty";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { execSync } from "child_process";
import Module from "module";

// Динамический импорт node-pty для правильной работы в упакованном приложении
// Нативные модули должны загружаться через require в runtime
let pty: typeof import("node-pty") | null = null;

function getPty(): typeof import("node-pty") {
  if (!pty) {
    try {
      if (app.isPackaged) {
        // В упакованном приложении пробуем несколько вариантов путей
        // process.resourcesPath указывает на директорию resources (например, /path/to/app/resources)
        // app.asar находится в resources/app.asar
        // app.asar.unpacked находится в resources/app.asar.unpacked (рядом с app.asar)
        const resourcesPath = process.resourcesPath;
        
        if (!resourcesPath) {
          throw new Error("process.resourcesPath не определен в упакованном приложении");
        }
        
        // Добавляем путь к app.asar.unpacked/node_modules в NODE_PATH для правильного разрешения модулей
        const unpackedNodeModulesPath = join(resourcesPath, "app.asar.unpacked", "node_modules");
        if (existsSync(unpackedNodeModulesPath)) {
          // Добавляем путь в Module._nodeModulePaths для текущего модуля
          // Используем type assertion, так как это внутренний API Node.js
          const ModuleInternal = Module as any;
          if (ModuleInternal._nodeModulePaths) {
            const originalNodeModulePaths = ModuleInternal._nodeModulePaths;
            ModuleInternal._nodeModulePaths = function(from: string) {
              const paths = originalNodeModulePaths.call(this, from);
              if (!paths.includes(unpackedNodeModulesPath)) {
                paths.unshift(unpackedNodeModulesPath);
              }
              return paths;
            };
          }
        }
        
        // Вариант 1: Стандартный require (должен работать с AutoUnpackNativesPlugin и настроенным NODE_PATH)
        try {
          pty = require("node-pty");
          return pty;
        } catch (standardError) {
          // Игнорируем ошибку, пробуем прямые пути
        }
        
        // Вариант 2: Прямой путь к app.asar.unpacked
        // app.asar.unpacked находится в той же директории, что и app.asar (resources/)
        const unpackedPaths = [
          join(resourcesPath, "app.asar.unpacked", "node_modules", "node-pty"),
          // Альтернативный вариант: если resourcesPath указывает не туда
          join(dirname(app.getAppPath()), "app.asar.unpacked", "node_modules", "node-pty"),
        ];
        
        for (const nodePtyPath of unpackedPaths) {
          if (existsSync(nodePtyPath)) {
            try {
              pty = require(nodePtyPath);
              return pty;
            } catch (pathError) {
              // Пробуем следующий путь
              continue;
            }
          }
        }
        
        // Если все варианты не сработали, выбрасываем ошибку с подробной информацией
        throw new Error(
          `Не удалось загрузить node-pty из следующих путей:\n` +
          `  - require("node-pty")\n` +
          unpackedPaths.map(p => `  - ${p}${existsSync(p) ? ' (существует)' : ' (не существует)'}`).join('\n') +
          `\nResources path: ${resourcesPath}\n` +
          `App path: ${app.getAppPath()}\n` +
          `Unpacked node_modules path: ${unpackedNodeModulesPath}${existsSync(unpackedNodeModulesPath) ? ' (существует)' : ' (не существует)'}\n` +
          `Проверьте, что AutoUnpackNativesPlugin правильно распаковал модуль в app.asar.unpacked`
        );
      } else {
        // В режиме разработки используем стандартный require
        pty = require("node-pty");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const appPath = app.getAppPath();
      const isPackaged = app.isPackaged;
      const resourcesPath = process.resourcesPath;
      
      throw new Error(
        `Не удалось загрузить модуль node-pty: ${errorMessage}\n` +
        `App path: ${appPath}\n` +
        `Resources path: ${resourcesPath}\n` +
        `Is packaged: ${isPackaged}`
      );
    }
  }
  return pty;
}

/**
 * Получить путь к shell для Windows
 * Проверяет наличие PowerShell и использует cmd.exe как fallback
 */
function getWindowsShell(): string {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  
  // Список возможных shell для проверки (в порядке приоритета)
  const shellCandidates = [
    // PowerShell Core (pwsh.exe) - современная версия
    "pwsh.exe",
    // Стандартные пути к Windows PowerShell
    join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    join(systemRoot, "SysWOW64", "WindowsPowerShell", "v1.0", "powershell.exe"),
    // PowerShell из переменной окружения
    process.env.PSModulePath?.split(";")[0]?.replace("Modules", "powershell.exe"),
    // PowerShell в PATH
    "powershell.exe",
  ].filter(Boolean) as string[];

  // Проверяем наличие PowerShell
  for (const shellPath of shellCandidates) {
    try {
      // Если это просто имя файла, пробуем найти через where
      if (shellPath.endsWith(".exe") && !shellPath.includes("\\") && !shellPath.includes("/")) {
        try {
          // Используем where.exe для поиска в PATH
          const result = execSync(`where ${shellPath}`, { 
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8",
            timeout: 1000,
          });
          const foundPath = result.trim().split("\n")[0]?.trim();
          if (foundPath && existsSync(foundPath)) {
            return foundPath;
          }
        } catch {
          // Игнорируем ошибку, пробуем следующий вариант
        }
      } else {
        // Проверяем существование файла напрямую
        if (existsSync(shellPath)) {
          return shellPath;
        }
      }
    } catch {
      // Продолжаем проверку следующего варианта
    }
  }

  // Fallback на cmd.exe (всегда доступен на Windows)
  const cmdPaths = [
    join(systemRoot, "System32", "cmd.exe"),
    join(systemRoot, "SysWOW64", "cmd.exe"),
    "cmd.exe",
  ];

  for (const cmdPath of cmdPaths) {
    try {
      if (cmdPath.includes("\\") || cmdPath.includes("/")) {
        if (existsSync(cmdPath)) {
          return cmdPath;
        }
      } else {
        // Проверяем через where
        try {
          const result = execSync(`where ${cmdPath}`, { 
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8",
            timeout: 1000,
          });
          const foundPath = result.trim().split("\n")[0]?.trim();
          if (foundPath && existsSync(foundPath)) {
            return foundPath;
          }
        } catch {
          // Игнорируем
        }
      }
    } catch {
      // Продолжаем
    }
  }

  // Последний fallback - просто cmd.exe (должен быть в PATH)
  return "cmd.exe";
}

/**
 * Менеджер для управления терминалами
 */
export class TerminalManager {
  private terminals = new Map<number, IPty>();
  private nextTerminalId = 1;
  private mainWindow: BrowserWindow | null = null;

  /**
   * Установить главное окно для отправки данных
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Создать новый терминал
   */
  createTerminal(cwd?: string): number {
    const ptyModule = getPty();
    
    // Определяем shell в зависимости от платформы
    let shell: string;
    if (process.platform === "win32") {
      shell = getWindowsShell();
    } else {
      shell = process.env.SHELL || "/bin/bash";
    }

    const terminalId = this.nextTerminalId++;

    try {
      const ptyProcess = ptyModule.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: cwd || process.cwd(),
        env: process.env as { [key: string]: string },
      });

      this.terminals.set(terminalId, ptyProcess);

      // Отправка данных из терминала в рендерер
      ptyProcess.onData((data) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send("terminal-data", terminalId, data);
        }
      });

      // Обработка закрытия терминала
      ptyProcess.onExit(() => {
        this.terminals.delete(terminalId);
      });

      return terminalId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Не удалось создать терминал с shell "${shell}": ${errorMessage}\n` +
        `Рабочая директория: ${cwd || process.cwd()}\n` +
        `Платформа: ${process.platform}`
      );
    }
  }

  /**
   * Записать данные в терминал
   */
  writeToTerminal(terminalId: number, data: string): void {
    const ptyProcess = this.terminals.get(terminalId);
    if (!ptyProcess) {
      throw new Error(`Терминал с id ${terminalId} не найден`);
    }
    ptyProcess.write(data);
  }

  /**
   * Изменить размер терминала
   */
  resizeTerminal(terminalId: number, cols: number, rows: number): void {
    const ptyProcess = this.terminals.get(terminalId);
    if (!ptyProcess) {
      throw new Error(`Терминал с id ${terminalId} не найден`);
    }
    ptyProcess.resize(cols, rows);
  }

  /**
   * Уничтожить терминал
   */
  destroyTerminal(terminalId: number): boolean {
    const ptyProcess = this.terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.kill();
      this.terminals.delete(terminalId);
      return true;
    }
    return false;
  }

  /**
   * Проверить существование терминала
   */
  hasTerminal(terminalId: number): boolean {
    return this.terminals.has(terminalId);
  }

  /**
   * Очистить все терминалы
   */
  clear(): void {
    this.terminals.forEach((ptyProcess) => {
      ptyProcess.kill();
    });
    this.terminals.clear();
  }
}

// Экспортируем singleton экземпляр
export const terminalManager = new TerminalManager();


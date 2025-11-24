import * as pty from "node-pty";
import { BrowserWindow } from "electron";

/**
 * Менеджер для управления терминалами
 */
export class TerminalManager {
  private terminals = new Map<number, pty.IPty>();
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
    const shell =
      process.platform === "win32"
        ? "powershell.exe"
        : process.env.SHELL || "/bin/bash";
    const terminalId = this.nextTerminalId++;

    const ptyProcess = pty.spawn(shell, [], {
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


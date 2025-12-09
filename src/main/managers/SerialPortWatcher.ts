import { EventEmitter } from "events";
import { BrowserWindow } from "electron";
import { detectArduinoPorts } from "@utils/SerialPortManager";
import { checkSerialPortPermissions } from "@utils/SerialPortPermissions";
import type { SerialPortInfo, SerialPortPermissionStatus } from "@/types/arduino";

/**
 * Менеджер для отслеживания COM-портов и уведомления UI об изменениях
 * Использует event-driven подход для эффективного обновления UI
 * 
 * Архитектура:
 * - Централизованный источник данных о портах для всего приложения
 * - Автоматическое отслеживание изменений портов и прав доступа
 * - Event-driven обновление UI через IPC события
 * - Кеширование данных для быстрого доступа
 */
export class SerialPortWatcher extends EventEmitter {
  private watchInterval: NodeJS.Timeout | null = null;
  private lastPorts: SerialPortInfo[] = [];
  private lastPermissions: SerialPortPermissionStatus | null = null;
  private isWatching = false;
  private mainWindow: BrowserWindow | null = null;
  private readonly WATCH_INTERVAL = 3000; // Обновление портов каждые 3 секунды
  private readonly PERMISSIONS_CHECK_INTERVAL = 30000; // Проверка прав каждые 30 секунд
  private lastPermissionsCheck = 0;
  private isCheckingPorts = false; // Защита от одновременных проверок портов
  private isCheckingPermissions = false; // Защита от одновременных проверок прав

  /**
   * Установить главное окно для отправки событий
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Начать отслеживание портов
   */
  startWatching(): void {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;

    // Первоначальная загрузка
    this.checkPorts();
    this.checkPermissions();

    // Периодическое обновление портов
    this.watchInterval = setInterval(() => {
      this.checkPorts();
      // Проверяем права реже, чем порты
      const now = Date.now();
      if (now - this.lastPermissionsCheck > this.PERMISSIONS_CHECK_INTERVAL) {
        this.checkPermissions();
        this.lastPermissionsCheck = now;
      }
    }, this.WATCH_INTERVAL);
  }

  /**
   * Остановить отслеживание портов
   */
  stopWatching(): void {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;

    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

  /**
   * Проверить список портов и уведомить об изменениях
   * Защищено от одновременных вызовов для предотвращения гонок
   */
  private async checkPorts(): Promise<void> {
    // Защита от одновременных проверок
    if (this.isCheckingPorts) {
      return;
    }

    this.isCheckingPorts = true;
    try {
      const ports = await detectArduinoPorts();
      
      // Проверяем, изменился ли список портов
      // Сравниваем не только количество, но и пути портов
      const portsChanged = 
        ports.length !== this.lastPorts.length ||
        ports.some((port, index) => {
          const lastPort = this.lastPorts[index];
          return !lastPort || port.path !== lastPort.path;
        }) ||
        this.lastPorts.some((lastPort, index) => {
          const port = ports[index];
          return !port || lastPort.path !== port.path;
        });

      if (portsChanged) {
        this.lastPorts = ports;
        this.emit("ports-changed", ports);
        this.sendToRenderer("serial-ports-changed", ports);
      }
    } catch (error) {
      // При ошибке отправляем пустой массив только если ранее были порты
      if (this.lastPorts.length > 0) {
        this.lastPorts = [];
        this.emit("ports-changed", []);
        this.sendToRenderer("serial-ports-changed", []);
      }
    } finally {
      this.isCheckingPorts = false;
    }
  }

  /**
   * Проверить права доступа и уведомить об изменениях
   * Защищено от одновременных вызовов для предотвращения гонок
   */
  private async checkPermissions(): Promise<void> {
    // Защита от одновременных проверок
    if (this.isCheckingPermissions) {
      return;
    }

    this.isCheckingPermissions = true;
    try {
      const permissions = await checkSerialPortPermissions();
      
      // Проверяем, изменились ли права
      const permissionsChanged = 
        !this.lastPermissions ||
        permissions.hasAccess !== this.lastPermissions.hasAccess ||
        permissions.needsSetup !== this.lastPermissions.needsSetup ||
        permissions.message !== this.lastPermissions.message;

      if (permissionsChanged) {
        this.lastPermissions = permissions;
        this.emit("permissions-changed", permissions);
        this.sendToRenderer("serial-permissions-changed", permissions);
      }
    } catch (error) {
      // Игнорируем ошибки проверки прав
    } finally {
      this.isCheckingPermissions = false;
    }
  }

  /**
   * Отправить событие в renderer процесс
   */
  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Получить текущий список портов (синхронно из кеша)
   */
  getCurrentPorts(): SerialPortInfo[] {
    return [...this.lastPorts];
  }

  /**
   * Получить текущий статус прав доступа
   */
  getCurrentPermissions(): SerialPortPermissionStatus | null {
    return this.lastPermissions;
  }

  /**
   * Принудительно обновить порты (для ручного обновления из UI)
   * Игнорирует защиту от одновременных вызовов для принудительного обновления
   */
  async refreshPorts(): Promise<SerialPortInfo[]> {
    // Временно снимаем защиту для принудительного обновления
    const wasChecking = this.isCheckingPorts;
    this.isCheckingPorts = false;
    try {
      await this.checkPorts();
      return this.getCurrentPorts();
    } finally {
      this.isCheckingPorts = wasChecking;
    }
  }

  /**
   * Принудительно обновить права доступа (для ручного обновления из UI)
   * Игнорирует защиту от одновременных вызовов для принудительного обновления
   */
  async refreshPermissions(): Promise<SerialPortPermissionStatus> {
    // Временно снимаем защиту для принудительного обновления
    const wasChecking = this.isCheckingPermissions;
    this.isCheckingPermissions = false;
    try {
      await this.checkPermissions();
      if (!this.lastPermissions) {
        throw new Error("Не удалось получить статус прав доступа");
      }
      return this.lastPermissions;
    } finally {
      this.isCheckingPermissions = wasChecking;
    }
  }
}

// Singleton экземпляр
export const serialPortWatcher = new SerialPortWatcher();


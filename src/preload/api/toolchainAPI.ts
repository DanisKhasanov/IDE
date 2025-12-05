import { safeInvoke, createIpcListener } from './utils';
import type { InstallProgress, InstallResult } from '@/types/toolchain';

/**
 * API для работы с toolchain
 */
export const toolchainAPI = {
  // Проверка наличия toolchain
  check: async () => {
    return safeInvoke('toolchain-check');
  },

  // Получение команд установки для текущей платформы
  getInstallCommands: async () => {
    return safeInvoke('toolchain-get-install-commands');
  },

  // Получение инструкций по установке
  getInstallInstructions: async () => {
    return safeInvoke('toolchain-get-install-instructions');
  },

  // Получение статуса установки из конфигурации
  getInstalledStatus: async () => {
    return safeInvoke('toolchain-get-installed-status');
  },

  // Установка статуса toolchain (после успешной установки)
  setInstalled: async (installed: boolean) => {
    return safeInvoke('toolchain-set-installed', installed);
  },

  // Установка toolchain
  install: async (): Promise<InstallResult> => {
    return safeInvoke<InstallResult>('toolchain-install');
  },

  // Подписка на прогресс установки
  onInstallProgress: (callback: (progress: InstallProgress) => void) => {
    return createIpcListener('toolchain-install-progress', (_event, progress: InstallProgress) => {
      callback(progress);
    });
  },
};


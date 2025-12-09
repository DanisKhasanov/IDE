import { platform } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { access, constants } from "fs/promises";
import { listSerialPorts } from "./SerialPortManager";

const execAsync = promisify(exec);

export interface SerialPortPermissionStatus {
  hasAccess: boolean;
  needsSetup: boolean;
  platform: "linux" | "windows" | "macos";
  message: string;
  instructions?: string[];
  canAutoFix: boolean;
}

export interface SerialPortPermissionSetupResult {
  success: boolean;
  message: string;
  needsRelogin?: boolean;
}

/**
 * Проверить, находится ли пользователь в группе dialout (Linux)
 */
async function checkDialoutGroup(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("groups");
    const groups = stdout.trim().split(/\s+/);
    return groups.includes("dialout");
  } catch (error) {
    return false;
  }
}

/**
 * Проверить доступность COM-порта для чтения/записи
 */
async function checkPortAccess(portPath: string): Promise<boolean> {
  try {
    await access(portPath, constants.R_OK | constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Попытаться добавить пользователя в группу dialout через pkexec
 */
async function addUserToDialoutGroup(): Promise<{ success: boolean; error?: string }> {
  try {
    const username = process.env.USER || process.env.USERNAME || "user";
    const cmd = `pkexec usermod -a -G dialout ${username}`;
    
    await execAsync(cmd, { timeout: 30000 });
    return { success: true };
  } catch (error) {
    const err = error as Error & { stderr?: string; code?: string };
    const errorMessage = err.stderr || err.message || String(error);
    
    // Если пользователь отменил запрос пароля
    if (err.code === "1" || errorMessage.includes("canceled") || errorMessage.includes("отменен")) {
      return { 
        success: false, 
        error: "Пользователь отменил запрос прав доступа" 
      };
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Проверить права доступа к COM-портам для текущей платформы
 */
export async function checkSerialPortPermissions(): Promise<SerialPortPermissionStatus> {
  const osPlatform = platform();
  
  if (osPlatform === "linux") {
    // Проверяем наличие пользователя в группе dialout
    const inDialoutGroup = await checkDialoutGroup();
    
    if (inDialoutGroup) {
      // Проверяем доступность хотя бы одного порта
      try {
        const ports = await listSerialPorts();
        
        if (ports.length > 0) {
          const firstPort = ports[0];
          const hasAccess = await checkPortAccess(firstPort.path);
          
          if (hasAccess) {
            return {
              hasAccess: true,
              needsSetup: false,
              platform: "linux",
              message: "Права доступа к COM-портам настроены корректно",
              canAutoFix: false,
            };
          }
        }
      } catch (error) {
        // Игнорируем ошибки проверки доступа
      }
      
      return {
        hasAccess: false,
        needsSetup: true,
        platform: "linux",
        message: "Пользователь в группе dialout, но доступ к портам ограничен",
        instructions: [
          "Попробуйте перелогиниться или выполните команду:",
          "newgrp dialout",
        ],
        canAutoFix: false,
      };
    }
    
    // Пользователь не в группе dialout
    return {
      hasAccess: false,
      needsSetup: true,
      platform: "linux",
      message: "Требуется добавить пользователя в группу dialout для доступа к COM-портам",
      instructions: [
        "Выполните команду в терминале:",
        "sudo usermod -a -G dialout $USER",
        "После этого перелогиньтесь или выполните:",
        "newgrp dialout",
      ],
      canAutoFix: true,
    };
  }
  
  if (osPlatform === "win32") {
    // На Windows обычно права есть по умолчанию
    // Проверяем доступность портов
    try {
      await listSerialPorts();
      return {
        hasAccess: true,
        needsSetup: false,
        platform: "windows",
        message: "Права доступа к COM-портам настроены корректно",
        canAutoFix: false,
      };
    } catch (error) {
      return {
        hasAccess: false,
        needsSetup: true,
        platform: "windows",
        message: "Ошибка доступа к COM-портам",
        instructions: [
          "Убедитесь, что драйверы для вашего устройства установлены",
          "Проверьте, что устройство подключено и распознано системой",
        ],
        canAutoFix: false,
      };
    }
  }
  
  if (osPlatform === "darwin") {
    // На macOS обычно права есть по умолчанию
    try {
      await listSerialPorts();
      return {
        hasAccess: true,
        needsSetup: false,
        platform: "macos",
        message: "Права доступа к COM-портам настроены корректно",
        canAutoFix: false,
      };
    } catch (error) {
      return {
        hasAccess: false,
        needsSetup: true,
        platform: "macos",
        message: "Ошибка доступа к COM-портам",
        instructions: [
          "Убедитесь, что драйверы для вашего устройства установлены",
          "Проверьте настройки безопасности в Системных настройках",
        ],
        canAutoFix: false,
      };
    }
  }
  
  // Неизвестная платформа
  return {
    hasAccess: false,
    needsSetup: true,
    platform: "linux", // fallback
    message: "Неизвестная платформа",
    canAutoFix: false,
  };
}

/**
 * Попытаться автоматически настроить права доступа к COM-портам
 */
export async function setupSerialPortPermissions(): Promise<SerialPortPermissionSetupResult> {
  const osPlatform = platform();
  
  if (osPlatform === "linux") {
    const result = await addUserToDialoutGroup();
    
    if (result.success) {
      return {
        success: true,
        message: "Пользователь успешно добавлен в группу dialout. Перелогиньтесь или выполните команду 'newgrp dialout' для применения изменений.",
        needsRelogin: true,
      };
    }
    
    return {
      success: false,
      message: result.error || "Не удалось добавить пользователя в группу dialout",
    };
  }
  
  // Для Windows и macOS автоматическая настройка не требуется
  return {
    success: true,
    message: "На данной платформе права доступа обычно настроены автоматически",
  };
}


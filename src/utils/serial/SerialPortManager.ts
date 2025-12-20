import type { SerialPortInfo } from "@/types/arduino";
import { platform } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { isKnownArduinoDevice } from "@/utils/arduino/BoardDetector";
import { app } from "electron";
import { join, dirname } from "path";
import { existsSync } from "fs";
import Module from "module";

const execAsync = promisify(exec);

// Динамический импорт serialport для правильной работы в упакованном приложении
// Нативные модули должны загружаться через require в runtime
let SerialPortModule: typeof import("serialport") | null = null;

function getSerialPort(): typeof import("serialport") {
  if (!SerialPortModule) {
    try {
      if (app.isPackaged) {
        // В упакованном приложении пробуем несколько вариантов путей
        const resourcesPath = process.resourcesPath;
        
        if (!resourcesPath) {
          throw new Error("process.resourcesPath не определен в упакованном приложении");
        }
        
        // Добавляем путь к app.asar.unpacked/node_modules в NODE_PATH для правильного разрешения модулей
        const unpackedNodeModulesPath = join(resourcesPath, "app.asar.unpacked", "node_modules");
        if (existsSync(unpackedNodeModulesPath)) {
          // Добавляем путь в Module._nodeModulePaths для текущего модуля
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
          SerialPortModule = require("serialport");
          return SerialPortModule;
        } catch (standardError) {
          // Игнорируем ошибку, пробуем прямые пути
        }
        
        // Вариант 2: Прямой путь к app.asar.unpacked
        const unpackedPaths = [
          join(resourcesPath, "app.asar.unpacked", "node_modules", "serialport"),
          join(dirname(app.getAppPath()), "app.asar.unpacked", "node_modules", "serialport"),
        ];
        
        for (const serialportPath of unpackedPaths) {
          if (existsSync(serialportPath)) {
            try {
              SerialPortModule = require(serialportPath);
              return SerialPortModule;
            } catch (pathError) {
              // Пробуем следующий путь
              continue;
            }
          }
        }
        
        // Если все варианты не сработали, выбрасываем ошибку
        throw new Error(
          `Не удалось загрузить serialport в упакованном приложении. ` +
          `Проверьте, что модуль правильно распакован из asar архива.`
        );
      } else {
        // В режиме разработки используем стандартный импорт
        SerialPortModule = require("serialport");
        return SerialPortModule;
      }
    } catch (error) {
      console.error("Ошибка загрузки serialport:", error);
      throw error;
    }
  }
  return SerialPortModule;
}

// Для serialport v13+ метод list() доступен через SerialPort.list()

const LIST_TIMEOUT = 3000; // Таймаут для SerialPort.list() - 3 секунды (уменьшено для более быстрого fallback)
const FALLBACK_TIMEOUT = 2000; // Таймаут для fallback метода - 2 секунды

/**
 * Получить список портов через системные команды Linux (fallback метод)
 * Используется когда SerialPort.list() зависает
 */
async function listSerialPortsLinuxFallback(): Promise<SerialPortInfo[]> {
  const osPlatform = platform();
  if (osPlatform !== "linux") {
    return [];
  }

  try {
    // Получаем список USB/Serial портов через ls
    const lsCommand = "ls -1 /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true";
    const { stdout: lsOutput } = await execAsync(lsCommand, { timeout: FALLBACK_TIMEOUT });
    
    const portPaths = lsOutput
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0);
    
    if (portPaths.length === 0) {
      return [];
    }
    
    // Получаем информацию о VID/PID для каждого порта через udevadm
    const ports: SerialPortInfo[] = [];
    
    for (const portPath of portPaths) {
      try {
        // Получаем информацию о порте через udevadm
        const udevCommand = `udevadm info -q property -n ${portPath} 2>/dev/null || true`;
        const { stdout: udevOutput } = await execAsync(udevCommand, { timeout: FALLBACK_TIMEOUT });
        
        let vendorId: string | undefined;
        let productId: string | undefined;
        let manufacturer: string | undefined;
        
        // Парсим вывод udevadm
        const lines = udevOutput.split("\n");
        for (const line of lines) {
          if (line.startsWith("ID_VENDOR_ID=")) {
            vendorId = line.split("=")[1]?.trim();
          } else if (line.startsWith("ID_MODEL_ID=")) {
            productId = line.split("=")[1]?.trim();
          } else if (line.startsWith("ID_VENDOR=")) {
            manufacturer = line.split("=")[1]?.trim();
          }
        }
        
        ports.push({
          path: portPath,
          vendorId: vendorId?.toLowerCase(),
          productId: productId?.toLowerCase(),
          manufacturer: manufacturer,
          friendlyName: portPath,
        });
      } catch (error) {
        // Если не удалось получить информацию через udevadm, добавляем порт без VID/PID
        ports.push({
          path: portPath,
          vendorId: undefined,
          productId: undefined,
          manufacturer: undefined,
          friendlyName: portPath,
        });
      }
    }
    
    return ports;
  } catch (error) {
    return [];
  }
}

/**
 * Получить список всех доступных COM-портов
 * При зависании SerialPort.list() использует fallback метод для Linux
 * Кеширование и защита от гонок выполняются на уровне SerialPortWatcher
 */
export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  try {
    // Получаем модуль serialport динамически
    const { SerialPort } = getSerialPort();
    // Добавляем таймаут для предотвращения зависания
    const listPromise = SerialPort.list();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Таймаут получения списка портов (${LIST_TIMEOUT}мс)`));
      }, LIST_TIMEOUT);
    });
    
    const ports = await Promise.race([listPromise, timeoutPromise]);
    
    const result = ports.map((port) => {
      // В serialport v13 friendlyName может отсутствовать, используем безопасный доступ
      const portWithFriendlyName = port as typeof port & {
        friendlyName?: string;
      };
      const friendlyName = portWithFriendlyName.friendlyName || port.path;
      return {
        path: port.path,
        manufacturer: port.manufacturer,
        vendorId: port.vendorId,
        productId: port.productId,
        friendlyName: friendlyName,
      };
    });
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Если это таймаут, пробуем использовать fallback метод для Linux
      if (error.message.includes("Таймаут")) {
        const fallbackPorts = await listSerialPortsLinuxFallback();
        if (fallbackPorts.length > 0) {
          return fallbackPorts;
        }
      }
    }
    // Возвращаем пустой массив при ошибке
    return [];
  }
}

/**
 * Обнаружить порты, которые могут быть Arduino платами
 * Фильтрует по известным VID/PID, а если не найдено - показывает только реальные Serial/COM порты
 */
export async function detectArduinoPorts(): Promise<SerialPortInfo[]> {
  try {
    const allPorts = await listSerialPorts();

    // Сначала пытаемся найти порты по VID/PID
    const arduinoPortsByVidPid = allPorts.filter((port) => {
      return isKnownArduinoDevice(port);
    });

    // Если нашли порты по VID/PID, возвращаем их
    if (arduinoPortsByVidPid.length > 0) {
      return arduinoPortsByVidPid;
    }
    
    // Если не нашли по VID/PID, ищем порты по названию (для Linux и других случаев)
    // Показываем только реальные Serial/COM порты, а не любые USB устройства
    const arduinoPortsByName = allPorts.filter((port) => {
      const pathLower = port.path.toLowerCase();
      const friendlyLower = (port.friendlyName || "").toLowerCase();
      const manufacturerLower = (port.manufacturer || "").toLowerCase();

      // Исключаем системные последовательные порты типа /dev/ttyS* (это не USB порты)
      // После toLowerCase() /dev/ttyS0 становится /dev/ttys0
      if (pathLower.match(/^\/dev\/ttys\d+$/)) {
        return false;
      }

      // Проверяем по названию порта - только реальные Serial/COM порты:
      // - Linux: /dev/ttyUSB*, /dev/ttyACM* (USB Serial и ACM порты)
      // - Windows: COM* (COM порты)
      // - macOS: /dev/cu.*, /dev/tty.* (но только если это USB Serial устройства)
      const isUsbSerialPort =
        pathLower.match(/\/dev\/ttyusb\d+/) ||  // /dev/ttyUSB0, /dev/ttyUSB1, etc.
        pathLower.match(/\/dev\/ttyacm\d+/) ||  // /dev/ttyACM0, /dev/ttyACM1, etc.
        pathLower.match(/^com\d+$/);            // COM1, COM2, COM3, etc. (Windows)

      // Проверяем по friendly name или manufacturer (для случаев, когда порт может быть Arduino,
      // но не имеет стандартного названия порта)
      const isArduinoLike =
        friendlyLower.includes("arduino") ||
        manufacturerLower.includes("arduino") ||
        manufacturerLower.includes("ftdi") ||
        manufacturerLower.includes("ch340") ||
        manufacturerLower.includes("cp210");

      return isUsbSerialPort || isArduinoLike;
    });

    // Если нашли порты по названию, возвращаем их
    if (arduinoPortsByName.length > 0) {
      return arduinoPortsByName;
    }

    return [];
  } catch (error) {
    // В случае ошибки возвращаем пустой массив, а не все порты
    // Это предотвращает показ любых USB устройств, когда COM порт не подключен
    console.error("Ошибка обнаружения Arduino портов:", error);
    return [];
  }
}

/**
 * Проверить доступность порта
 */
export async function checkPortAvailability(
  portPath: string
): Promise<boolean> {
  try {
    const ports = await listSerialPorts();
    return ports.some((port) => port.path === portPath);
  } catch (error) {
    return false;
  }
}

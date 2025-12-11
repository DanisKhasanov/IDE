import { SerialPort } from "serialport";
import type { SerialPortInfo } from "@/types/arduino";
import { platform } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Для serialport v13+ метод list() доступен через SerialPort.list()

const LIST_TIMEOUT = 3000; // Таймаут для SerialPort.list() - 3 секунды (уменьшено для более быстрого fallback)
const FALLBACK_TIMEOUT = 2000; // Таймаут для fallback метода - 2 секунды

// Известные VID/PID для Arduino плат
const ARDUINO_DEVICES = [
  { vid: "2341", pid: "0043" }, // Arduino Uno
  { vid: "2341", pid: "0001" }, // Arduino Uno (старая версия)
  { vid: "2341", pid: "0010" }, // Arduino Mega
  { vid: "2341", pid: "0036" }, // Arduino Leonardo
  { vid: "2341", pid: "0037" }, // Arduino Micro
  { vid: "2341", pid: "003F" }, // Arduino Nano
  { vid: "2341", pid: "0243" }, // Arduino Due
  { vid: "2A03", pid: "0043" }, // Arduino Uno (клоны)
  { vid: "2A03", pid: "0001" }, // Arduino Uno (клоны, старая версия)
  // USB-to-Serial чипы, используемые в клонах Arduino
  { vid: "1A86", pid: "7523" }, // CH340 (китайские клоны Arduino)
  { vid: "1A86", pid: "5523" }, // CH341 (китайские клоны Arduino)
  { vid: "10C4", pid: "EA60" }, // CP210x (Silicon Labs)
  { vid: "0403", pid: "6001" }, // FT232 (FTDI)
  { vid: "0403", pid: "6014" }, // FT232H (FTDI)
];

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
 * Фильтрует по известным VID/PID, а если не найдено - показывает все USB/Serial порты
 */
export async function detectArduinoPorts(): Promise<SerialPortInfo[]> {
  try {
    const allPorts = await listSerialPorts();

    // Сначала пытаемся найти порты по VID/PID
    const arduinoPortsByVidPid = allPorts.filter((port) => {
      if (!port.vendorId || !port.productId) {
        return false;
      }

      const matches = ARDUINO_DEVICES.some(
        (device) =>
          device.vid.toLowerCase() === port.vendorId?.toLowerCase() &&
          device.pid.toLowerCase() === port.productId?.toLowerCase()
      );
      
      return matches;
    });

    // Если нашли порты по VID/PID, возвращаем их
    if (arduinoPortsByVidPid.length > 0) {
      return arduinoPortsByVidPid;
    }
    
    // Если не нашли по VID/PID, ищем порты по названию (для Linux и других случаев)
    const arduinoPortsByName = allPorts.filter((port) => {
      const pathLower = port.path.toLowerCase();
      const friendlyLower = (port.friendlyName || "").toLowerCase();
      const manufacturerLower = (port.manufacturer || "").toLowerCase();

      // Исключаем системные последовательные порты типа /dev/ttyS* (это не USB порты)
      // После toLowerCase() /dev/ttyS0 становится /dev/ttys0
      if (pathLower.match(/^\/dev\/ttys\d+$/)) {
        return false;
      }

      // Проверяем по названию порта (Linux: /dev/ttyUSB0, /dev/ttyACM0, Windows: COM3)
      // Только USB/Serial порты, не системные последовательные порты
      const isUsbSerialPort =
        pathLower.includes("ttyusb") ||
        pathLower.includes("ttyacm") ||
        pathLower.includes("com") ||
        (pathLower.includes("usb") && !pathLower.includes("/dev/ttys"));

      // Проверяем по friendly name или manufacturer
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
    // В случае ошибки возвращаем все порты
    try {
      return await listSerialPorts();
    } catch (listError) {
      return [];
    }
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

import type { SerialPortInfo } from "@/types/arduino";

/**
 * Известные VID/PID для Arduino плат и USB-to-Serial чипов
 */
export const ARDUINO_DEVICES = [
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
] as const;

/**
 * Сопоставление VID/PID с названиями плат
 */
const BOARD_NAME_MAP: Record<string, Record<string, string>> = {
  "2341": {
    "0043": "Arduino Uno",
    "0001": "Arduino Uno (старая версия)",
    "0010": "Arduino Mega",
    "0036": "Arduino Leonardo",
    "0037": "Arduino Micro",
    "003f": "Arduino Nano",
    "0243": "Arduino Due",
  },
  "2a03": {
    "0043": "Arduino Uno (клон)",
    "0001": "Arduino Uno (клон, старая версия)",
  },
  "1a86": {
    "7523": "Arduino (CH340)",
    "5523": "Arduino (CH341)",
  },
  "10c4": {
    "ea60": "Arduino (CP210x)",
  },
  "0403": {
    "6001": "Arduino (FT232)",
    "6014": "Arduino (FT232H)",
  },
};

/**
 * Определить название платы по информации о порте
 * @param port Информация о последовательном порте
 * @returns Название платы или fallback значение (manufacturer, friendlyName или path)
 */
export function getBoardName(port: SerialPortInfo): string {
  if (!port.vendorId || !port.productId) {
    // Если нет VID/PID, используем manufacturer или friendlyName
    return port.manufacturer || port.friendlyName || port.path;
  }

  const vid = port.vendorId.toLowerCase();
  const pid = port.productId.toLowerCase();

  const boardName = BOARD_NAME_MAP[vid]?.[pid];
  if (boardName) {
    return boardName;
  }

  // Если не найдено точное совпадение, используем manufacturer или friendlyName
  return port.manufacturer || port.friendlyName || port.path;
}

/**
 * Проверить, является ли порт известной Arduino платой по VID/PID
 * @param port Информация о последовательном порте
 * @returns true, если порт соответствует известному VID/PID
 */
export function isKnownArduinoDevice(port: SerialPortInfo): boolean {
  if (!port.vendorId || !port.productId) {
    return false;
  }

  return ARDUINO_DEVICES.some(
    (device) =>
      device.vid.toLowerCase() === port.vendorId?.toLowerCase() &&
      device.pid.toLowerCase() === port.productId?.toLowerCase()
  );
}


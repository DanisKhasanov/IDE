import { SerialPort } from 'serialport';
import type { SerialPortInfo } from '@/types/arduino';

// Для serialport v13+ метод list() доступен через SerialPort.list()

// Известные VID/PID для Arduino плат
const ARDUINO_DEVICES = [
  { vid: '2341', pid: '0043' }, // Arduino Uno
  { vid: '2341', pid: '0001' }, // Arduino Uno (старая версия)
  { vid: '2341', pid: '0010' }, // Arduino Mega
  { vid: '2341', pid: '0036' }, // Arduino Leonardo
  { vid: '2341', pid: '0037' }, // Arduino Micro
  { vid: '2341', pid: '003F' }, // Arduino Nano
  { vid: '2341', pid: '0243' }, // Arduino Due
  { vid: '2A03', pid: '0043' }, // Arduino Uno (клоны)
  { vid: '2A03', pid: '0001' }, // Arduino Uno (клоны, старая версия)
];

/**
 * Получить список всех доступных COM-портов
 */
export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => {
      // В serialport v13 friendlyName может отсутствовать, используем безопасный доступ
      const portWithFriendlyName = port as typeof port & { friendlyName?: string };
      const friendlyName = portWithFriendlyName.friendlyName || port.path;
      return {
        path: port.path,
        manufacturer: port.manufacturer,
        vendorId: port.vendorId,
        productId: port.productId,
        friendlyName: friendlyName,
      };
    });
  } catch (error) {
    console.error('Ошибка получения списка портов:', error);
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
    const arduinoPortsByVidPid = allPorts.filter(port => {
      if (!port.vendorId || !port.productId) {
        return false;
      }
      
      return ARDUINO_DEVICES.some(
        device => 
          device.vid.toLowerCase() === port.vendorId?.toLowerCase() &&
          device.pid.toLowerCase() === port.productId?.toLowerCase()
      );
    });
    
    // Если нашли порты по VID/PID, возвращаем их
    if (arduinoPortsByVidPid.length > 0) {
      return arduinoPortsByVidPid;
    }
    
    // Если не нашли по VID/PID, ищем порты по названию (для Linux и других случаев)
    const arduinoPortsByName = allPorts.filter(port => {
      const pathLower = port.path.toLowerCase();
      const friendlyLower = (port.friendlyName || '').toLowerCase();
      const manufacturerLower = (port.manufacturer || '').toLowerCase();
      
      // Исключаем системные последовательные порты типа /dev/ttyS* (это не USB порты)
      // После toLowerCase() /dev/ttyS0 становится /dev/ttys0
      if (pathLower.match(/^\/dev\/ttys\d+$/)) {
        return false;
      }
      
      // Проверяем по названию порта (Linux: /dev/ttyUSB0, /dev/ttyACM0, Windows: COM3)
      // Только USB/Serial порты, не системные последовательные порты
      const isUsbSerialPort = 
        pathLower.includes('ttyusb') ||
        pathLower.includes('ttyacm') ||
        pathLower.includes('com') ||
        (pathLower.includes('usb') && !pathLower.includes('/dev/ttys'));
      
      // Проверяем по friendly name или manufacturer
      const isArduinoLike = 
        friendlyLower.includes('arduino') ||
        manufacturerLower.includes('arduino') ||
        manufacturerLower.includes('ftdi') ||
        manufacturerLower.includes('ch340') ||
        manufacturerLower.includes('cp210');
      
      return isUsbSerialPort || isArduinoLike;
    });
    
    // Если нашли порты по названию, возвращаем их
    if (arduinoPortsByName.length > 0) {
      return arduinoPortsByName;
    }
    
    // Если ничего не найдено, возвращаем пустой список
    console.log('Arduino порты не найдены автоматически');
    return [];
  } catch (error) {
    console.error('Ошибка обнаружения Arduino портов:', error);
    // В случае ошибки возвращаем все порты
    try {
      return await listSerialPorts();
    } catch (listError) {
      console.error('Ошибка получения списка портов:', listError);
      return [];
    }
  }
}

/**
 * Проверить доступность порта
 */
export async function checkPortAvailability(portPath: string): Promise<boolean> {
  try {
    const ports = await listSerialPorts();
    return ports.some(port => port.path === portPath);
  } catch (error) {
    console.error('Ошибка проверки доступности порта:', error);
    return false;
  }
}


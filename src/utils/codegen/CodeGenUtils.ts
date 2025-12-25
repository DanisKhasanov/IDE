import type { SelectedPinFunction } from "@/types/boardConfig";
import { getPortFromPin, getBitFromPin } from "../arduino/PinUtils";
import boardJson from "@config/atmega328p/board.json";
import codegenJson from "@config/atmega328p/codegen.json";

/**
 * Интерфейс для информации о пине
 */
interface PinInfo {
  name: string;
  ddr: string;
  port: string;
  pin: string;
  bit: number;
}

/**
 * Интерфейс для результата генерации кода
 */
export interface GeneratedCode {
  header: string;
  implementation: string;
  includes: string[];
}

/**
 * Получает информацию о пине из конфигурации платы
 */
function getPinInfo(pinName: string): PinInfo {
  const portPrefix = getPortFromPin(pinName); // "PB", "PC", "PD"
  const portLetter = portPrefix.substring(1); // "B", "C", "D"
  const bit = getBitFromPin(pinName); // 0-7

  // Находим порт в конфигурации
  const portConfig = boardJson.ports.find((p) => p.id === portLetter);
  if (!portConfig) {
    throw new Error(`Порт ${portLetter} не найден в конфигурации`);
  }

  return {
    name: pinName,
    ddr: portConfig.registers.ddr,
    port: portConfig.registers.port,
    pin: portConfig.registers.pin,
    bit,
  };
}

/**
 * Заменяет плейсхолдеры в шаблоне на реальные значения
 */
function replacePlaceholders(
  template: string,
  context: Record<string, any>
): string {
  let result = template;

  // Заменяем простые плейсхолдеры {{key}}
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const keys = path.split(".");
    let value = context;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return match; // Возвращаем оригинал, если путь не найден
      }
      value = value[key];
    }

    return value !== null && value !== undefined ? String(value) : match;
  });

  return result;
}

/**
 * Преобразует prescaler в биты для регистров
 */
function getPrescalerBits(prescaler: number): number {
  const prescalerMap: Record<number, number> = {
    1: 0b001,
    8: 0b010,
    64: 0b011,
    256: 0b100,
    1024: 0b101,
  };
  return prescalerMap[prescaler] ?? 0b011; // По умолчанию 64
}

/**
 * Преобразует prescaler ADC в биты
 */
function getADCPrescalerBits(prescaler: number): number {
  const prescalerMap: Record<number, number> = {
    2: 0b001,
    4: 0b010,
    8: 0b011,
    16: 0b100,
    32: 0b101,
    64: 0b110,
    128: 0b111,
  };
  return prescalerMap[prescaler] ?? 0b111; // По умолчанию 128
}

/**
 * Преобразует режим UART в биты паритета
 */
function getParityBits(parity: string): number {
  const parityMap: Record<string, number> = {
    NONE: 0b00,
    EVEN: 0b10,
    ODD: 0b11,
  };
  return parityMap[parity?.toUpperCase()] ?? 0b00;
}

/**
 * Преобразует dataBits в биты регистра
 */
function getDataBits(dataBits: number): number {
  if (dataBits === 5) return 0b000;
  if (dataBits === 6) return 0b001;
  if (dataBits === 7) return 0b010;
  if (dataBits === 8) return 0b011;
  if (dataBits === 9) return 0b111;
  return 0b011; // По умолчанию 8 бит
}

/**
 * Преобразует stopBits в биты регистра
 */
function getStopBits(stopBits: number): number {
  return stopBits === 2 ? 0b1 : 0b0;
}

/**
 * Преобразует timeout watchdog в биты
 */
function getWatchdogTimeoutBits(timeout: number): number {
  // timeout в миллисекундах
  const timeoutMap: Record<number, number> = {
    16: 0b000,
    32: 0b001,
    64: 0b010,
    125: 0b011,
    250: 0b100,
    500: 0b101,
    1000: 0b110,
    2000: 0b111,
  };
  return timeoutMap[timeout] ?? 0b110; // По умолчанию 1 секунда
}

/**
 * Преобразует trigger внешнего прерывания в биты
 */
function getTriggerBits(trigger: string): number {
  const triggerMap: Record<string, number> = {
    LOW: 0b00,
    CHANGE: 0b01,
    FALLING: 0b10,
    RISING: 0b11,
  };
  return triggerMap[trigger?.toUpperCase()] ?? 0b10; // По умолчанию FALLING
}

/**
 * Получает номер канала таймера из имени пина и типа функции
 */
function getTimerChannel(pinName: string, functionType: string): string {
  // Для TIMER0: PD6 -> A, PD5 -> B
  if (functionType.includes("TIMER0")) {
    if (pinName === "PD6") return "A";
    if (pinName === "PD5") return "B";
  }
  // Для TIMER1: PB1 -> A, PB2 -> B
  if (functionType.includes("TIMER1")) {
    if (pinName === "PB1") return "A";
    if (pinName === "PB2") return "B";
  }
  // Для TIMER2: PB3 -> A, PD3 -> B
  if (functionType.includes("TIMER2")) {
    if (pinName === "PB3") return "A";
    if (pinName === "PD3") return "B";
  }
  return "A"; // По умолчанию
}

/**
 * Получает номер группы PCINT из имени пина
 */
function getPCINTGroup(pinName: string): number {
  const portPrefix = getPortFromPin(pinName);
  if (portPrefix === "PB") return 0;
  if (portPrefix === "PC") return 1;
  if (portPrefix === "PD") return 2;
  return 0;
}

/**
 * Получает номер PCINT из имени пина
 */
function getPCINTNumber(pinName: string): number {
  const portPrefix = getPortFromPin(pinName);
  const bit = getBitFromPin(pinName);

  if (portPrefix === "PB") return bit; // PCINT0-5
  if (portPrefix === "PC") return bit + 8; // PCINT8-13
  if (portPrefix === "PD") return bit + 16; // PCINT16-23
  return 0;
}

/**
 * Универсальная функция для преобразования значения настройки в ключ шаблона
 */
function resolveTemplateKey(
  peripheryConfig: any,
  settingValue: string,
  settings: Record<string, any>
): string {
  if (!settingValue) {
    return "";
  }

  const modeMapping = peripheryConfig?.modeMapping;

  // Если маппинга нет, используем значение как есть (в нижнем регистре с подчеркиваниями)
  if (!modeMapping) {
    return settingValue.toLowerCase().replace(/\s+/g, "_");
  }

  const mapping = modeMapping[settingValue];

  // Если маппинга нет для этого значения, используем значение как есть
  if (!mapping) {
    return settingValue.toLowerCase().replace(/\s+/g, "_");
  }

  // Если маппинг - строка, просто возвращаем её
  if (typeof mapping === "string") {
    return mapping;
  }

  // Если маппинг - объект с keyBuilder
  if (typeof mapping === "object" && mapping.keyBuilder) {
    let key = mapping.keyBuilder;
    const defaults = mapping.defaults || {};

    // Заменяем плейсхолдеры в keyBuilder значениями из settings
    Object.keys(defaults).forEach((param) => {
      const value = settings[param] || defaults[param];
      key = key.replace(`{{${param}}}`, String(value).toUpperCase());
    });

    return key;
  }

  // Fallback: используем значение как есть
  return settingValue.toLowerCase().replace(/\s+/g, "_");
}

/**
 * Универсальная функция для поиска шаблонов с поддержкой вложенной структуры
 */
function findTemplates(
  modesConfig: any,
  mode: string,
  settings: Record<string, any>
): string[] | null {
  if (!modesConfig || !mode) {
    return null;
  }

  const modeConfig = modesConfig[mode];

  // Если modeConfig - массив, это простой режим (например, INPUT, INPUT_PULLUP)
  if (Array.isArray(modeConfig)) {
    return modeConfig;
  }

  // Если modeConfig - объект, это вложенная структура (например, OUTPUT с LOW/HIGH)
  if (typeof modeConfig === "object" && modeConfig !== null) {
    // Приоритет поиска:
    // 1. initialState (для GPIO OUTPUT)
    // 2. state (альтернативное имя)
    // 3. Любое значение из settings, которое совпадает с ключом

    if (settings.initialState && modeConfig[settings.initialState]) {
      return modeConfig[settings.initialState];
    }

    if (settings.state && modeConfig[settings.state]) {
      return modeConfig[settings.state];
    }

    // Пробуем найти по любому значению из settings
    for (const value of Object.values(settings)) {
      if (typeof value === "string" && modeConfig[value]) {
        return modeConfig[value];
      }
    }

    // Если ничего не найдено, возвращаем null
    return null;
  }

  return null;
}

/**
 * Генерирует код для GPIO
 */
function generateGPIO(
  pinName: string,
  settings: Record<string, any>
): string[] {
  const pinInfo = getPinInfo(pinName);
  const mode = settings.mode;

  const peripheryConfig = codegenJson.gpio as any;
  const templates = findTemplates(peripheryConfig?.modes, mode, settings);

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context = {
    pin: pinInfo,
  };

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует код для UART
 */
function generateUART(settings: Record<string, any>, fCpu: number): string[] {
  const mode = settings.mode || "Asynchronous";
  const baud = settings.baud || 9600;
  const peripheryConfig = codegenJson.uart as any;
  const templateKey = resolveTemplateKey(peripheryConfig, mode, settings);
  const templates = peripheryConfig?.init?.[templateKey];

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context = {
    baud,
    parityBits: getParityBits(settings.parity || "NONE"),
    stopBits: getStopBits(settings.stopBits || 1),
    dataBits: getDataBits(settings.dataBits || 8),
  };

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует код для SPI
 */
function generateSPI(settings: Record<string, any>): string[] {
  const mode = settings.mode || "master";
  const templates = (codegenJson.spi as any)?.init?.[mode];

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  // Получаем пины SPI из настроек или используем стандартные
  const ssPin = getPinInfo(settings.ssPin || "PB2");
  const mosiPin = getPinInfo(settings.mosiPin || "PB3");
  const misoPin = getPinInfo(settings.misoPin || "PB4");
  const sckPin = getPinInfo(settings.sckPin || "PB5");

  const context = {
    ssPin,
    mosiPin,
    misoPin,
    sckPin,
    cpol: settings.cpol || 0,
    cpha: settings.cpha || 0,
    speedBits: getPrescalerBits(settings.speed || 64),
  };

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует код для I2C
 */
function generateI2C(settings: Record<string, any>, fCpu: number): string[] {
  const mode = settings.mode || "master";
  const templates = (codegenJson.i2c as any)?.init?.[mode];

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context = {
    speed: settings.speed || 100000,
    slaveAddress: settings.slaveAddress || 0x08,
  };

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует код для таймера
 */
function generateTimer(
  timerName: string,
  pinName: string | null,
  settings: Record<string, any>
): string[] {
  const mode = settings.mode || "Normal";
  const peripheryConfig = (codegenJson as any)[timerName.toLowerCase()];
  const templateMode = resolveTemplateKey(peripheryConfig, mode, settings);
  const templates = peripheryConfig?.init?.[templateMode];

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context: Record<string, any> = {
    prescalerBits: getPrescalerBits(settings.prescaler || 64),
    compareValue: settings.compareValue || 0,
    dutyCycle: settings.dutyCycle || 128,
  };

  // Если есть пин, добавляем информацию о нём
  if (pinName) {
    const pinInfo = getPinInfo(pinName);
    context.pin = pinInfo;
    context.channel = getTimerChannel(pinName, timerName);
  }

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует код для ADC
 */
function generateADC(settings: Record<string, any>): string[] {
  const mode = settings.mode || "Single";
  const peripheryConfig = codegenJson.adc as any;
  const templateKey = resolveTemplateKey(peripheryConfig, mode, settings);
  const templates = peripheryConfig?.init?.[templateKey];

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context = {
    referenceBits: settings.reference === "INTERNAL" ? 0b11 : 0b01, // По умолчанию AVCC
    prescalerBits: getADCPrescalerBits(settings.prescaler || 128),
    channels: settings.channels || [0],
  };

  // Для шаблонов с циклами по каналам
  let result: string[] = [];
  templates.forEach((template: string) => {
    if (template.includes("{{#channels}}")) {
      // Простая обработка циклов
      const beforeLoop = template.split("{{#channels}}")[0];
      const loopContent =
        template.split("{{#channels}}")[1]?.split("{{/channels}}")[0] || "";
      const afterLoop = template.split("{{/channels}}")[1] || "";

      result.push(beforeLoop);
      context.channels.forEach((channel: number) => {
        const channelContext = { ...context, channel };
        result.push(replacePlaceholders(loopContent, channelContext));
      });
      result.push(afterLoop);
    } else {
      result.push(replacePlaceholders(template, context));
    }
  });

  return result;
}

/**
 * Генерирует код для внешнего прерывания
 */
function generateExternalInterrupt(
  pinName: string,
  settings: Record<string, any>
): string[] {
  // INT0 на PD2, INT1 на PD3
  const interruptName = pinName === "PD2" ? "INT0" : "INT1";
  const templates = (codegenJson.external_interrupt as any)?.init?.[
    interruptName
  ];

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context = {
    triggerBits: getTriggerBits(settings.trigger || "FALLING"),
  };

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует код для PCINT
 */
function generatePCINT(
  pinName: string,
  settings: Record<string, any>
): string[] {
  const group = getPCINTGroup(pinName);
  const number = getPCINTNumber(pinName);
  const pinInfo = getPinInfo(pinName);

  const templates = (codegenJson.pcint as any)?.init;

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context = {
    pin: pinInfo,
    group,
    number,
  };

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует код для Watchdog
 */
function generateWatchdog(settings: Record<string, any>): string[] {
  const templates = (codegenJson.watchdog as any)?.init;

  if (!templates || !Array.isArray(templates)) {
    return [];
  }

  const context = {
    timeoutBits: getWatchdogTimeoutBits(settings.timeout || 1000),
  };

  return templates.map((template: string) =>
    replacePlaceholders(template, context)
  );
}

/**
 * Генерирует ISR функции
 */
function generateISR(
  functionType: string,
  pinName: string | null,
  settings: Record<string, any>
): string[] {
  const isrConfig = (codegenJson as any)[functionType.toLowerCase()]?.isr;

  if (!isrConfig) {
    return [];
  }

  // Определяем тип ISR
  let isrType: string | null = null;

  if (functionType.includes("TIMER0")) {
    if (settings.interruptType === "OVF" || settings.enableOVF) {
      isrType = "ovf";
    } else if (settings.interruptType === "COMPA" || settings.enableCOMPA) {
      isrType = "compa";
    } else if (settings.interruptType === "COMPB" || settings.enableCOMPB) {
      isrType = "compb";
    }
  } else if (functionType.includes("TIMER1")) {
    if (settings.interruptType === "OVF" || settings.enableOVF) {
      isrType = "ovf";
    } else if (settings.interruptType === "COMPA" || settings.enableCOMPA) {
      isrType = "compa";
    } else if (settings.interruptType === "COMPB" || settings.enableCOMPB) {
      isrType = "compb";
    } else if (settings.interruptType === "CAPT" || settings.enableCAPT) {
      isrType = "capt";
    }
  } else if (functionType.includes("TIMER2")) {
    if (settings.interruptType === "OVF" || settings.enableOVF) {
      isrType = "ovf";
    } else if (settings.interruptType === "COMPA" || settings.enableCOMPA) {
      isrType = "compa";
    } else if (settings.interruptType === "COMPB" || settings.enableCOMPB) {
      isrType = "compb";
    }
  } else if (functionType === "UART" || functionType === "USART") {
    if (settings.enableRXInterrupt) {
      isrType = "RX";
    } else if (settings.enableTXInterrupt) {
      isrType = "TX";
    } else if (settings.enableUDREInterrupt) {
      isrType = "UDRE";
    }
  } else if (functionType === "SPI") {
    if (settings.enableInterrupt) {
      return isrConfig || [];
    }
  } else if (functionType === "I2C" || functionType === "TWI") {
    if (settings.enableInterrupt) {
      return isrConfig || [];
    }
  } else if (functionType === "ADC") {
    if (settings.enableInterrupt) {
      return isrConfig || [];
    }
  } else if (functionType === "EXTERNAL_INTERRUPT") {
    const interruptName = pinName === "PD2" ? "INT0" : "INT1";
    return isrConfig?.[interruptName] || [];
  } else if (functionType === "PCINT") {
    const group = pinName ? getPCINTGroup(pinName) : 0;
    const isrName = `PCINT${group}`;
    const isrTemplates = isrConfig?.[isrName];
    if (isrTemplates && pinName) {
      const pinInfo = getPinInfo(pinName);
      return isrTemplates.map((template: string) =>
        replacePlaceholders(template, { pin: pinInfo })
      );
    }
  } else if (functionType === "ANALOG_COMPARATOR") {
    if (settings.enableInterrupt) {
      return isrConfig || [];
    }
  }

  if (!isrType || !isrConfig[isrType]) {
    return [];
  }

  return isrConfig[isrType] || [];
}

/**
 * Главная функция генерации кода
 */
export function generateInitCode(
  selectedPinFunctions: Record<string, SelectedPinFunction[]>,
  systemPeripherals: Record<string, SelectedPinFunction>,
  fCpu: number
): GeneratedCode {
  const initCode: string[] = [];
  const isrCode: string[] = [];
  const includes = new Set<string>(["<Arduino.h>"]);

  // Собираем все PCINT пины для группировки
  const pcintPins: Array<{ pinName: string; settings: Record<string, any>; gpioMode?: string }> =
    [];
  const pcintGroups: Record<
    string,
    Array<{ pinName: string; pinInfo: PinInfo; pcintNumber: number; gpioMode?: string }>
  > = {};

  // Обрабатываем функции пинов
  for (const [pinName, functions] of Object.entries(selectedPinFunctions)) {
    for (const func of functions) {
      const { functionType, settings } = func;

      switch (functionType) {
        case "GPIO":
          initCode.push(...generateGPIO(pinName, settings));
          if (settings.enablePCINT) {
            // Собираем информацию о PCINT пинах для последующей группировки
            // Сохраняем режим GPIO, чтобы не дублировать настройку пина
            pcintPins.push({ pinName, settings, gpioMode: settings.mode });
          }
          break;

        case "UART":
        case "USART":
          initCode.push(...generateUART(settings, fCpu));
          const uartISR = generateISR("UART", null, settings);
          if (uartISR.length > 0) {
            isrCode.push(...uartISR);
            includes.add("<avr/interrupt.h>");
          }
          break;

        case "SPI":
          initCode.push(...generateSPI(settings));
          if (settings.enableInterrupt) {
            initCode.push(
              ...((codegenJson.spi as any)?.interrupt || []).map(
                (line: string) => replacePlaceholders(line, {})
              )
            );
            const spiISR = generateISR("SPI", null, settings);
            if (spiISR.length > 0) {
              isrCode.push(...spiISR);
              includes.add("<avr/interrupt.h>");
            }
          }
          break;

        case "I2C":
        case "TWI":
          initCode.push(...generateI2C(settings, fCpu));
          if (settings.enableInterrupt) {
            initCode.push(
              ...((codegenJson.i2c as any)?.interrupt || []).map(
                (line: string) => replacePlaceholders(line, {})
              )
            );
            const i2cISR = generateISR("I2C", null, settings);
            if (i2cISR.length > 0) {
              isrCode.push(...i2cISR);
              includes.add("<avr/interrupt.h>");
            }
          }
          break;

        case "TIMER0_PWM":
          initCode.push(...generateTimer("timer0", pinName, settings));
          const timer0ISR = generateISR("TIMER0", pinName, settings);
          if (timer0ISR.length > 0) {
            isrCode.push(...timer0ISR);
            includes.add("<avr/interrupt.h>");
          }
          break;

        case "TIMER1_PWM":
          initCode.push(...generateTimer("timer1", pinName, settings));
          const timer1ISR = generateISR("TIMER1", pinName, settings);
          if (timer1ISR.length > 0) {
            isrCode.push(...timer1ISR);
            includes.add("<avr/interrupt.h>");
          }
          break;

        case "TIMER2_PWM":
          initCode.push(...generateTimer("timer2", pinName, settings));
          const timer2ISR = generateISR("TIMER2", pinName, settings);
          if (timer2ISR.length > 0) {
            isrCode.push(...timer2ISR);
            includes.add("<avr/interrupt.h>");
          }
          break;

        case "ADC":
          initCode.push(...generateADC(settings));
          if (settings.enableInterrupt) {
            initCode.push(
              ...((codegenJson.adc as any)?.interrupt || []).map(
                (line: string) => replacePlaceholders(line, {})
              )
            );
            const adcISR = generateISR("ADC", null, settings);
            if (adcISR.length > 0) {
              isrCode.push(...adcISR);
              includes.add("<avr/interrupt.h>");
            }
          }
          break;

        case "EXTERNAL_INTERRUPT":
          initCode.push(...generateExternalInterrupt(pinName, settings));
          const extISR = generateISR("EXTERNAL_INTERRUPT", pinName, settings);
          if (extISR.length > 0) {
            isrCode.push(...extISR);
            includes.add("<avr/interrupt.h>");
          }
          break;
      }
    }
  }

  // Группируем PCINT пины по портам и генерируем код
  if (pcintPins.length > 0) {
    // Группируем по портам
    pcintPins.forEach(({ pinName, settings, gpioMode }) => {
      const pinInfo = getPinInfo(pinName);
      const pcintNumber = getPCINTNumber(pinName);
      const group = getPCINTGroup(pinName);
      const groupName = `PCINT${group}`;

      if (!pcintGroups[groupName]) {
        pcintGroups[groupName] = [];
      }

      // Проверяем, нет ли уже этого пина в группе
      if (!pcintGroups[groupName].some((p) => p.pinName === pinName)) {
        pcintGroups[groupName].push({ pinName, pinInfo, pcintNumber, gpioMode });
      }
    });

    // Генерируем инициализацию для каждой группы
    Object.entries(pcintGroups).forEach(([groupName, pins]) => {
      const group = parseInt(groupName.replace("PCINT", ""));
      const portLetter = group === 0 ? "B" : group === 1 ? "C" : "D";
      const pcieBit = group === 0 ? "PCIE0" : group === 1 ? "PCIE1" : "PCIE2";

      // Генерируем настройку пинов только если они не были настроены как GPIO INPUT_PULLUP
      // Для пинов, настроенных как GPIO INPUT, нужно только включить подтяжку
      pins.forEach(({ pinInfo, gpioMode }) => {
        if (gpioMode === "INPUT_PULLUP") {
          // Пин уже настроен как INPUT с подтяжкой, ничего не делаем
          return;
        } else if (gpioMode === "INPUT") {
          // Пин настроен как INPUT без подтяжки, нужно только включить подтяжку
          initCode.push(
            `${pinInfo.port} |= (1 << ${pinInfo.bit}); // Включить подтяжку на ${pinInfo.name} для PCINT`
          );
        } else {
          // Пин настроен как OUTPUT или не настроен, настраиваем полностью
          const pinSetupTemplates = (codegenJson.pcint as any)?.pinSetup
            ?.inputPullup;
          if (pinSetupTemplates && Array.isArray(pinSetupTemplates)) {
            pinSetupTemplates.forEach((template: string) => {
              initCode.push(replacePlaceholders(template, { pin: pinInfo }));
            });
          }
        }
      });

      // Включаем прерывание для группы (только один раз на группу)
      initCode.push(
        `PCICR |= (1 << ${pcieBit}); // Включить Pin Change Interrupt для PORT${portLetter}`
      );

      // Настраиваем маску для всех пинов группы
      const pcintMask = pins
        .map(({ pcintNumber }) => `(1 << PCINT${pcintNumber})`)
        .join(" | ");
      initCode.push(
        `PCMSK${group} |= ${pcintMask}; // Включить PCINT для выбранных пинов PORT${portLetter}`
      );
    });

    // Генерируем ISR для каждой группы
    Object.entries(pcintGroups).forEach(([groupName, pins]) => {
      const group = parseInt(groupName.replace("PCINT", ""));
      const portLetter = group === 0 ? "B" : group === 1 ? "C" : "D";

      const isrCodeLines: string[] = [`ISR(${groupName}_vect) {`];
      isrCodeLines.push(`    // Обработчик изменения пинов PORT${portLetter}`);
      isrCodeLines.push(
        `    uint8_t pin_state = PIN${portLetter}; // Текущее состояние порта`
      );
      isrCodeLines.push("");

      pins.forEach(({ pinName, pinInfo, pcintNumber }, index) => {
        isrCodeLines.push(
          `    // Проверка изменения ${pinName} - PCINT${pcintNumber}`
        );
        isrCodeLines.push(
          `    if (pin_state & (1 << PIN${portLetter}${pinInfo.bit})) {`
        );
        isrCodeLines.push(`        // ${pinName} стал HIGH`);
        isrCodeLines.push(`    } else {`);
        isrCodeLines.push(`        // ${pinName} стал LOW`);
        isrCodeLines.push(`    }`);
        if (index < pins.length - 1) {
          isrCodeLines.push("");
        }
      });

      isrCodeLines.push("}");
      isrCode.push(isrCodeLines.join("\n"));
      includes.add("<avr/interrupt.h>");
    });
  }

  // Обрабатываем системные периферии
  for (const [peripheralName, peripheral] of Object.entries(
    systemPeripherals
  )) {
    const { functionType, settings } = peripheral;

    switch (functionType) {
      case "TIMER0":
        initCode.push(...generateTimer("timer0", null, settings));
        const timer0ISR = generateISR("TIMER0", null, settings);
        if (timer0ISR.length > 0) {
          isrCode.push(...timer0ISR);
          includes.add("<avr/interrupt.h>");
        }
        break;

      case "TIMER1":
        initCode.push(...generateTimer("timer1", null, settings));
        const timer1ISR = generateISR("TIMER1", null, settings);
        if (timer1ISR.length > 0) {
          isrCode.push(...timer1ISR);
          includes.add("<avr/interrupt.h>");
        }
        break;

      case "TIMER2":
        initCode.push(...generateTimer("timer2", null, settings));
        const timer2ISR = generateISR("TIMER2", null, settings);
        if (timer2ISR.length > 0) {
          isrCode.push(...timer2ISR);
          includes.add("<avr/interrupt.h>");
        }
        break;

      case "WATCHDOG":
        initCode.push(...generateWatchdog(settings));
        break;

      case "ADC":
        initCode.push(...generateADC(settings));
        if (settings.enableInterrupt) {
          initCode.push(
            ...((codegenJson.adc as any)?.interrupt || []).map((line: string) =>
              replacePlaceholders(line, {})
            )
          );
          const adcISR = generateISR("ADC", null, settings);
          if (adcISR.length > 0) {
            isrCode.push(...adcISR);
            includes.add("<avr/interrupt.h>");
          }
        }
        break;
    }
  }

  // Формируем заголовочный файл
  const headerCode = `#ifndef PINS_INIT_H
#define PINS_INIT_H

${Array.from(includes)
  .map((inc) => `#include ${inc}`)
  .join("\n")}

void pins_init_all(void);

#endif // PINS_INIT_H
`;

  // Формируем файл реализации
  const implementationCode = `${Array.from(includes)
    .map((inc) => `#include ${inc}`)
    .join("\n")}
#include "pins_init.h"

void pins_init_all(void) {
${initCode.map((line) => `    ${line}`).join("\n")}
${isrCode.length > 0 ? "\n    sei(); // Enable global interrupts" : ""}
}

${isrCode.length > 0 ? "\n" + isrCode.join("\n\n") : ""}
`;

  return {
    header: headerCode,
    implementation: implementationCode,
    includes: Array.from(includes),
  };
}

import type { BoardConfig, PinConfig, PeripheralConfig } from "@/types/boardConfig";
import boardJson from "@config/atmega328p/board.json";
import pinsJson from "@config/atmega328p/pins.json";
import peripheriesJson from "@config/atmega328p/peripheries.json";
import constraintsJson from "@config/atmega328p/constraints.json";

/**
 * Загружает конфигурацию платы из нового формата (папка с несколькими JSON файлами)
 */
export function loadBoardConfig(): BoardConfig {
  // Преобразуем pins.json в формат PinConfig[]
  const pins: PinConfig[] = pinsJson.map((pinData: any) => {
    // Добавляем вычисляемые поля для обратной совместимости
    const pin: PinConfig = {
      ...pinData,
      pin: pinData.id, // Для обратной совместимости
    };
    return pin;
  });

  // Преобразуем peripheries.json в формат Record<string, PeripheralConfig>
  const peripherals: Record<string, PeripheralConfig> = {};
  
  Object.entries(peripheriesJson).forEach(([key, peripheralData]: [string, any]) => {
    const peripheral: PeripheralConfig = {
      available: true,
    };

    // Преобразуем config в формат PeripheralConfig
    if (peripheralData.config) {
      Object.entries(peripheralData.config).forEach(([configKey, configValue]: [string, any]) => {
        if (configValue && typeof configValue === 'object' && 'values' in configValue) {
          // Преобразуем структуру {name, values} в массив значений
          const propertyName = configKey as keyof PeripheralConfig;
          (peripheral as any)[propertyName] = configValue.values;
        }
      });
    }

    // Добавляем специальные поля
    if (peripheralData.enableInterrupt !== undefined) {
      peripheral.enableInterrupt = peripheralData.enableInterrupt;
    }

    // Добавляем pinMapping если нужно
    if (peripheralData.pinMapping) {
      const allPins: string[] = [];
      Object.values(peripheralData.pinMapping).forEach((pinArray: any) => {
        if (Array.isArray(pinArray)) {
          allPins.push(...pinArray);
        }
      });
      peripheral.pins = allPins;
      // Сохраняем структурированное pinMapping
      peripheral.pinMapping = peripheralData.pinMapping;
    }

    // Добавляем название периферии
    if (peripheralData.name) {
      peripheral.name = peripheralData.name;
    }

    peripherals[key] = peripheral;
  });

  // Преобразуем constraints.json в формат ConflictRule[]
  const conflicts = constraintsJson.map((constraint: any) => ({
    description: constraint.description,
    when: constraint.when?.periphery || constraint.when?.mode || "",
    conflictsWith: constraint.conflicts?.[0]?.type === "reservePins" 
      ? constraint.conflicts[0].pins 
      : [],
    pins: constraint.conflicts?.[0]?.pins || [],
  }));

  // Создаем BoardConfig
  const boardConfig: BoardConfig = {
    id: boardJson.main.id,
    name: boardJson.main.name,
    frequency: boardJson.main.frequency.toString(),
    image: boardJson.image,
    pins,
    peripherals,
    conflicts,
  };

  return boardConfig;
}


import type { PinConfig, ConflictRule } from "@/types/boardConfig";
import atmega328Config from "@config/test/atmega328.json";

// Типы для исходной JSON структуры
export type FieldUIConfig = {
  component?: "Select" | "TextField" | "Checkbox";
  valueType?: "string" | "number" | "boolean";
  inputProps?: {
    min?: number;
    max?: number;
    step?: number;
  };
  helperText?: string;
};

export type FieldConfig = {
  name: string;
  type?: "select" | "number" | "boolean";
  values?: any[];
  defaultValue?: any;
  appliesTo?: Record<string, any>;
  ui?: FieldUIConfig;
  metadata?: Record<string, any>;
};

export type PeripheryConfig = {
  id: string;
  kind: "pin" | "global";
  pinMapping?: Record<string, string[]>;
  ui: {
    name: string;
    requiresAllPins?: boolean;
    alerts?: Array<{
      severity?: "info" | "warning" | "error";
      message: string;
      showWhen?: "always" | string;
    }>;
    config?: Record<string, FieldConfig>;
    interrupts?: Record<
      string,
      {
        name: string;
        description: string;
        defaultEnabled?: boolean;
        appliesTo?: Record<string, any>;
      }
    >;
    conflicts?: Array<{
      pins: string[];
      peripherals: string[];
      message: string;
    }>;
  };
  codeGenerator?: any;
};

export type PeripheriesJson = Record<string, PeripheryConfig>;

// Хелперы для доступа к данным из JSON
export const getBoardInfo = () => {
  const config = atmega328Config as any;
  const meta = config.meta || {};
  // Используем путь по умолчанию для изображения
  const imagePath = config.image || "/src/config/atmega328p/image.png";

  // Получаем список доступных частот или используем только defaultFcpu
  const fcpuOptions = meta.fcpuOptions;
  const defaultFcpu = meta.defaultFcpu;

  return {
    id: meta.board,
    name: meta.board,
    frequency: defaultFcpu.toString(),
    fcpuOptions: fcpuOptions.map((f: number) => f.toString()),
    image: imagePath,
  };
};

export const getPins = (): PinConfig[] => {
  const config = atmega328Config as any;
  const uiPins = config.UI_PIN || [];
  return uiPins.map((pinData: any) => ({
    ...pinData,
    pin: pinData.id, // Для обратной совместимости
  }));
};

export const getPeriphery = (name: string): PeripheryConfig | undefined => {
  // В новом формате периферии находятся в корне JSON
  const config = atmega328Config as any;
  const periphery = config[name];
  if (periphery && typeof periphery === "object" && "id" in periphery) {
    return periphery as PeripheryConfig;
  }
  return undefined;
};

export const getPeripheryConfigValue = (
  peripheryName: string,
  configKey: string
): any[] => {
  const periphery = getPeriphery(peripheryName);
  const fieldConfig = periphery?.ui?.config?.[configKey] as
    | FieldConfig
    | undefined;
  return fieldConfig?.values || [];
};

/**
 * Получает UI конфигурацию для поля
 */
export const getPeripheryFieldUIConfig = (
  peripheryName: string,
  configKey: string
): FieldUIConfig | undefined => {
  const periphery = getPeriphery(peripheryName);
  const fieldConfig = periphery?.ui?.config?.[configKey] as
    | FieldConfig
    | undefined;
  return fieldConfig?.ui;
};

/**
 * Получает полную конфигурацию поля
 */
export const getPeripheryFieldConfig = (
  peripheryName: string,
  configKey: string
): FieldConfig | undefined => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.ui?.config?.[configKey] as FieldConfig | undefined;
};

/**
 * Получает метаданные периферии
 * В новом формате метаданные не используются, возвращаем undefined
 */
export const getPeripheryMetadata = (
  peripheryName: string
): Record<string, any> | undefined => {
  // В новом формате метаданные не используются
  return undefined;
};

export const getPeripheryConfigDefault = (
  peripheryName: string,
  configKey: string
): any => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.ui?.config?.[configKey]?.defaultValue;
};

export const getPeripheryConfigName = (
  peripheryName: string,
  configKey: string
): string => {
  const periphery = getPeriphery(peripheryName);
  const fieldConfig = periphery?.ui?.config?.[configKey] as
    | FieldConfig
    | undefined;
  return fieldConfig?.name || configKey;
};

/**
 * Получает информацию о appliesTo для конкретного поля конфигурации
 */
export const getPeripheryConfigAppliesTo = (
  peripheryName: string,
  configKey: string
): Record<string, any> | undefined => {
  const periphery = getPeriphery(peripheryName);
  const configValue = periphery?.ui?.config?.[configKey];
  return (configValue as any)?.appliesTo;
};

/**
 * Проверяет, должно ли поле конфигурации отображаться/использоваться
 * на основе текущих настроек и условий appliesTo
 */
export const shouldShowConfigField = (
  peripheryName: string,
  configKey: string,
  currentSettings: Record<string, any>
): boolean => {
  const appliesTo = getPeripheryConfigAppliesTo(peripheryName, configKey);
  if (!appliesTo) {
    return true; // Если нет условий, поле всегда видимо
  }

  // Проверяем все условия в appliesTo
  for (const [conditionKey, conditionValue] of Object.entries(appliesTo)) {
    const currentValue = currentSettings[conditionKey];

    // Поддержка массивов значений (например, mode: ["FastPWM", "PhaseCorrectPWM"])
    if (Array.isArray(conditionValue)) {
      if (!conditionValue.includes(currentValue)) {
        return false;
      }
    } else if (currentValue !== conditionValue) {
      return false; // Условие не выполнено
    }
  }

  return true; // Все условия выполнены
};

/**
 * Определяет поля, которые зависят от изменяемого поля через appliesTo
 * и должны быть очищены при изменении родительского поля
 */
export const getDependentFieldsToClean = (
  peripheryName: string,
  changedConfigKey: string,
  newValue: any,
  currentSettings: Record<string, any>
): string[] => {
  const periphery = getPeriphery(peripheryName);
  const config = periphery?.ui?.config;
  if (!config) return [];

  const fieldsToClean: string[] = [];

  // Проходим по всем полям конфигурации
  Object.entries(config).forEach(([configKey, configValue]) => {
    const appliesTo = (configValue as any)?.appliesTo;
    if (!appliesTo) return;

    // Проверяем, зависит ли это поле от изменяемого поля
    const dependsOnChangedField = appliesTo[changedConfigKey] !== undefined;

    if (!dependsOnChangedField) return;

    // Создаем новую настройку с измененным значением для проверки
    const newSettings = {
      ...currentSettings,
      [changedConfigKey]: newValue,
    };

    // Проверяем, выполняется ли условие appliesTo с новым значением
    const shouldStillShow = shouldShowConfigField(
      peripheryName,
      configKey,
      newSettings
    );

    // Если условие не выполняется, поле нужно очистить
    if (!shouldStillShow) {
      fieldsToClean.push(configKey);
    }
  });

  return fieldsToClean;
};

export const getPeripheryDefaultSettings = (
  peripheryName: string,
  currentSettings?: Record<string, any>
): Record<string, any> => {
  const periphery = getPeriphery(peripheryName);
  const config = periphery?.ui?.config;
  if (!config) return {};

  return Object.fromEntries(
    Object.entries(config)
      .filter(([configKey, value]) => {
        if (!value || typeof value !== "object" || !("defaultValue" in value)) {
          return false;
        }

        // Проверяем условные настройки (appliesTo)
        if (
          currentSettings &&
          !shouldShowConfigField(peripheryName, configKey, currentSettings)
        ) {
          return false; // Настройка не применяется к текущему режиму
        }

        return true;
      })
      .map(([key, value]) => [key, (value as any).defaultValue])
  );
};

export const getPeripheryInterrupts = (
  peripheryName: string
):
  | Record<
      string,
      { name: string; description: string; defaultEnabled?: boolean }
    >
  | undefined => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.ui?.interrupts;
};

export const getPeripheryPinMapping = (
  peripheryName: string
): Record<string, string[]> | undefined => {
  const periphery = getPeriphery(peripheryName);
  // В новом формате pinMapping находится в корне периферии
  return periphery?.pinMapping;
};

/**
 * Получает список правил конфликтов из конфига
 * @returns Массив объектов конфликтов с полной информацией о условиях активации
 * @note В новом формате конфликты находятся внутри каждой периферии в поле ui.conflicts
 */
export const getConflicts = (): ConflictRule[] => {
  const conflicts: ConflictRule[] = [];
  const config = atmega328Config as Record<string, any>;

  // Проходим по всем перифериям и собираем конфликты
  Object.keys(config).forEach((key) => {
    if (key === "meta" || key === "UI_PIN") return;

    const periphery = config[key] as PeripheryConfig | undefined;
    if (periphery?.ui?.conflicts) {
      periphery.ui.conflicts.forEach((conflict) => {
        conflicts.push({
          description: conflict.message || "",
          periphery: key,
          enabled: true,
          pins: conflict.pins || [],
          peripherals: conflict.peripherals || [], // Список периферий, с которыми конфликтует
          conflictType: "reservePins",
        });
      });
    }
  });

  return conflicts;
};

// Получаем все периферии с пинами (kind === "pin")
export const getPinPeripheries = (): string[] => {
  const config = atmega328Config as any;
  return Object.keys(config).filter((key) => {
    if (key === "meta" || key === "UI_PIN") return false;
    const periphery = config[key];
    return periphery?.kind === "pin";
  });
};

// Получаем все системные периферии (kind === "global")
export const getSystemPeripheries = (): string[] => {
  const config = atmega328Config as any;
  return Object.keys(config).filter((key) => {
    if (key === "meta" || key === "UI_PIN") return false;
    const periphery = config[key];
    return periphery?.kind === "global";
  });
};

// Прямой доступ к конфигу
export const getAtmega328Config = () => atmega328Config;

import type { PinConfig } from "@/types/boardConfig";
import boardJson from "@config/atmega328p/board.json";
import pinsJson from "@config/atmega328p/pins.json";
import peripheriesJson from "@config/atmega328p/peripheries.json";
import systemPeripheralsJson from "@config/atmega328p/systemPeripherals.json";
import constraintsJson from "@config/atmega328p/constraints.json";

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
  name: string;
  config?: Record<string, FieldConfig>;
  interrupts?: Record<string, { name: string; description: string; appliesTo?: Record<string, any> }>;
  pinMapping?: Record<string, string[]>;
  enableInterrupt?: boolean;
  requiresAllPins?: boolean;
  metadata?: Record<string, any>;
  ui?: {
    alerts?: Array<{
      severity?: "info" | "warning" | "error";
      message: string;
      showWhen?: "always" | string;
    }>;
  };
};

export type PeripheriesJson = Record<string, PeripheryConfig>;

// Хелперы для доступа к данным из JSON
export const getBoardInfo = () => ({
  id: boardJson.main.id,
  name: boardJson.main.name,
  frequency: boardJson.main.frequency.toString(),
  image: boardJson.image,
});

export const getPins = (): PinConfig[] => {
  return pinsJson.map((pinData: any) => ({
    ...pinData,
    pin: pinData.id, // Для обратной совместимости
  }));
};

export const getPeriphery = (name: string): PeripheryConfig | undefined => {
  // Сначала проверяем обычные периферии
  const periphery = peripheriesJson[name as keyof typeof peripheriesJson];
  if (periphery) return periphery as PeripheryConfig;
  
  // Затем проверяем системные периферии
  const systemPeriphery = systemPeripheralsJson[name as keyof typeof systemPeripheralsJson];
  return systemPeriphery as PeripheryConfig | undefined;
};

export const getPeripheryConfigValue = (
  peripheryName: string,
  configKey: string
): any[] => {
  const periphery = getPeriphery(peripheryName);
  const fieldConfig = periphery?.config?.[configKey] as FieldConfig | undefined;
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
  const fieldConfig = periphery?.config?.[configKey] as FieldConfig | undefined;
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
  return periphery?.config?.[configKey] as FieldConfig | undefined;
};

/**
 * Получает метаданные периферии
 */
export const getPeripheryMetadata = (
  peripheryName: string
): Record<string, any> | undefined => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.metadata;
};

export const getPeripheryConfigDefault = (
  peripheryName: string,
  configKey: string
): any => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.config?.[configKey]?.defaultValue;
};

export const getPeripheryConfigName = (
  peripheryName: string,
  configKey: string
): string => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.config?.[configKey]?.name || configKey;
};

// Маппинг ключей конфигурации на ключи settings
const CONFIG_KEY_MAPPING: Record<string, string> = {
  'baudRates': 'baud',
  'modes': 'mode',
  'prescalers': 'prescaler',
  'timeouts': 'timeout',
  'triggers': 'trigger',
  'speeds': 'speed',
  'slaveAddress': 'slaveAddress',
  'slaveAddressRange': 'slaveAddress', // для обратной совместимости
};

// Обратный маппинг: ключи settings -> ключи конфигурации
const REVERSE_KEY_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(CONFIG_KEY_MAPPING).map(([configKey, settingsKey]) => [settingsKey, configKey])
);

/**
 * Преобразует ключ settings в ключ конфигурации
 */
export const settingsKeyToConfigKey = (settingsKey: string): string => {
  return REVERSE_KEY_MAPPING[settingsKey] || settingsKey;
};

/**
 * Преобразует ключ конфигурации в ключ settings
 */
export const configKeyToSettingsKey = (configKey: string): string => {
  return CONFIG_KEY_MAPPING[configKey] || configKey;
};

/**
 * Получает информацию о appliesTo для конкретного поля конфигурации
 */
export const getPeripheryConfigAppliesTo = (
  peripheryName: string,
  configKey: string
): Record<string, any> | undefined => {
  const periphery = getPeriphery(peripheryName);
  const configValue = periphery?.config?.[configKey];
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
    const settingsKey = CONFIG_KEY_MAPPING[conditionKey] || conditionKey;
    const currentValue = currentSettings[settingsKey];
    
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
  if (!periphery?.config) return [];
  
  // Преобразуем config key в settings key
  const changedSettingsKey = CONFIG_KEY_MAPPING[changedConfigKey] || changedConfigKey;
  const fieldsToClean: string[] = [];
  
  // Проходим по всем полям конфигурации
  Object.entries(periphery.config).forEach(([configKey, configValue]) => {
    const appliesTo = (configValue as any)?.appliesTo;
    if (!appliesTo) return;
    
    // В appliesTo используются settings keys (например, "mode", а не "modes")
    // Проверяем, зависит ли это поле от изменяемого поля
    // Сначала проверяем по settings key, затем по config key (для обратной совместимости)
    const dependsOnChangedField = 
      appliesTo[changedSettingsKey] !== undefined || 
      appliesTo[changedConfigKey] !== undefined;
    
    if (!dependsOnChangedField) return;
    
    // Создаем новую настройку с измененным значением для проверки
    const newSettings = {
      ...currentSettings,
      [changedSettingsKey]: newValue,
    };
    
    // Проверяем, выполняется ли условие appliesTo с новым значением
    const shouldStillShow = shouldShowConfigField(peripheryName, configKey, newSettings);
    
    // Если условие не выполняется, поле нужно очистить
    if (!shouldStillShow) {
      const settingsKey = CONFIG_KEY_MAPPING[configKey] || configKey;
      fieldsToClean.push(settingsKey);
    }
  });
  
  return fieldsToClean;
};

export const getPeripheryDefaultSettings = (
  peripheryName: string,
  currentSettings?: Record<string, any>
): Record<string, any> => {
  const periphery = getPeriphery(peripheryName);
  if (!periphery?.config) return {};
  
  return Object.fromEntries(
    Object.entries(periphery.config)
      .filter(([configKey, value]) => {
        if (!value || typeof value !== 'object' || !('defaultValue' in value)) {
          return false;
        }
        
        // Проверяем условные настройки (appliesTo)
        if (currentSettings && !shouldShowConfigField(peripheryName, configKey, currentSettings)) {
          return false; // Настройка не применяется к текущему режиму
        }
        
        return true;
      })
      .map(([key, value]) => [CONFIG_KEY_MAPPING[key] || key, (value as any).defaultValue])
  );
};

export const getPeripheryInterrupts = (
  peripheryName: string
): Record<string, { name: string; description: string }> | undefined => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.interrupts;
};

export const getPeripheryPinMapping = (
  peripheryName: string
): Record<string, string[]> | undefined => {
  const periphery = getPeriphery(peripheryName);
  return periphery?.pinMapping;
};

export const getConflicts = () => {
  return constraintsJson.map((constraint: any) => ({
    description: constraint.description,
    when: constraint.when?.periphery || constraint.when?.mode || "",
    conflictsWith:
      constraint.conflicts?.[0]?.type === "reservePins"
        ? constraint.conflicts[0].pins
        : [],
    pins: constraint.conflicts?.[0]?.pins || [],
  }));
};

// Прямой доступ к JSON файлам
export { boardJson, pinsJson, peripheriesJson, systemPeripheralsJson, constraintsJson };


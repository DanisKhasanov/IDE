import { useState, useCallback, useMemo } from "react";
import type { SelectedPinFunction, BoardConfig, PinConfig } from "@/types/boardConfig";
import { getPins, getPeriphery } from "@/utils/config/boardConfigHelpers";

/**
 * Настройки пина для периферии с пинами
 */
export interface PinSettings {
  [pinName: string]: Record<string, any>;
}

/**
 * Настройки прерываний
 */
export interface InterruptSettings {
  [interruptName: string]: {
    enabled: boolean;
  };
}

/**
 * Конфигурация периферии с пинами (GPIO, SPI, UART, I2C и т.д.)
 */
export interface PinPeripheralConfig {
  pins?: PinSettings;
  interrupts?: InterruptSettings;
}

/**
 * Конфигурация системной периферии (TIMER, WATCHDOG и т.д.)
 */
export interface SystemPeripheralConfig {
  enabled?: boolean;
  [key: string]: any; // Настройки периферии
  interrupts?: InterruptSettings;
}

/**
 * Единый объект с настройками проекта
 */
export interface ProjectConfiguration {
  peripherals: Record<string, PinPeripheralConfig | SystemPeripheralConfig>;
}

/**
 * Контекст выбора: какой пин и какая периферия выбраны
 */
export interface SelectionContext {
  selectedPin: string | null;
  selectedPeripheral: string | null;
}


/**
 * Проверяет, является ли периферия периферией с пинами
 */
const isPinPeripheral = (peripheralName: string): boolean => {
  const periphery = getPeriphery(peripheralName);
  return periphery?.kind === "pin";
};

/**
 * Hook для управления единым объектом настроек проекта
 * Обеспечивает синхронизацию между пинами и системными перифериями
 */
export const useProjectConfiguration = (boardConfig: BoardConfig | null) => {
  const [configuration, setConfiguration] = useState<ProjectConfiguration>({
    peripherals: {},
  });
  
  const [selectionContext, setSelectionContext] = useState<SelectionContext>({
    selectedPin: null,
    selectedPeripheral: null,
  });

  /**
   * Получает все пины, относящиеся к определенной периферии
   */
  const getPeripheralPins = useCallback(
    (functionType: string): string[] => {
      if (!boardConfig) return [];

      return boardConfig.pins
        .filter((pin) => {
          const signals = pin.signals || [];
          return signals.some((signal) => signal.type === functionType);
        })
        .map((pin) => pin.id || pin.pin || "");
    },
    [boardConfig]
  );

  /**
   * Проверяет, использует ли хотя бы один пин данную периферию
   */
  const isPeripheralUsedInPins = useCallback(
    (functionType: string): boolean => {
      const peripheral = configuration.peripherals[functionType];
      
      if (!peripheral) return false;
      
      // Для периферий с пинами проверяем наличие пинов
      if (isPinPeripheral(functionType)) {
        const pinPeripheral = peripheral as PinPeripheralConfig;
        return pinPeripheral.pins && Object.keys(pinPeripheral.pins).length > 0;
      }
      
      // Для системных периферий проверяем наличие настроек
      return true;
    },
    [configuration.peripherals]
  );

  /**
   * Получает объединенные настройки периферии из пинов
   * (используется для отображения в SystemPeripheralsTab)
   */
  const getPeripheralSettingsFromPins = useCallback(
    (functionType: string): Record<string, unknown> | null => {
      const peripheral = configuration.peripherals[functionType];
      
      if (!peripheral) return null;
      
      // Для периферий с пинами берем настройки первого пина
      if (isPinPeripheral(functionType)) {
        const pinPeripheral = peripheral as PinPeripheralConfig;
        if (pinPeripheral.pins) {
          const firstPin = Object.values(pinPeripheral.pins)[0];
          return firstPin || null;
        }
      }
      
      // Для системных периферий возвращаем настройки напрямую
      const systemPeripheral = peripheral as SystemPeripheralConfig;
      const { interrupts, ...settings } = systemPeripheral;
      return settings;
    },
    [configuration.peripherals]
  );

  /**
   * Получает выбранные пины для периферии
   */
  const getSelectedPinsForPeripheral = useCallback(
    (functionType: string): string[] => {
      const peripheral = configuration.peripherals[functionType];
      
      if (!peripheral || !isPinPeripheral(functionType)) {
        return [];
      }
      
      const pinPeripheral = peripheral as PinPeripheralConfig;
      return pinPeripheral.pins ? Object.keys(pinPeripheral.pins) : [];
    },
    [configuration.peripherals]
  );

  /**
   * Добавляет или обновляет функцию на пине
   */
  const addOrUpdatePinFunction = useCallback(
    (pinName: string, functionType: string, settings: Record<string, unknown>) => {
      setConfiguration((prev) => {
        const newPeripherals = { ...prev.peripherals };
        
        // Получаем или создаем конфигурацию периферии
        let peripheral = newPeripherals[functionType];
        if (!peripheral) {
          peripheral = isPinPeripheral(functionType) 
            ? { pins: {}, interrupts: {} }
            : { enabled: true, interrupts: {} };
          newPeripherals[functionType] = peripheral;
        }
        
        // Для периферий с пинами обновляем настройки пина
        if (isPinPeripheral(functionType)) {
          const pinPeripheral = peripheral as PinPeripheralConfig;
          if (!pinPeripheral.pins) {
            pinPeripheral.pins = {};
          }
          pinPeripheral.pins[pinName] = { ...settings };
        } else {
          // Для системных периферий обновляем настройки напрямую
          const systemPeripheral = peripheral as SystemPeripheralConfig;
          Object.assign(systemPeripheral, settings);
        }
        
        return { peripherals: newPeripherals };
      });
    },
    []
  );

  /**
   * Удаляет функцию с пина
   */
  const removePinFunction = useCallback((pinName: string, functionType?: string) => {
    setConfiguration((prev) => {
      const newPeripherals = { ...prev.peripherals };
      
      if (functionType) {
        const peripheral = newPeripherals[functionType];
        
        if (!peripheral) return prev;
        
        // Для периферий с пинами удаляем пин
        if (isPinPeripheral(functionType)) {
          const pinPeripheral = peripheral as PinPeripheralConfig;
          if (pinPeripheral.pins) {
            delete pinPeripheral.pins[pinName];
            // Если пинов не осталось, удаляем периферию
            if (Object.keys(pinPeripheral.pins).length === 0) {
              delete newPeripherals[functionType];
            }
          }
        } else {
          // Для системных периферий удаляем всю периферию
          delete newPeripherals[functionType];
        }
      } else {
        // Удаляем все функции пина (проходим по всем перифериям)
        Object.keys(newPeripherals).forEach((peripheralName) => {
          const peripheral = newPeripherals[peripheralName];
          if (peripheral && 'pins' in peripheral && peripheral.pins) {
            delete peripheral.pins[pinName];
            // Если пинов не осталось, удаляем периферию
            if (Object.keys(peripheral.pins).length === 0) {
              delete newPeripherals[peripheralName];
            }
          }
        });
      }
      
      return { peripherals: newPeripherals };
    });
  }, []);

  /**
   * Обновляет настройки функции на всех пинах, использующих эту периферию
   * (используется когда настройки меняются в SystemPeripheralsTab)
   */
  const updatePeripheralSettingsOnAllPins = useCallback(
    (functionType: string, settings: Record<string, unknown>) => {
      setConfiguration((prev) => {
        const newPeripherals = { ...prev.peripherals };
        const peripheral = newPeripherals[functionType];
        
        if (!peripheral) return prev;
        
        // Для периферий с пинами обновляем настройки всех пинов
        if (isPinPeripheral(functionType)) {
          const pinPeripheral = peripheral as PinPeripheralConfig;
          if (pinPeripheral.pins) {
            Object.keys(pinPeripheral.pins).forEach((pinName) => {
              pinPeripheral.pins![pinName] = { ...settings };
            });
          }
        } else {
          // Для системных периферий обновляем настройки напрямую
          const systemPeripheral = peripheral as SystemPeripheralConfig;
          Object.assign(systemPeripheral, settings);
        }
        
        return { peripherals: newPeripherals };
      });
    },
    []
  );

  /**
   * Добавляет или обновляет системную периферию
   */
  const addOrUpdateSystemPeripheral = useCallback(
    (peripheralName: string, settings: Record<string, unknown>) => {
      setConfiguration((prev) => {
        const newPeripherals = { ...prev.peripherals };
        
        // Получаем или создаем конфигурацию системной периферии
        let peripheral = newPeripherals[peripheralName] as SystemPeripheralConfig;
        if (!peripheral) {
          peripheral = { enabled: true, interrupts: {} };
          newPeripherals[peripheralName] = peripheral;
        }
        
        // Обновляем настройки, сохраняя interrupts если они есть
        const { interrupts, ...otherSettings } = peripheral;
        Object.assign(peripheral, { ...otherSettings, ...settings });
        if (interrupts) {
          peripheral.interrupts = interrupts;
        }
        
        return { peripherals: newPeripherals };
      });
    },
    []
  );

  /**
   * Удаляет системную периферию
   */
  const removeSystemPeripheral = useCallback((peripheralName: string) => {
    setConfiguration((prev) => {
      const newPeripherals = { ...prev.peripherals };
      delete newPeripherals[peripheralName];

      return { peripherals: newPeripherals };
    });
  }, []);

  /**
   * Сбрасывает все настройки
   */
  const resetConfiguration = useCallback(() => {
    setConfiguration({
      peripherals: {},
    });
  }, []);

  /**
   * Получает объединенные настройки периферии из пинов
   */
  const getCombinedPeripheralSettings = useCallback(
    (functionType: string): Record<string, unknown> | null => {
      return getPeripheralSettingsFromPins(functionType);
    },
    [getPeripheralSettingsFromPins]
  );

  /**
   * Устанавливает выбранный пин
   */
  const selectPin = useCallback((pinName: string | null) => {
    setSelectionContext((prev) => ({
      ...prev,
      selectedPin: pinName,
    }));
  }, []);

  /**
   * Устанавливает выбранную периферию
   */
  const selectPeripheral = useCallback((peripheralName: string | null) => {
    setSelectionContext((prev) => ({
      ...prev,
      selectedPeripheral: peripheralName,
    }));
  }, []);

  /**
   * Устанавливает выбранный пин и периферию одновременно
   */
  const selectPinAndPeripheral = useCallback(
    (pinName: string | null, peripheralName: string | null) => {
      setSelectionContext({
        selectedPin: pinName,
        selectedPeripheral: peripheralName,
      });
    },
    []
  );

  /**
   * Получает настройки выбранного пина для указанной периферии
   */
  const getSelectedPinSettings = useCallback(
    (pinName: string | null, functionType: string | null): Record<string, unknown> | null => {
      if (!pinName || !functionType) return null;

      const peripheral = configuration.peripherals[functionType];
      
      if (!peripheral || !isPinPeripheral(functionType)) return null;
      
      const pinPeripheral = peripheral as PinPeripheralConfig;
      return pinPeripheral.pins?.[pinName] || null;
    },
    [configuration.peripherals]
  );

  /**
   * Получает настройки текущего выбранного пина
   */
  const getCurrentPinSettings = useCallback((): Record<string, unknown> | null => {
    return getSelectedPinSettings(
      selectionContext.selectedPin,
      selectionContext.selectedPeripheral
    );
  }, [selectionContext, getSelectedPinSettings]);

  /**
   * Сбрасывает все настройки и выбор
   */
  const resetAll = useCallback(() => {
    setConfiguration({
      peripherals: {},
    });
    setSelectionContext({
      selectedPin: null,
      selectedPeripheral: null,
    });
  }, []);

  /**
   * Умное добавление функции пина с автоматическим выбором связанных пинов
   * для периферий, которые используют несколько пинов (определяется через requiresAllPins в конфигурации)
   * @param pinName - имя пина
   * @param functionType - тип функции
   * @param settings - настройки функции
   * @param onWarning - опциональный callback для показа предупреждений
   * @returns true если функция была добавлена, false если была ошибка
   */
  const addPinFunctionWithAutoSelect = useCallback(
    (
      pinName: string,
      functionType: string,
      settings: Record<string, unknown>,
      onWarning?: (message: string) => void
    ): boolean => {
      const pins = getPins();
      const pin = pins.find((p: PinConfig) => (p.id || p.pin) === pinName);
      const peripheral = configuration.peripherals[functionType];
      
      // Проверяем, не выбрана ли уже эта функция на этом пине
      if (peripheral && isPinPeripheral(functionType)) {
        const pinPeripheral = peripheral as PinPeripheralConfig;
        if (pinPeripheral.pins?.[pinName]) {
          return false; // Функция уже выбрана
        }
      }

      // Проверяем, требует ли периферия объединения всех пинов
      const peripheralConfig = boardConfig?.peripherals[functionType];
      const requiresAllPins = peripheralConfig?.requiresAllPins === true;

      if (requiresAllPins) {
        // Для периферий с requiresAllPins автоматически добавляем все пины с одинаковыми настройками
        const peripheralPins = getPeripheralPins(functionType);
        
        setConfiguration((prev) => {
          const newPeripherals = { ...prev.peripherals };
          let peripheral = newPeripherals[functionType] as PinPeripheralConfig;
          
          if (!peripheral) {
            peripheral = { pins: {}, interrupts: {} };
            newPeripherals[functionType] = peripheral;
          }
          
          if (!peripheral.pins) {
            peripheral.pins = {};
          }
          
          // Добавляем все пины периферии
          peripheralPins.forEach((peripheralPinName) => {
            if (!peripheral.pins![peripheralPinName]) {
              peripheral.pins![peripheralPinName] = { ...settings };
            }
          });
          
          return { peripherals: newPeripherals };
        });
        
        // Выбираем первый пин периферии для визуального выделения
        if (peripheralPins.length > 0) {
          selectPinAndPeripheral(peripheralPins[0], functionType);
        }
        return true;
      }
      
      // Для других функций добавляем только на выбранный пин
      addOrUpdatePinFunction(pinName, functionType, settings);
      // Автоматически выбираем пин для визуального выделения
      selectPinAndPeripheral(pinName, functionType);
      return true;
    },
    [boardConfig, getPeripheralPins, selectPinAndPeripheral, configuration.peripherals, addOrUpdatePinFunction]
  );

  /**
   * Умное удаление функции пина с автоматическим удалением связанных пинов
   * для периферий, которые используют несколько пинов (определяется через requiresAllPins в конфигурации)
   * @param pinName - имя пина
   * @param functionType - тип функции (опционально, если не указан - удаляются все функции пина)
   */
  const removePinFunctionWithAutoSelect = useCallback(
    (pinName: string, functionType?: string) => {
      // Если указан тип функции, проверяем, требует ли периферия объединения всех пинов
      if (functionType) {
        const peripheralConfig = boardConfig?.peripherals[functionType];
        const requiresAllPins = peripheralConfig?.requiresAllPins === true;

        if (requiresAllPins) {
          // Для периферий с requiresAllPins удаляем все пины одновременно
          const peripheralPins = getPeripheralPins(functionType);
          
          setConfiguration((prev) => {
            const newPeripherals = { ...prev.peripherals };
            delete newPeripherals[functionType];
            return { peripherals: newPeripherals };
          });
          
          // Если удаляется выбранный пин периферии, сбрасываем выбор
          if (selectionContext.selectedPin && peripheralPins.includes(selectionContext.selectedPin) && selectionContext.selectedPeripheral === functionType) {
            selectPinAndPeripheral(null, null);
          }
          
          return;
        }
      }
      
      // Для других функций удаляем только с указанного пина
      if (functionType) {
        const peripheral = configuration.peripherals[functionType];
        
        // Если удаляется текущая выбранная функция, сбрасываем выбор
        if (selectionContext.selectedPin === pinName && selectionContext.selectedPeripheral === functionType) {
          selectPinAndPeripheral(null, null);
        }
        
        removePinFunction(pinName, functionType);
        return;
      }
      
      // Если тип не указан, удаляем все функции пина
      removePinFunction(pinName);
      
      // Если удаляется выбранный пин, сбрасываем выбор
      if (selectionContext.selectedPin === pinName) {
        selectPinAndPeripheral(null, null);
      }
    },
    [boardConfig, configuration.peripherals, selectionContext, getPeripheralPins, removePinFunction, selectPinAndPeripheral]
  );

  return {
    // Состояние
    configuration,
    setConfiguration,
    selectionContext,
    selectedPin: selectionContext.selectedPin,
    selectedPeripheral: selectionContext.selectedPeripheral,
    
    // Операции с выбором
    selectPin,
    selectPeripheral,
    selectPinAndPeripheral,
    
    // Операции с пинами
    addOrUpdatePinFunction,
    removePinFunction,
    updatePeripheralSettingsOnAllPins,
    
    // Умные операции с пинами (с автоматическим выбором/удалением связанных пинов)
    addPinFunctionWithAutoSelect,
    removePinFunctionWithAutoSelect,
    
    // Операции с системными перифериями (включая системные таймеры)
    addOrUpdateSystemPeripheral,
    removeSystemPeripheral,
    
    // Утилиты для получения данных
    getPeripheralPins,
    isPeripheralUsedInPins,
    getPeripheralSettingsFromPins,
    getSelectedPinsForPeripheral,
    getCombinedPeripheralSettings,
    getSelectedPinSettings,
    getCurrentPinSettings,
    
    // Сброс
    resetConfiguration,
    resetAll,
  };
};


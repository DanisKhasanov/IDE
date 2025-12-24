import { useState, useCallback, useMemo } from "react";
import type { SelectedPinFunction, BoardConfig, PinConfig } from "@/types/boardConfig";
import { getPins } from "@/utils/config/boardConfigHelpers";

/**
 * Единый объект с настройками проекта
 */
export interface ProjectConfiguration {
  // Настройки пинов: ключ - имя пина, значение - массив функций
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  // Таймеры: ключ - имя таймера, значение - настройки
  timers: Record<string, SelectedPinFunction>;
  // Системные периферии: ключ - имя периферии, значение - настройки
  systemPeripherals: Record<string, SelectedPinFunction>;
}

/**
 * Контекст выбора: какой пин и какая периферия выбраны
 */
export interface SelectionContext {
  selectedPin: string | null;
  selectedPeripheral: string | null;
}

/**
 * Hook для управления единым объектом настроек проекта
 * Обеспечивает синхронизацию между пинами и системными перифериями
 */
export const useProjectConfiguration = (boardConfig: BoardConfig | null) => {
  const [configuration, setConfiguration] = useState<ProjectConfiguration>({
    selectedPinFunctions: {},
    timers: {},
    systemPeripherals: {},
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
      return Object.values(configuration.selectedPinFunctions)
        .flat()
        .some((func) => func.functionType === functionType);
    },
    [configuration.selectedPinFunctions]
  );

  /**
   * Получает объединенные настройки периферии из пинов
   * (используется для отображения в SystemPeripheralsTab)
   */
  const getPeripheralSettingsFromPins = useCallback(
    (functionType: string): Record<string, unknown> | null => {
      // Ищем первую функцию с этим типом среди всех пинов
      for (const functions of Object.values(configuration.selectedPinFunctions)) {
        const func = functions.find((f) => f.functionType === functionType);
        if (func) {
          return func.settings;
        }
      }
      return null;
    },
    [configuration.selectedPinFunctions]
  );

  /**
   * Получает выбранные пины для периферии
   */
  const getSelectedPinsForPeripheral = useCallback(
    (functionType: string): string[] => {
      const result: string[] = [];
      for (const [pinName, functions] of Object.entries(configuration.selectedPinFunctions)) {
        if (functions.some((f) => f.functionType === functionType)) {
          result.push(pinName);
        }
      }
      return result;
    },
    [configuration.selectedPinFunctions]
  );

  /**
   * Добавляет или обновляет функцию на пине
   */
  const addOrUpdatePinFunction = useCallback(
    (pinName: string, functionType: string, settings: Record<string, unknown>) => {
      setConfiguration((prev) => {
        const newConfig = { ...prev };
        const existingFunctions = prev.selectedPinFunctions[pinName] || [];
        const functionIndex = existingFunctions.findIndex((f) => f.functionType === functionType);

        if (functionIndex !== -1) {
          // Обновляем существующую функцию
          const updatedFunctions = [...existingFunctions];
          updatedFunctions[functionIndex] = {
            ...updatedFunctions[functionIndex],
            settings,
          };
          newConfig.selectedPinFunctions = {
            ...prev.selectedPinFunctions,
            [pinName]: updatedFunctions,
          };
        } else {
          // Добавляем новую функцию
          newConfig.selectedPinFunctions = {
            ...prev.selectedPinFunctions,
            [pinName]: [
              ...existingFunctions,
              {
                pinName,
                functionType,
                settings,
              },
            ],
          };
        }

        return newConfig;
      });
    },
    []
  );

  /**
   * Удаляет функцию с пина
   */
  const removePinFunction = useCallback((pinName: string, functionType?: string) => {
    setConfiguration((prev) => {
      const newConfig = { ...prev };
      const existingFunctions = prev.selectedPinFunctions[pinName] || [];

      if (functionType) {
        // Удаляем конкретную функцию
        const filtered = existingFunctions.filter((f) => f.functionType !== functionType);
        if (filtered.length === 0) {
          const newPinFunctions = { ...prev.selectedPinFunctions };
          delete newPinFunctions[pinName];
          newConfig.selectedPinFunctions = newPinFunctions;
        } else {
          newConfig.selectedPinFunctions = {
            ...prev.selectedPinFunctions,
            [pinName]: filtered,
          };
        }
      } else {
        // Удаляем все функции пина
        const newPinFunctions = { ...prev.selectedPinFunctions };
        delete newPinFunctions[pinName];
        newConfig.selectedPinFunctions = newPinFunctions;
      }

      return newConfig;
    });
  }, []);

  /**
   * Обновляет настройки функции на всех пинах, использующих эту периферию
   * (используется когда настройки меняются в SystemPeripheralsTab)
   */
  const updatePeripheralSettingsOnAllPins = useCallback(
    (functionType: string, settings: Record<string, unknown>) => {
      setConfiguration((prev) => {
        const newPinFunctions = { ...prev.selectedPinFunctions };

        // Обновляем настройки на всех пинах, использующих эту периферию
        for (const [pinName, functions] of Object.entries(newPinFunctions)) {
          const functionIndex = functions.findIndex((f) => f.functionType === functionType);
          if (functionIndex !== -1) {
            const updatedFunctions = [...functions];
            updatedFunctions[functionIndex] = {
              ...updatedFunctions[functionIndex],
              settings,
            };
            newPinFunctions[pinName] = updatedFunctions;
          }
        }

        return {
          ...prev,
          selectedPinFunctions: newPinFunctions,
        };
      });
    },
    []
  );

  /**
   * Добавляет или обновляет таймер
   */
  const addOrUpdateTimer = useCallback((timerName: string, settings: Record<string, unknown>) => {
    setConfiguration((prev) => ({
      ...prev,
      timers: {
        ...prev.timers,
        [timerName]: {
          pinName: "",
          functionType: timerName,
          settings,
        },
      },
    }));
  }, []);

  /**
   * Удаляет таймер
   */
  const removeTimer = useCallback((timerName: string) => {
    setConfiguration((prev) => {
      const newTimers = { ...prev.timers };
      delete newTimers[timerName];

      return {
        ...prev,
        timers: newTimers,
      };
    });
  }, []);

  /**
   * Добавляет или обновляет системную периферию
   */
  const addOrUpdateSystemPeripheral = useCallback(
    (peripheralName: string, settings: Record<string, unknown>) => {
      setConfiguration((prev) => ({
        ...prev,
        systemPeripherals: {
          ...prev.systemPeripherals,
          [peripheralName]: {
            pinName: "",
            functionType: peripheralName,
            settings,
          },
        },
      }));
    },
    []
  );

  /**
   * Удаляет системную периферию
   */
  const removeSystemPeripheral = useCallback((peripheralName: string) => {
    setConfiguration((prev) => {
      const newSystemPeripherals = { ...prev.systemPeripherals };
      delete newSystemPeripherals[peripheralName];

      return {
        ...prev,
        systemPeripherals: newSystemPeripherals,
      };
    });
  }, []);

  /**
   * Сбрасывает все настройки
   */
  const resetConfiguration = useCallback(() => {
    setConfiguration({
      selectedPinFunctions: {},
      timers: {},
      systemPeripherals: {},
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

      const pinFunctions = configuration.selectedPinFunctions[pinName] || [];
      const func = pinFunctions.find((f) => f.functionType === functionType);
      
      return func ? func.settings : null;
    },
    [configuration.selectedPinFunctions]
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
      selectedPinFunctions: {},
      timers: {},
      systemPeripherals: {},
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
      const existingFunctions = configuration.selectedPinFunctions[pinName] || [];

      // Проверяем, не выбрана ли уже эта функция
      const alreadySelected = existingFunctions.some(
        (f) => f.functionType === functionType
      );

      if (alreadySelected) {
        // Если функция уже выбрана, ничего не делаем
        return false;
      }

      // Проверяем, требует ли периферия объединения всех пинов
      const peripheralConfig = boardConfig?.peripherals[functionType];
      const requiresAllPins = peripheralConfig?.requiresAllPins === true;

      if (requiresAllPins) {
        // Для периферий с requiresAllPins автоматически добавляем все пины с одинаковыми настройками
        const peripheralPins = getPeripheralPins(functionType);
        
        // Получаем актуальное состояние для проверки всех пинов перед добавлением
        setConfiguration((prev) => {
          const newConfig = { ...prev };
          const newPinFunctions = { ...prev.selectedPinFunctions };
          
          peripheralPins.forEach((peripheralPinName) => {
            const peripheralPin = pins.find((p: PinConfig) => (p.id || p.pin) === peripheralPinName);
            if (!peripheralPin) return;
            
            const peripheralPinFunctions = newPinFunctions[peripheralPinName] || [];
            
            // Проверяем, не выбрана ли уже эта функция на этом пине
            const functionAlreadySelected = peripheralPinFunctions.some(
              (f) => f.functionType === functionType
            );
            
            if (!functionAlreadySelected) {
              // Добавляем функцию
              const existingFuncs = newPinFunctions[peripheralPinName] || [];
              newPinFunctions[peripheralPinName] = [
                ...existingFuncs,
                {
                  pinName: peripheralPinName,
                  functionType,
                  settings,
                },
              ];
            }
          });
          
          newConfig.selectedPinFunctions = newPinFunctions;
          return newConfig;
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
    [boardConfig, getPeripheralPins, selectPinAndPeripheral, configuration.selectedPinFunctions, addOrUpdatePinFunction]
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
          
          peripheralPins.forEach((peripheralPinName) => {
            removePinFunction(peripheralPinName, functionType);
          });
          
          // Если удаляется выбранный пин периферии, сбрасываем выбор
          if (selectionContext.selectedPin && peripheralPins.includes(selectionContext.selectedPin) && selectionContext.selectedPeripheral === functionType) {
            selectPinAndPeripheral(null, null);
          }
          
          return;
        }
      }
      
      // Для других функций удаляем только с указанного пина
      const existingFunctions = configuration.selectedPinFunctions[pinName] || [];
      
      // Если указан тип функции, удаляем только её
      if (functionType) {
        const filtered = existingFunctions.filter(
          (f) => f.functionType !== functionType
        );
        
        // Если у пина не осталось функций или удаляется текущая выбранная функция, сбрасываем выбор
        if (selectionContext.selectedPin === pinName && (filtered.length === 0 || selectionContext.selectedPeripheral === functionType)) {
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
    [boardConfig, configuration.selectedPinFunctions, selectionContext, getPeripheralPins, removePinFunction, selectPinAndPeripheral]
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
    
    // Операции с таймерами
    addOrUpdateTimer,
    removeTimer,
    
    // Операции с системными перифериями
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


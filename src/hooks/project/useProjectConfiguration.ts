import { useState, useCallback, useMemo } from "react";
import type { SelectedPinFunction, BoardConfig, PinConfig } from "@/types/boardConfig";

/**
 * Единый объект с настройками проекта
 */
export interface ProjectConfiguration {
  // Настройки пинов: ключ - имя пина, значение - массив функций
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  // Таймеры: ключ - имя таймера, значение - настройки
  timers: Record<string, SelectedPinFunction>;
}

/**
 * Hook для управления единым объектом настроек проекта
 * Обеспечивает синхронизацию между пинами и системными перифериями
 */
export const useProjectConfiguration = (boardConfig: BoardConfig | null) => {
  const [configuration, setConfiguration] = useState<ProjectConfiguration>({
    selectedPinFunctions: {},
    timers: {},
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
   * Сбрасывает все настройки
   */
  const resetConfiguration = useCallback(() => {
    setConfiguration({
      selectedPinFunctions: {},
      timers: {},
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

  return {
    configuration,
    setConfiguration,
    // Операции с пинами
    addOrUpdatePinFunction,
    removePinFunction,
    updatePeripheralSettingsOnAllPins,
    // Операции с таймерами
    addOrUpdateTimer,
    removeTimer,
    // Утилиты
    getPeripheralPins,
    isPeripheralUsedInPins,
    getPeripheralSettingsFromPins,
    getSelectedPinsForPeripheral,
    getCombinedPeripheralSettings,
    resetConfiguration,
  };
};


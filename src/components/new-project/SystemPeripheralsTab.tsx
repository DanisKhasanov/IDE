import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Chip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { BoardConfig, SelectedPinFunction } from "@/types/boardConfig";
import { RenderSettings } from "@/components/common/RenderSettings";

interface SystemPeripheralsTabProps {
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  boardConfig: BoardConfig | null;
  onPeripheralSettingsUpdate: (
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  onPinFunctionAdd?: (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  getSystemPeripherals: () => string[];
}

export const SystemPeripheralsTab: React.FC<SystemPeripheralsTabProps> = ({
  selectedPinFunctions,
  boardConfig,
  onPeripheralSettingsUpdate,
  onPinFunctionAdd,
  getSystemPeripherals,
}) => {
  const [selectedSystemPeripheral, setSelectedSystemPeripheral] = useState<
    string | null
  >(null);
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>(
    {}
  );

  // Функция для получения дефолтных настроек системной периферии
  const getDefaultSystemPeripheralSettings = (
    functionType: string
  ): Record<string, unknown> => {
    if (!boardConfig) return {};
    
    const peripheralConfig = boardConfig.peripherals[functionType];
    if (!peripheralConfig) return {};
    
    // Устанавливаем значения по умолчанию из конфига
    const defaults: Record<string, unknown> = {};
    
    // Для GPIO устанавливаем defaultMode если есть
    if (functionType === "GPIO" && peripheralConfig.modes && peripheralConfig.modes.length > 0) {
      // Ищем defaultMode в config
      const gpioConfig = boardConfig.peripherals.GPIO;
      if (gpioConfig) {
        // Проверяем, есть ли defaultMode в конфиге (нужно будет добавить в peripheries.json)
        defaults.mode = "INPUT"; // По умолчанию
      }
    }
    
    return defaults;
  };

  const availablePeripherals = getSystemPeripherals();
  
  // Функция для проверки, используется ли периферия на пинах
  const isPeripheralUsedInPins = (functionType: string): boolean => {
    return Object.values(selectedPinFunctions)
      .flat()
      .some((func) => func.functionType === functionType);
  };
  
  // Функция для получения настроек из пинов
  const getPeripheralSettingsFromPins = (functionType: string): Record<string, unknown> | null => {
    for (const functions of Object.values(selectedPinFunctions)) {
      const func = functions.find((f) => f.functionType === functionType);
      if (func) {
        return func.settings;
      }
    }
    return null;
  };
  
  // Функция для получения выбранных пинов для периферии
  const getSelectedPinsForPeripheral = (functionType: string): string[] => {
    const result: string[] = [];
    for (const [pinName, functions] of Object.entries(selectedPinFunctions)) {
      if (functions.some((f) => f.functionType === functionType)) {
        result.push(pinName);
      }
    }
    return result;
  };
  
  // Получаем информацию о выбранной периферии из конфига
  const selectedPeripheralConfig = selectedSystemPeripheral
    ? boardConfig?.peripherals[selectedSystemPeripheral]
    : null;

  // Синхронизируем локальные настройки только при изменении выбранной периферии
  const currentPeripheralSettings = selectedSystemPeripheral
    ? getPeripheralSettingsFromPins(selectedSystemPeripheral)
    : null;

  // Автоматически выбираем первый элемент при открытии таба
  useEffect(() => {
    // Если уже есть выбранная периферия, ничего не делаем
    if (selectedSystemPeripheral) return;

    // Если нет доступных периферий, ничего не делаем
    if (availablePeripherals.length === 0) return;

    // Сначала ищем периферию с примененными настройками на пинах
    const peripheralWithSettings = availablePeripherals.find(
      (peripheralType) => isPeripheralUsedInPins(peripheralType)
    );

    // Выбираем периферию с настройками или первую доступную
    const peripheralToSelect =
      peripheralWithSettings || availablePeripherals[0];
    setSelectedSystemPeripheral(peripheralToSelect);
  }, [availablePeripherals, selectedSystemPeripheral]);

  useEffect(() => {
    if (selectedSystemPeripheral) {
      if (currentPeripheralSettings) {
        // Загружаем существующие настройки в локальное состояние
        setLocalSettings({ ...currentPeripheralSettings });
      } else {
        // Если периферия еще не добавлена, используем дефолтные настройки
        setLocalSettings(
          getDefaultSystemPeripheralSettings(selectedSystemPeripheral)
        );
      }
    } else {
      setLocalSettings({});
    }
  }, [selectedSystemPeripheral, currentPeripheralSettings]);

  const handlePeripheralClick = (peripheralType: string) => {
    if (selectedSystemPeripheral === peripheralType) {
      return;
    }
    setSelectedSystemPeripheral(peripheralType);
  };

  const handleApplySettings = () => {
    if (!selectedSystemPeripheral) return;

    // Очищаем настройки от пустых значений
    const cleanedSettings = { ...localSettings };
    Object.keys(cleanedSettings).forEach((key) => {
      if (
        cleanedSettings[key] === "" ||
        cleanedSettings[key] === undefined ||
        cleanedSettings[key] === null
      ) {
        delete cleanedSettings[key];
      }
    });

    // Проверяем, выбраны ли конкретные пины
    const selectedPinsData = cleanedSettings.selectedPins as Record<string, string[]> | undefined;
    const hasSelectedPins = selectedPinsData && Object.values(selectedPinsData).some(
      (pins) => Array.isArray(pins) && pins.length > 0
    );

    if (hasSelectedPins && selectedPinsData && onPinFunctionAdd) {
      // Применяем настройки к выбранным пинам
      const settingsWithoutPins = { ...cleanedSettings };
      delete settingsWithoutPins.selectedPins; // Удаляем selectedPins из настроек

      // Собираем все выбранные пины из всех сигналов
      const allSelectedPins = new Set<string>();
      Object.values(selectedPinsData).forEach((pins) => {
        pins.forEach((pin) => allSelectedPins.add(pin));
      });

      // Применяем настройки к каждому выбранному пину
      allSelectedPins.forEach((pinName) => {
        onPinFunctionAdd(pinName, selectedSystemPeripheral, settingsWithoutPins);
      });

      // Очищаем локальные настройки после применения
      setLocalSettings(
        getDefaultSystemPeripheralSettings(selectedSystemPeripheral)
      );
    } else if (isPeripheralUsedInPins(selectedSystemPeripheral)) {
      // Если пины не выбраны, но периферия уже используется на пинах,
      // обновляем настройки на всех пинах
      const settingsWithoutPins = { ...cleanedSettings };
      delete settingsWithoutPins.selectedPins;
      onPeripheralSettingsUpdate(selectedSystemPeripheral, settingsWithoutPins);
    }
  };

  const handleClearSettings = () => {
    if (!selectedSystemPeripheral) return;

    // Сбрасываем локальные настройки
    setLocalSettings(
      getDefaultSystemPeripheralSettings(selectedSystemPeripheral)
    );
  };

  // Проверяем, есть ли валидные настройки
  const hasValidSettings = () => {
    if (!localSettings || Object.keys(localSettings).length === 0) {
      return false;
    }
    
    // Проверяем выбранные пины
    if (localSettings.selectedPins) {
      const selectedPins = localSettings.selectedPins as Record<string, string[]>;
      const hasSelectedPins = Object.values(selectedPins).some(
        (pins) => Array.isArray(pins) && pins.length > 0
      );
      if (hasSelectedPins) {
        return true;
      }
    }
    
    // Проверяем, есть ли хотя бы одно непустое значение (кроме selectedPins)
    return Object.entries(localSettings).some(
      ([key, value]) =>
        key !== "selectedPins" &&
        value !== "" &&
        value !== undefined &&
        value !== null &&
        value !== false
    );
  };

  return (
    <Box sx={{ display: "flex", height: "100%", flex: 1 }}>
      {/* Панель со списком периферий */}
      <Paper
        sx={{
          width: "20%",
          display: "flex",
          flexDirection: "column",
          py: 1,
          overflow: "hidden",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            overflow: "auto",
            flex: 1,
          }}
        >
          <Box>
            {availablePeripherals.map((peripheralType) => {
              const isActive = selectedSystemPeripheral === peripheralType;
              const usedInPins = isPeripheralUsedInPins(peripheralType);

              return (
                <React.Fragment key={peripheralType}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handlePeripheralClick(peripheralType)}
                      selected={isActive}
                    >
                      <ListItemText 
                        primary={peripheralType}
                      />
                      {usedInPins && (
                        <CheckCircleIcon
                          sx={{
                            color: "success.main",
                            fontSize: 20,
                            ml: 1,
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* Панель с настройками периферии */}
      <Paper
        sx={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          p: 1,
        }}
      >
        <>
          <Box sx={{ mb: 1, p: 1, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
              {selectedPeripheralConfig?.name || selectedSystemPeripheral}
            </Typography>
            
            {/* Показываем выбранные пины из selectedPinFunctions */}
            {selectedSystemPeripheral && isPeripheralUsedInPins(selectedSystemPeripheral) && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                  Выбранные пины:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {getSelectedPinsForPeripheral(selectedSystemPeripheral).map((pin) => (
                    <Chip
                      key={pin}
                      label={pin}
                      size="small"
                      color="primary"
                      variant="filled"
                      sx={{ fontSize: "0.7rem", height: "24px" }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {selectedPeripheralConfig?.pinMapping && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                <Typography variant="caption" sx={{ width: "100%", color: "text.secondary", mb: 0.5 }}>
                  Выберите пины для применения настроек (можно выбрать один или несколько):
                </Typography>
                {Object.entries(selectedPeripheralConfig.pinMapping).map(([signal, pins]) => {
                  // Используем имя сигнала как ключ (для GPIO это будет "pins", для остальных - имя сигнала)
                  const signalKey = signal;
                  
                  // Получаем выбранные пины для этого сигнала из настроек
                  const selectedPinsForSignal = (localSettings.selectedPins as Record<string, string[]>)?.[signalKey] || [];
                  
                  // Фильтруем пины - исключаем те, что уже используются с этой периферией
                  const availablePins = Array.isArray(pins) ? pins.filter((pin) => {
                    // Проверяем, не используется ли этот пин уже для данной периферии
                    const pinFunctions = selectedPinFunctions[pin] || [];
                    const isAlreadyUsed = pinFunctions.some(
                      (func) => func.functionType === selectedSystemPeripheral
                    );
                    return !isAlreadyUsed;
                  }) : [];
                  
                  // Если нет доступных пинов, не показываем эту секцию
                  if (availablePins.length === 0) return null;
                  
                  return (
                    <Box key={signal} sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, width: "100%" }}>
                      {signal !== "pins" && (
                        <Typography variant="caption" sx={{ color: "text.secondary", minWidth: "60px", pt: 0.5 }}>
                          {signal}:
                        </Typography>
                      )}
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flex: 1 }}>
                        {availablePins.map((pin) => {
                          const isSelected = selectedPinsForSignal.includes(pin);
                          return (
                            <Chip
                              key={pin}
                              label={pin}
                              size="small"
                              variant={isSelected ? "filled" : "outlined"}
                              color={isSelected ? "primary" : "default"}
                              onClick={() => {
                                    setLocalSettings((prev) => {
                                      const newSettings = { ...prev };
                                      const currentSelectedPins = (newSettings.selectedPins as Record<string, string[]>) || {};
                                      const currentSignalPins = currentSelectedPins[signalKey] || [];
                                      
                                      if (isSelected) {
                                        // Удаляем пин из выбранных
                                        currentSelectedPins[signalKey] = currentSignalPins.filter((p) => p !== pin);
                                      } else {
                                        // Добавляем пин в выбранные
                                        currentSelectedPins[signalKey] = [...currentSignalPins, pin];
                                      }
                                      
                                      // Удаляем пустые массивы
                                      Object.keys(currentSelectedPins).forEach((key) => {
                                        if (currentSelectedPins[key].length === 0) {
                                          delete currentSelectedPins[key];
                                        }
                                      });
                                      
                                      // Если нет выбранных пинов, удаляем поле selectedPins
                                      if (Object.keys(currentSelectedPins).length === 0) {
                                        delete newSettings.selectedPins;
                                      } else {
                                        newSettings.selectedPins = currentSelectedPins;
                                      }
                                      
                                      return newSettings;
                                    });
                                  }}
                                  sx={{
                                    fontSize: "0.7rem",
                                    height: "24px",
                                    cursor: "pointer",
                                    "&:hover": {
                                      opacity: 0.8,
                                      transform: "scale(1.05)",
                                    },
                                    transition: "all 0.2s",
                                  }}
                                />
                              );
                            })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
          <Box sx={{ overflow: "auto", flex: 1, p: 1 }}>
            <RenderSettings
              func={{
                type: selectedSystemPeripheral,
              }}
              settings={localSettings}
              onSettingChange={(key: string, value: unknown) => {
                // Обновляем только локальное состояние
                setLocalSettings((prev) => {
                  const newSettings = { ...prev };

                  // Если значение пустая строка, удаляем ключ из настроек
                  if (value === "" || value === undefined || value === null) {
                    delete newSettings[key];
                  } else {
                    newSettings[key] = value;
                  }

                  return newSettings;
                });
              }}
              boardConfig={boardConfig}
              pinName={undefined}
            />
          </Box>
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            {selectedSystemPeripheral && 
              isPeripheralUsedInPins(selectedSystemPeripheral) && (
                <Button variant="outlined" onClick={handleClearSettings}>
                  Очистить
                </Button>
              )}
            <Button
              variant="contained"
              onClick={handleApplySettings}
              disabled={!hasValidSettings()}
            >
              Применить
            </Button>
          </Box>
        </>
      </Paper>
    </Box>
  );
};

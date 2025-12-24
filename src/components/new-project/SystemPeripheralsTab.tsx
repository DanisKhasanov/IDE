import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { BoardConfig, SelectedPinFunction } from "@/types/boardConfig";
import { RenderSettings } from "@/components/common/RenderSettings";
import { getPeripheryDefaultSettings } from "@/utils/config/boardConfigHelpers";
import { systemPeripheralsJson } from "@/utils/config/boardConfigHelpers";

interface SystemPeripheralsTabProps {
  systemPeripherals: Record<string, SelectedPinFunction>;
  boardConfig: BoardConfig | null;
  onSystemPeripheralAdd: (peripheralName: string, settings: Record<string, unknown>) => void;
  onSystemPeripheralRemove: (peripheralName: string) => void;
  onSystemPeripheralSettingsUpdate: (
    peripheralName: string,
    settings: Record<string, unknown>
  ) => void;
  getAvailableSystemPeripherals: () => string[];
}

export const SystemPeripheralsTab: React.FC<SystemPeripheralsTabProps> = ({
  systemPeripherals,
  boardConfig,
  onSystemPeripheralAdd,
  onSystemPeripheralRemove,
  onSystemPeripheralSettingsUpdate,
  getAvailableSystemPeripherals,
}) => {
  const [selectedPeripheral, setSelectedPeripheral] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>(
    {}
  );

  // Функция для получения дефолтных настроек системной периферии из systemPeripherals.json
  const getDefaultSystemPeripheralSettings = (peripheralName: string): Record<string, unknown> => {
    const peripheralConfig = systemPeripheralsJson[peripheralName as keyof typeof systemPeripheralsJson];
    if (!peripheralConfig?.config) return {};
    
    return getPeripheryDefaultSettings(peripheralName);
  };

  const availablePeripherals = getAvailableSystemPeripherals();
  const selectedPeripheralData = selectedPeripheral ? systemPeripherals[selectedPeripheral] : null;

  // Синхронизируем локальные настройки только при изменении выбранной периферии
  const currentPeripheralSettings = selectedPeripheralData?.settings;

  // Автоматически выбираем первый элемент при открытии таба
  useEffect(() => {
    // Если уже есть выбранная периферия, ничего не делаем
    if (selectedPeripheral) return;

    // Если нет доступных периферий, ничего не делаем
    if (availablePeripherals.length === 0) return;

    // Сначала ищем периферию с примененными настройками
    const peripheralWithSettings = availablePeripherals.find(
      (peripheralName) =>
        systemPeripherals[peripheralName]?.settings &&
        Object.keys(systemPeripherals[peripheralName].settings).length > 0
    );

    // Выбираем периферию с настройками или первую доступную
    const peripheralToSelect = peripheralWithSettings || availablePeripherals[0];
    setSelectedPeripheral(peripheralToSelect);
  }, [availablePeripherals, systemPeripherals, selectedPeripheral]);

  useEffect(() => {
    if (selectedPeripheral) {
      if (currentPeripheralSettings) {
        // Загружаем существующие настройки в локальное состояние
        setLocalSettings({ ...currentPeripheralSettings });
      } else {
        // Если периферия еще не добавлена, используем дефолтные настройки
        setLocalSettings(getDefaultSystemPeripheralSettings(selectedPeripheral));
      }
    } else {
      setLocalSettings({});
    }
  }, [selectedPeripheral, currentPeripheralSettings]);

  const handlePeripheralClick = (peripheralName: string) => {
    if (selectedPeripheral === peripheralName) {
      return;
    }
    setSelectedPeripheral(peripheralName);
  };

  const handleApplySettings = () => {
    if (!selectedPeripheral) return;

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

    // Если периферия еще не добавлена, добавляем её с настройками
    if (!selectedPeripheralData) {
      onSystemPeripheralAdd(selectedPeripheral, cleanedSettings);
    } else {
      // Если периферия уже существует, обновляем её настройки
      onSystemPeripheralSettingsUpdate(selectedPeripheral, cleanedSettings);
    }
  };

  const handleClearSettings = () => {
    if (!selectedPeripheral) return;

    // Удаляем периферию
    onSystemPeripheralRemove(selectedPeripheral);
    // Сбрасываем локальные настройки на дефолтные
    setLocalSettings(getDefaultSystemPeripheralSettings(selectedPeripheral));
  };

  // Проверяем, есть ли валидные настройки
  const hasValidSettings = () => {
    if (!localSettings || Object.keys(localSettings).length === 0) {
      return false;
    }
    // Проверяем, есть ли хотя бы одно непустое значение
    return Object.values(localSettings).some(
      (value) =>
        value !== "" &&
        value !== undefined &&
        value !== null &&
        value !== false
    );
  };

  // Получаем название периферии из конфига
  const getPeripheralName = (peripheralId: string): string => {
    const peripheralConfig = systemPeripheralsJson[peripheralId as keyof typeof systemPeripheralsJson];
    return peripheralConfig?.name || peripheralId;
  };

  return (
    <Box sx={{ display: "flex", height: "100%", flex: 1 }}>
      {/* Панель со списком системных периферий */}
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
            {availablePeripherals.map((peripheralName) => {
              const isActive = selectedPeripheral === peripheralName;
              const hasSettings =
                !!systemPeripherals[peripheralName]?.settings &&
                Object.keys(systemPeripherals[peripheralName].settings).length > 0;

              return (
                <React.Fragment key={peripheralName}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handlePeripheralClick(peripheralName)}
                      selected={isActive}
                      sx={{
                        "&.Mui-selected": {
                          backgroundColor: "action.selected",
                          "&:hover": {
                            backgroundColor: "action.selected",
                          },
                        },
                      }}
                    >
                      <ListItemText primary={peripheralName} />
                      {hasSettings && (
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

      {/* Панель с настройками системной периферии */}
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
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              {selectedPeripheral ? getPeripheralName(selectedPeripheral) : ""}
            </Typography>
          </Box>
          <Box sx={{ overflow: "auto", flex: 1, p: 1 }}>
            {selectedPeripheral && (
              <RenderSettings
                func={{
                  type: selectedPeripheral,
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
            )}
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
            {selectedPeripheralData &&
              selectedPeripheralData.settings &&
              Object.keys(selectedPeripheralData.settings).length > 0 && (
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


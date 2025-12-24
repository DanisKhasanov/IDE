import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Checkbox,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { BoardConfig } from "@/types/boardConfig";
import { PeripheryRenderer } from "@/components/common/PeripheryRenderer";
import {
  getPeripheryDefaultSettings,
  getPeriphery,
  systemPeripheriesJson,
} from "@/utils/config/boardConfigHelpers";

interface SystemPeripheralsTabProps {
  systemPeripherals: Record<string, any>;
  boardConfig: BoardConfig | null;
  selectedPeripheral: string | null;
  onPeripheralSelect: (peripheralName: string | null) => void;
  onSystemPeripheralAdd?: (
    peripheralName: string,
    settings: Record<string, unknown>
  ) => void;
  onSystemPeripheralRemove?: (peripheralName: string) => void;
  getSystemPeripherals: () => string[];
  isSystemPeripheralUsed: (peripheralName: string) => boolean;
}

export const SystemPeripheralsTab: React.FC<SystemPeripheralsTabProps> = ({
  systemPeripherals,
  boardConfig,
  selectedPeripheral,
  onPeripheralSelect,
  onSystemPeripheralAdd,
  onSystemPeripheralRemove,
  getSystemPeripherals,
  isSystemPeripheralUsed,
}) => {
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});

  const availablePeripherals = getSystemPeripherals();

  // Получаем информацию о выбранной периферии из конфига
  const selectedPeripheralConfig = selectedPeripheral
    ? getPeriphery(selectedPeripheral)
    : null;

  // Автоматически выбираем первый элемент при открытии таба
  // Проверяем, что выбранная периферия действительно есть в списке системных периферий
  useEffect(() => {
    // Если нет доступных периферий, ничего не делаем
    if (availablePeripherals.length === 0) return;

    // Если выбранная периферия не в списке доступных системных периферий, сбрасываем выбор
    if (selectedPeripheral && !availablePeripherals.includes(selectedPeripheral)) {
      // Сначала ищем периферию с примененными настройками
      const peripheralWithSettings = availablePeripherals.find(
        (peripheralName) =>
          systemPeripherals[peripheralName]?.settings &&
          Object.keys(systemPeripherals[peripheralName].settings).length > 0
      );

      // Выбираем периферию с настройками или первую доступную
      const peripheralToSelect = peripheralWithSettings || availablePeripherals[0];
      onPeripheralSelect(peripheralToSelect);
      return;
    }

    // Если уже есть выбранная периферия из списка доступных, ничего не делаем
    if (selectedPeripheral) return;

    // Сначала ищем периферию с примененными настройками
    const peripheralWithSettings = availablePeripherals.find(
      (peripheralName) =>
        systemPeripherals[peripheralName]?.settings &&
        Object.keys(systemPeripherals[peripheralName].settings).length > 0
    );

    // Выбираем периферию с настройками или первую доступную
    const peripheralToSelect = peripheralWithSettings || availablePeripherals[0];
    onPeripheralSelect(peripheralToSelect);
  }, [availablePeripherals, systemPeripherals, selectedPeripheral, onPeripheralSelect]);

  // Загружаем настройки выбранной периферии
  useEffect(() => {
    if (selectedPeripheral) {
      const existingSettings = systemPeripherals[selectedPeripheral];
      
      if (existingSettings) {
        // Объединяем существующие настройки с дефолтными
        const defaultSettings = getPeripheryDefaultSettings(
          selectedPeripheral,
          existingSettings.settings
        );
        setLocalSettings({ ...defaultSettings, ...existingSettings.settings });
      } else {
        // Дефолтные настройки для новой периферии
        const defaultSettings = getPeripheryDefaultSettings(selectedPeripheral);
        setLocalSettings(defaultSettings);
      }
    } else {
      setLocalSettings({});
    }
  }, [selectedPeripheral, systemPeripherals]);

  const handlePeripheralClick = (peripheralType: string) => {
    onPeripheralSelect(peripheralType);
  };

  const handleApplySettings = () => {
    if (!selectedPeripheral || !onSystemPeripheralAdd) return;

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

    // Применяем настройки к системной периферии
    onSystemPeripheralAdd(selectedPeripheral, cleanedSettings);
  };

  const handleClearSettings = () => {
    if (!selectedPeripheral) return;

    // Проверяем, есть ли примененные настройки для этой периферии
    const hasAppliedSettings = !!systemPeripherals[selectedPeripheral];

    if (hasAppliedSettings && onSystemPeripheralRemove) {
      onSystemPeripheralRemove(selectedPeripheral);
      // Сбрасываем локальные настройки на дефолтные
      const defaultSettings = getPeripheryDefaultSettings(selectedPeripheral);
      setLocalSettings(defaultSettings);
    } else {
      // Если настройки не применены, просто сбрасываем локальные настройки
      const defaultSettings = getPeripheryDefaultSettings(
        selectedPeripheral,
        localSettings
      );
      setLocalSettings(defaultSettings);
    }
  };

  // Проверяем, применены ли настройки для выбранной периферии
  const hasAppliedSettings =
    selectedPeripheral && !!systemPeripherals[selectedPeripheral];

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
            {availablePeripherals.map((peripheralType) => {
              const isActive = selectedPeripheral === peripheralType;
              const used = isSystemPeripheralUsed(peripheralType);

              return (
                <React.Fragment key={peripheralType}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handlePeripheralClick(peripheralType)}
                      selected={isActive}
                    >
                      <ListItemText primary={peripheralType} />
                      {used && (
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

      {/* Панель с настройками */}
      <Paper
        sx={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Заголовок */}
        {selectedPeripheral && (
          <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
            <Typography>
              {selectedPeripheralConfig?.name || selectedPeripheral}
            </Typography>
          </Box>
        )}

        {/* Настройки - скроллируемая область */}
        {selectedPeripheral && (
          <>
            <Box sx={{ flex: 1, overflow: "auto", py: 2, px: 1 }}>
              <PeripheryRenderer
                peripheryName={selectedPeripheral}
                settings={localSettings}
                onSettingChange={(key: string, value: unknown) => {
                  setLocalSettings((prev) => {
                    const newSettings = { ...prev };
                    if (value === "" || value === undefined || value === null) {
                      delete newSettings[key];
                    } else {
                      newSettings[key] = value;
                    }
                    return newSettings;
                  });
                }}
              />
            </Box>

            {/* Кнопки - всегда внизу Paper */}
            <Box
              sx={{
                py: 1,
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                flexShrink: 0,
              }}
            >
              <Button
                variant="outlined"
                onClick={handleClearSettings}
                size="small"
                disabled={!hasAppliedSettings}
              >
                Очистить
              </Button>
              <Button
                variant="contained"
                onClick={handleApplySettings}
                size="small"
              >
                Применить
              </Button>
            </Box>
          </>
        )}

        {!selectedPeripheral && (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: "text.secondary",
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography>Выберите системную периферию для настройки</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};


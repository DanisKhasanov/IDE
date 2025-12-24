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

interface TimersTabProps {
  timers: Record<string, SelectedPinFunction>;
  boardConfig: BoardConfig | null;
  onTimerAdd: (timerName: string, settings: Record<string, unknown>) => void;
  onTimerRemove: (timerName: string) => void;
  onTimerSettingsUpdate: (
    timerName: string,
    settings: Record<string, unknown>
  ) => void;
  getAvailableTimers: () => string[];
}

export const TimersTab: React.FC<TimersTabProps> = ({
  timers,
  boardConfig,
  onTimerAdd,
  onTimerRemove,
  onTimerSettingsUpdate,
  getAvailableTimers,
}) => {
  const [selectedTimer, setSelectedTimer] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>(
    {}
  );

  // Функция для получения дефолтных настроек таймера из peripheries.json
  const getDefaultTimerSettings = (
    timerName: string
  ): Record<string, unknown> => {
    return getPeripheryDefaultSettings(timerName);
  };

  const availableTimers = getAvailableTimers();
  const selectedTimerData = selectedTimer ? timers[selectedTimer] : null;

  // Синхронизируем локальные настройки только при изменении выбранного таймера
  // Используем selectedTimerData для получения актуальных настроек
  const currentTimerSettings = selectedTimerData?.settings;

  // Автоматически выбираем первый элемент при открытии таба
  useEffect(() => {
    // Если уже есть выбранный таймер, ничего не делаем
    if (selectedTimer) return;

    // Если нет доступных таймеров, ничего не делаем
    if (availableTimers.length === 0) return;

    // Сначала ищем таймер с примененными настройками
    const timerWithSettings = availableTimers.find(
      (timerName) =>
        timers[timerName]?.settings &&
        Object.keys(timers[timerName].settings).length > 0
    );

    // Выбираем таймер с настройками или первый доступный
    const timerToSelect = timerWithSettings || availableTimers[0];
    setSelectedTimer(timerToSelect);
  }, [availableTimers, timers, selectedTimer]);

  useEffect(() => {
    if (selectedTimer) {
      if (currentTimerSettings) {
        // Загружаем существующие настройки в локальное состояние
        setLocalSettings({ ...currentTimerSettings });
      } else {
        // Если таймер еще не добавлен, используем дефолтные настройки
        setLocalSettings(getDefaultTimerSettings(selectedTimer));
      }
    } else {
      setLocalSettings({});
    }
  }, [selectedTimer, currentTimerSettings]);

  const handleTimerClick = (timerName: string) => {
    if (selectedTimer === timerName) {
      return;
    }
    setSelectedTimer(timerName);
  };

  const handleApplySettings = () => {
    if (!selectedTimer) return;

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

    // Если таймер еще не добавлен, добавляем его с настройками
    if (!selectedTimerData) {
      onTimerAdd(selectedTimer, cleanedSettings);
    } else {
      // Если таймер уже существует, обновляем его настройки
      onTimerSettingsUpdate(selectedTimer, cleanedSettings);
    }
  };

  const handleClearSettings = () => {
    if (!selectedTimer) return;

    // Удаляем таймер
    onTimerRemove(selectedTimer);
    // Сбрасываем локальные настройки на дефолтные
    setLocalSettings(getDefaultTimerSettings(selectedTimer));
  };

  // Проверяем, есть ли валидные настройки
  const hasValidSettings = () => {
    if (!localSettings || Object.keys(localSettings).length === 0) {
      return false;
    }
    // Проверяем, есть ли хотя бы одно непустое значение
    return Object.values(localSettings).some(
      (value) =>
        value !== "" && value !== undefined && value !== null && value !== false
    );
  };

  return (
    <Box sx={{ display: "flex", height: "100%", flex: 1 }}>
      {/* Панель со списком таймеров */}
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
            {availableTimers.map((timerName) => {
              const isActive = selectedTimer === timerName;
              const hasSettings =
                !!timers[timerName]?.settings &&
                Object.keys(timers[timerName].settings).length > 0;

              return (
                <React.Fragment key={timerName}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleTimerClick(timerName)}
                      selected={isActive}
                    >
                      <ListItemText primary={timerName} />
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

      {/* Панель с настройками таймера */}
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
              {selectedTimer}
            </Typography>
          </Box>
          <Box sx={{ overflow: "auto", flex: 1, p: 1 }}>
            <RenderSettings
              func={{
                type: `${selectedTimer}_PWM`, // Используем формат TIMER0_PWM для совместимости с RenderSettings
                modes: boardConfig?.peripherals[selectedTimer]?.modes || [],
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
            {selectedTimerData &&
              selectedTimerData.settings &&
              Object.keys(selectedTimerData.settings).length > 0 && (
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

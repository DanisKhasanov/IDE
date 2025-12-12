import React, { useState } from "react";
import { Box, Typography, Alert, Tabs, Tab } from "@mui/material";
import type { BoardConfig, SelectedPinFunction } from "../../types/boardConfig";
import { PinsTab } from "./PinsTab";
import { SystemPeripheralsTab } from "./SystemPeripheralsTab";
import { TimersTab } from "./TimersTab";

interface SelectedPinsPanelProps {
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  systemPeripherals: Record<string, SelectedPinFunction>;
  timers: Record<string, SelectedPinFunction>;
  conflicts: string[];
  boardConfig: BoardConfig | null;
  onRemoveFunction: (pinName: string, functionType?: string) => void;
  onFunctionSettingsUpdate: (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  onSystemPeripheralAdd: (
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  onSystemPeripheralRemove: (functionType: string) => void;
  onSystemPeripheralSettingsUpdate: (
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  onTimerAdd: (timerName: string, settings: Record<string, unknown>) => void;
  onTimerRemove: (timerName: string) => void;
  onTimerSettingsUpdate: (
    timerName: string,
    settings: Record<string, unknown>
  ) => void;
  getSystemPeripherals: () => string[];
  getAvailableTimers: () => string[];
  selectedPin?: string | null;
  selectedFunctionType?: string | null;
}

export const SelectedPinsPanel: React.FC<SelectedPinsPanelProps> = ({
  selectedPinFunctions,
  systemPeripherals,
  timers,
  conflicts,
  boardConfig,
  onRemoveFunction,
  onFunctionSettingsUpdate,
  onSystemPeripheralAdd,
  onSystemPeripheralRemove,
  onSystemPeripheralSettingsUpdate,
  onTimerAdd,
  onTimerRemove,
  onTimerSettingsUpdate,
  getSystemPeripherals,
  getAvailableTimers,
  selectedPin,
  selectedFunctionType,
}) => {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0); // 0 - пины, 1 - системные периферии, 2 - таймеры

  const hasPins = Object.keys(selectedPinFunctions).length > 0;
  const hasSystemPeripherals = Object.keys(systemPeripherals).length > 0;
  const hasTimers = Object.keys(timers).length > 0;
  const hasAnyContent = hasPins || hasSystemPeripherals || hasTimers;

  return (
    <Box
      sx={{
        width: "55%",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: 1,
        borderColor: "divider",
        pr: 2,
        overflow: "hidden",
      }}
    >
      {/* Заголовок и конфликты */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Настройки
        </Typography>
        {conflicts.length > 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
              Обнаружены конфликты:
            </Typography>
            {conflicts.map((conflict, idx) => (
              <Typography key={idx} variant="caption" display="block">
                • {conflict}
              </Typography>
            ))}
          </Alert>
        )}
      </Box>

      {/* Вкладки */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => {
          setActiveTab(newValue as 0 | 1 | 2);
        }}
        sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Tab
          label={`Пины${hasPins ? ` (${Object.keys(selectedPinFunctions).length})` : ""}`}
        />
        <Tab
          label={`Системные периферии${hasSystemPeripherals ? ` (${Object.keys(systemPeripherals).length})` : ""}`}
        />
        <Tab
          label={`Таймеры${hasTimers ? ` (${Object.keys(timers).length})` : ""}`}
        />
      </Tabs>

      {/* Контент вкладок */}
      {!hasAnyContent ? (
        <Box
          sx={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            Сначала выберите пин справа
          </Typography>
        </Box>
      ) : activeTab === 0 ? (
        <PinsTab
          selectedPinFunctions={selectedPinFunctions}
          boardConfig={boardConfig}
          onRemoveFunction={onRemoveFunction}
          onFunctionSettingsUpdate={onFunctionSettingsUpdate}
          selectedPinFromParent={selectedPin}
          selectedFunctionTypeFromParent={selectedFunctionType}
        />
      ) : activeTab === 1 ? (
        <SystemPeripheralsTab
          systemPeripherals={systemPeripherals}
          boardConfig={boardConfig}
          onSystemPeripheralAdd={onSystemPeripheralAdd}
          onSystemPeripheralRemove={onSystemPeripheralRemove}
          onSystemPeripheralSettingsUpdate={onSystemPeripheralSettingsUpdate}
          getSystemPeripherals={getSystemPeripherals}
        />
      ) : (
        <TimersTab
          timers={timers}
          boardConfig={boardConfig}
          onTimerAdd={onTimerAdd}
          onTimerRemove={onTimerRemove}
          onTimerSettingsUpdate={onTimerSettingsUpdate}
          getAvailableTimers={getAvailableTimers}
        />
      )}
    </Box>
  );
};

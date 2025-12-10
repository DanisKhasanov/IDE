import React, { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import type { BoardConfig, SelectedPinFunction } from "../types/boardConfig";
import { PinsTab } from "./PinsTab";
import { SystemPeripheralsTab } from "./SystemPeripheralsTab";

interface SelectedPinsPanelProps {
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  systemPeripherals: Record<string, SelectedPinFunction>;
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
  getSystemPeripherals: () => string[];
  selectedPin?: string | null;
  selectedFunctionType?: string | null;
}

export const SelectedPinsPanel: React.FC<SelectedPinsPanelProps> = ({
  selectedPinFunctions,
  systemPeripherals,
  conflicts,
  boardConfig,
  onRemoveFunction,
  onFunctionSettingsUpdate,
  onSystemPeripheralAdd,
  onSystemPeripheralRemove,
  onSystemPeripheralSettingsUpdate,
  getSystemPeripherals,
  selectedPin,
  selectedFunctionType,
}) => {
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 - пины, 1 - системные периферии

  const hasPins = Object.keys(selectedPinFunctions).length > 0;
  const hasSystemPeripherals = Object.keys(systemPeripherals).length > 0;
  const hasAnyContent = hasPins || hasSystemPeripherals;

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
      <Box sx={{ mb: 2, flexShrink: 0 }}>
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
          setActiveTab(newValue as 0 | 1);
        }}
        sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Tab
          label={`Пины${hasPins ? ` (${Object.keys(selectedPinFunctions).length})` : ""}`}
        />
        <Tab
          label={`Системные периферии${hasSystemPeripherals ? ` (${Object.keys(systemPeripherals).length})` : ""}`}
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
            Выберите пин справа для настройки функций
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
      ) : (
        <SystemPeripheralsTab
          systemPeripherals={systemPeripherals}
          boardConfig={boardConfig}
          onSystemPeripheralAdd={onSystemPeripheralAdd}
          onSystemPeripheralRemove={onSystemPeripheralRemove}
          onSystemPeripheralSettingsUpdate={onSystemPeripheralSettingsUpdate}
          getSystemPeripherals={getSystemPeripherals}
        />
      )}
    </Box>
  );
};

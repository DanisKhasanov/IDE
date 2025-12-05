import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { PanelGroup, Panel } from "react-resizable-panels";
import type { BoardConfig, SelectedPinFunction } from "../types/boardConfig";
import { RenderSettings } from "@/utils/RenderSettings";

interface SystemPeripheralsTabProps {
  systemPeripherals: Record<string, SelectedPinFunction>;
  boardConfig: BoardConfig | null;
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
}

export const SystemPeripheralsTab: React.FC<SystemPeripheralsTabProps> = ({
  systemPeripherals,
  boardConfig,
  onSystemPeripheralAdd,
  onSystemPeripheralRemove,
  onSystemPeripheralSettingsUpdate,
  getSystemPeripherals,
}) => {
  const [selectedSystemPeripheral, setSelectedSystemPeripheral] = useState<
    string | null
  >(null);

  // Функция для получения дефолтных настроек системной периферии
  const getDefaultSystemPeripheralSettings = (
    functionType: string
  ): Record<string, unknown> => {
    if (functionType === "WATCHDOG") {
      return { timeout: 2000, mode: "Reset" };
    }
    return {};
  };

  const availablePeripherals = getSystemPeripherals();
  const selectedPeripheral = selectedSystemPeripheral
    ? systemPeripherals[selectedSystemPeripheral]
    : null;

  const handlePeripheralClick = (peripheralType: string) => {
    const isSelected = !!systemPeripherals[peripheralType];
    const defaultSettings =
      getDefaultSystemPeripheralSettings(peripheralType);

    if (isSelected) {
      // Если выбрана - снимаем чекбокс и закрываем настройки
      onSystemPeripheralRemove(peripheralType);
      if (selectedSystemPeripheral === peripheralType) {
        setSelectedSystemPeripheral(null);
      }
    } else {
      // Если не выбрана - отмечаем чекбокс и открываем настройки
      onSystemPeripheralAdd(peripheralType, defaultSettings);
      setSelectedSystemPeripheral(peripheralType);
    }
  };

  return (
    <PanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>
      {/* Панель со списком периферий */}
      <Panel defaultSize={60} minSize={30}>
        <Paper
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              overflow: "auto",
              flex: 1,
              minHeight: 0,
            }}
          >
            {availablePeripherals.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Нет доступных системных периферий
                </Typography>
              </Box>
            ) : (
              <Box>
                {availablePeripherals.map((peripheralType, index) => {
                  const isSelected = !!systemPeripherals[peripheralType];
                  const isActive = selectedSystemPeripheral === peripheralType;

                  return (
                    <React.Fragment key={peripheralType}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => handlePeripheralClick(peripheralType)}
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
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Checkbox
                              checked={isSelected}
                              size="small"
                              color="primary"
                              tabIndex={-1}
                              disableRipple
                              sx={{ pointerEvents: "none" }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={peripheralType}
                            primaryTypographyProps={{
                              variant: "body1",
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < availablePeripherals.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </Box>
            )}
          </Box>
        </Paper>
      </Panel>

      {/* Панель с настройками периферии */}
      <Panel defaultSize={40}>
        <Paper
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          {selectedSystemPeripheral && selectedPeripheral ? (
            <>
              <Box sx={{ mb: 2 , p: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold" }}
                >
                  {selectedSystemPeripheral}
                </Typography>
              
              </Box>
              <Box sx={{ overflow: "auto", flex: 1 }}>
                <RenderSettings
                  func={{ type: selectedPeripheral.functionType }}
                  settings={selectedPeripheral.settings}
                  onSettingChange={(key: string, value: unknown) => {
                    const newSettings = {
                      ...selectedPeripheral.settings,
                      [key]: value,
                    };
                    onSystemPeripheralSettingsUpdate(
                      selectedSystemPeripheral,
                      newSettings
                    );
                  }}
                  boardConfig={boardConfig}
                />
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <SettingsIcon
                sx={{ fontSize: 48, color: "text.disabled", opacity: 0.5 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Выберите системную периферию для настройки
              </Typography>
            </Box>
          )}
        </Paper>
      </Panel>
    </PanelGroup>
  );
};

import React, { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Paper,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type {
  BoardConfig,
  SelectedPinFunction,
} from "../../../types/boardConfig";
import { RenderSettings } from "@utils/init-project/RenderSettings";

interface SelectedPinsPanelProps {
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  conflicts: string[];
  boardConfig: BoardConfig | null;
  onRemoveFunction: (pinName: string, functionType?: string) => void;
  onFunctionSettingsUpdate: (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
}

export const SelectedPinsPanel: React.FC<SelectedPinsPanelProps> = ({
  selectedPinFunctions,
  conflicts,
  boardConfig,
  onRemoveFunction,
  onFunctionSettingsUpdate,
}) => {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [selectedFunctionType, setSelectedFunctionType] = useState<string | null>(null);

  return (
    <Box
      sx={{
        width: "45%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        borderRight: 1,
        borderColor: "divider",
        pr: 2,
        overflow: "auto",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
        Настройки выбранных пинов
      </Typography>
      {conflicts.length > 0 && (
        <Alert severity="warning">
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
      {Object.keys(selectedPinFunctions).length === 0 ? (
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
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            gap: 2,
          }}
        >
          <Paper sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", py: 1 }}>Пин</TableCell>
                  <TableCell sx={{ fontWeight: "bold", py: 1 }}>Функции</TableCell>
                  <TableCell align="right" sx={{ width: 50, py: 1 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(selectedPinFunctions).map(([pinName, functions]) => {
                  const pin = boardConfig?.pins.find((p) => p.name === pinName);
                  if (!pin || functions.length === 0) return null;

                  return functions.map((func, funcIndex) => {
                    const isSelected = selectedPin === pinName && selectedFunctionType === func.functionType;
                    const isFirstFunc = funcIndex === 0;

                    return (
                      <TableRow
                        key={`${pinName}-${func.functionType}`}
                        hover
                        selected={isSelected}
                        sx={{
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "action.selected"
                            : "transparent",
                          "&:hover": {
                            backgroundColor: isSelected
                              ? "action.selected"
                              : "action.hover",
                          },
                          "& td": {
                            py: 0.75,
                            borderTop: isFirstFunc ? undefined : "none",
                          },
                        }}
                        onClick={() => {
                          setSelectedPin(pinName);
                          setSelectedFunctionType(func.functionType);
                        }}
                      >
                        {isFirstFunc && (
                          <TableCell
                            rowSpan={functions.length}
                            sx={{ py: 0.75, verticalAlign: "top" }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {pin.arduinoName}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip
                            label={func.functionType}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.75 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedPin === pinName && selectedFunctionType === func.functionType) {
                                setSelectedPin(null);
                                setSelectedFunctionType(null);
                              }
                              onRemoveFunction(pinName, func.functionType);
                            }}
                            color="error"
                            sx={{
                              p: 0.5,
                              "&:hover": { backgroundColor: "error.light" },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </Paper>

          <Divider />
          <Paper
            sx={{
              p: 2,
              height: 250,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {selectedPin && selectedFunctionType ? (
              (() => {
                const functions = selectedPinFunctions[selectedPin] || [];
                const func = functions.find((f) => f.functionType === selectedFunctionType);
                const pin = boardConfig?.pins.find(
                  (p) => p.name === selectedPin
                );
                if (!pin || !func) return null;
                const pinFunc = pin.functions.find(
                  (f) => f.type === func.functionType
                );
                if (!pinFunc) return null;

                return (
                  <>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: "bold", mb: 2 }}
                    >
                      {pin.arduinoName} ({pin.name}) - {func.functionType}
                    </Typography>
                    <Box sx={{ overflow: "auto", flex: 1 }}>
                      <RenderSettings
                        func={pinFunc}
                        settings={func.settings}
                        onSettingChange={(key: string, value: unknown) => {
                          const newSettings = {
                            ...func.settings,
                            [key]: value,
                          };
                          onFunctionSettingsUpdate(selectedPin, selectedFunctionType, newSettings);
                        }}
                        boardConfig={boardConfig}
                      />
                    </Box>
                  </>
                );
              })()
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
                <Alert severity="info" sx={{ textAlign: "center" }}>
                  Выберите пин из списка для отображения его настроек
                </Alert>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

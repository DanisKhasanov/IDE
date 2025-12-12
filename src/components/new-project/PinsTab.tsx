import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PanelGroup, Panel } from "react-resizable-panels";
import type { BoardConfig, SelectedPinFunction } from "../types/boardConfig";
import { RenderSettings } from "@/components/common/RenderSettings";

interface PinsTabProps {
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  boardConfig: BoardConfig | null;
  onRemoveFunction: (pinName: string, functionType?: string) => void;
  onFunctionSettingsUpdate: (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  selectedPinFromParent?: string | null;
  selectedFunctionTypeFromParent?: string | null;
}

export const PinsTab: React.FC<PinsTabProps> = ({
  selectedPinFunctions,
  boardConfig,
  onRemoveFunction,
  onFunctionSettingsUpdate,
  selectedPinFromParent,
  selectedFunctionTypeFromParent,
}) => {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [selectedFunctionType, setSelectedFunctionType] = useState<
    string | null
  >(null);

  // Автоматически выбираем пин и функцию, когда они меняются извне
  useEffect(() => {
    if (selectedPinFromParent) {
      const functions = selectedPinFunctions[selectedPinFromParent];
      if (functions && functions.length > 0) {
        setSelectedPin(selectedPinFromParent);
        // Если указана конкретная функция извне, выбираем её, иначе первую доступную
        if (selectedFunctionTypeFromParent) {
          const funcExists = functions.some(
            (f) => f.functionType === selectedFunctionTypeFromParent
          );
          if (funcExists) {
            setSelectedFunctionType(selectedFunctionTypeFromParent);
          } else {
            setSelectedFunctionType(functions[0].functionType);
          }
        } else {
          setSelectedFunctionType(functions[0].functionType);
        }
      } else {
        // Если пин выбран, но функций нет, просто выбираем пин
        setSelectedPin(selectedPinFromParent);
        setSelectedFunctionType(null);
      }
    } else {
      // Если пин не выбран, сбрасываем выбор
      setSelectedPin(null);
      setSelectedFunctionType(null);
    }
  }, [
    selectedPinFromParent,
    selectedFunctionTypeFromParent,
    selectedPinFunctions,
  ]);

  // Автоматически выбираем новую функцию, если она была добавлена для выбранного пина
  useEffect(() => {
    if (selectedPin && selectedPinFromParent === selectedPin) {
      const functions = selectedPinFunctions[selectedPin];
      if (functions && functions.length > 0) {
        // Если текущая функция не существует или была удалена, выбираем первую доступную
        const currentFuncExists = functions.some(
          (f) => f.functionType === selectedFunctionType
        );
        if (!currentFuncExists) {
          setSelectedFunctionType(functions[0].functionType);
        }
      } else {
        setSelectedFunctionType(null);
      }
    }
  }, [
    selectedPinFunctions,
    selectedPin,
    selectedPinFromParent,
    selectedFunctionType,
  ]);

  return (
    <PanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>
      {/* Панель со списком */}
      <Panel defaultSize={60} minSize={30}>
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Paper sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
            <Table stickyHeader size="small" sx={{ p: 2 }}>
              <TableBody>
                {Object.entries(selectedPinFunctions).map(
                  ([pinName, functions]) => {
                    const pin = boardConfig?.pins.find(
                      (p) => p.pin === pinName
                    );
                    if (!pin || functions.length === 0) return null;

                    return functions.map((func, funcIndex) => {
                      const isSelected =
                        selectedPin === pinName &&
                        selectedFunctionType === func.functionType;
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
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 500 }}
                              >
                                {pin.pin}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell sx={{ py: 0.75 }}>
                            <Chip
                              label={(() => {
                                const pinFunc = pin.functions.find(
                                  (f) => f.type === func.functionType
                                );
                                return pinFunc?.role
                                  ? `${func.functionType} (${pinFunc.role})`
                                  : func.functionType;
                              })()}
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
                                if (
                                  selectedPin === pinName &&
                                  selectedFunctionType === func.functionType
                                ) {
                                  setSelectedPin(null);
                                  setSelectedFunctionType(null);
                                }
                                onRemoveFunction(pinName, func.functionType);
                              }}
                              color="error"
                              sx={{
                                p: 0.5,
                                "&:hover": {
                                  backgroundColor: "error.light",
                                },
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  }
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      </Panel>

      {/* Панель с настройками пина - всегда видна */}
      <Panel defaultSize={50}>
        <Paper
          sx={{
            p: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          {selectedPin && selectedFunctionType ? (
            (() => {
              const functions = selectedPinFunctions[selectedPin] || [];
              const func = functions.find(
                (f) => f.functionType === selectedFunctionType
              );
              const pin = boardConfig?.pins.find((p) => p.pin === selectedPin);
              if (!pin || !func) return null;
              const pinFunc = pin.functions.find(
                (f) => f.type === func.functionType
              );
              if (!pinFunc) return null;

              return (
                <>
                  <Typography>Выберите настройки</Typography>
                  <Box sx={{ overflow: "auto", flex: 1 }}>
                    <RenderSettings
                      func={pinFunc}
                      settings={func.settings}
                      onSettingChange={(key: string, value: unknown) => {
                        const newSettings = {
                          ...func.settings,
                          [key]: value,
                        };
                        onFunctionSettingsUpdate(
                          selectedPin,
                          selectedFunctionType,
                          newSettings
                        );
                      }}
                      boardConfig={boardConfig}
                      pinName={selectedPin}
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
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Выберите пин для настройки функций
              </Typography>
            </Box>
          )}
        </Paper>
      </Panel>
    </PanelGroup>
  );
};

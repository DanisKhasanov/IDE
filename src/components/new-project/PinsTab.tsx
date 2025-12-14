import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { BoardConfig, SelectedPinFunction } from "@/types/boardConfig";
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
  
  // Используем ref для отслеживания текущего выбора, чтобы сохранять его при обновлении настроек
  const currentSelectionRef = useRef<{ pin: string | null; functionType: string | null }>({
    pin: null,
    functionType: null,
  });

  // Используем ref для отслеживания предыдущих значений из родителя, чтобы различать реальные изменения от обновлений настроек
  const prevParentSelectionRef = useRef<{ pin: string | null; functionType: string | null }>({
    pin: null,
    functionType: null,
  });

  // Обновляем ref при изменении выбора
  useEffect(() => {
    currentSelectionRef.current = {
      pin: selectedPin,
      functionType: selectedFunctionType,
    };
  }, [selectedPin, selectedFunctionType]);

  // Автоматически выбираем пин и функцию, когда они меняются извне
  useEffect(() => {
    const currentPin = currentSelectionRef.current.pin;
    const currentFunc = currentSelectionRef.current.functionType;
    const prevParentPin = prevParentSelectionRef.current.pin;
    const prevParentFunc = prevParentSelectionRef.current.functionType;
    
    // Проверяем, изменились ли значения из родителя
    const parentPinChanged = prevParentPin !== selectedPinFromParent;
    const parentFuncChanged = prevParentFunc !== selectedFunctionTypeFromParent;
    
    // Обновляем ref с текущими значениями из родителя
    prevParentSelectionRef.current = {
      pin: selectedPinFromParent || null,
      functionType: selectedFunctionTypeFromParent || null,
    };

    // Если значения из родителя не изменились, но selectedPinFunctions обновился (например, из-за изменения настроек),
    // и текущий выбор все еще валиден, сохраняем его
    if (!parentPinChanged && !parentFuncChanged && currentPin && currentFunc) {
      const functions = selectedPinFunctions[currentPin];
      if (functions && functions.some((f) => f.functionType === currentFunc)) {
        // Выбор все еще валиден, ничего не меняем
        return;
      }
    }

    if (selectedPinFromParent) {
      const functions = selectedPinFunctions[selectedPinFromParent];
      if (functions && functions.length > 0) {
        // Если уже выбран этот пин и функция существует, и родитель не изменился явно, сохраняем выбор
        const shouldPreserveSelection =
          currentPin === selectedPinFromParent &&
          currentFunc &&
          functions.some((f) => f.functionType === currentFunc) &&
          !parentPinChanged &&
          !parentFuncChanged;
        
        if (shouldPreserveSelection) {
          // Выбор уже правильный, ничего не меняем
          return;
        }
        
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
          // Если текущая функция существует и родитель не изменился, сохраняем её, иначе выбираем первую
          if (
            currentFunc &&
            functions.some((f) => f.functionType === currentFunc) &&
            !parentPinChanged
          ) {
            // Сохраняем текущую функцию - не меняем состояние
            return;
          }
          setSelectedFunctionType(functions[0].functionType);
        }
      } else {
        // Если пин выбран, но функций нет, просто выбираем пин
        setSelectedPin(selectedPinFromParent);
        setSelectedFunctionType(null);
      }
    } else {
      // Если пин не выбран извне, но у нас есть локальный выбор и функции существуют, сохраняем его
      if (currentPin && currentFunc) {
        const functions = selectedPinFunctions[currentPin];
        if (functions && functions.some((f) => f.functionType === currentFunc)) {
          // Выбор все еще валиден, ничего не меняем
          return;
        }
      }
      // Только если пин действительно не выбран и выбор невалиден, сбрасываем
      setSelectedPin(null);
      setSelectedFunctionType(null);
    }
  }, [
    selectedPinFromParent,
    selectedFunctionTypeFromParent,
    selectedPinFunctions,
  ]);

  // Автоматически выбираем новую функцию, если она была добавлена для выбранного пина
  // Или обновляем выбор, если текущая функция была удалена
  useEffect(() => {
    // Этот эффект срабатывает только если пин выбран локально и совпадает с родительским
    if (selectedPin && selectedPinFromParent === selectedPin) {
      const functions = selectedPinFunctions[selectedPin];
      if (functions && functions.length > 0) {
        // Если текущая функция не существует или была удалена, выбираем первую доступную
        const currentFuncExists = functions.some(
          (f) => f.functionType === selectedFunctionType
        );
        if (!currentFuncExists && selectedFunctionType) {
          // Только если функция была удалена, выбираем первую доступную
          setSelectedFunctionType(functions[0].functionType);
        }
        // Если функция существует, ничего не делаем - сохраняем текущий выбор
      } else {
        // Если функций нет, сбрасываем выбор функции
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
    <Box sx={{ display: "flex", height: "100%", flex: 1 }}>
      {/* Панель со списком пинов */}
      <Paper
        sx={{
          width: "36%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            overflow: "auto",
            flex: 1,
            p: 1,
          }}
        >
          {Object.entries(selectedPinFunctions).map(
            ([pinName, functions]) => {
              const pin = boardConfig?.pins.find((p) => p.pin === pinName);
              if (!pin || functions.length === 0) return null;

              return (
                <Box key={pinName} sx={{ mb: 1 }}>
                  {functions.map((func, funcIndex) => {
                    const isSelected =
                      selectedPin === pinName &&
                      selectedFunctionType === func.functionType;
                    const isFirstFunc = funcIndex === 0;

                    return (
                      <Box
                        key={`${pinName}-${func.functionType}`}
                        onClick={() => {
                          setSelectedPin(pinName);
                          setSelectedFunctionType(func.functionType);
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "action.selected"
                            : "transparent",
                          "&:hover": {
                            backgroundColor: isSelected
                              ? "action.selected"
                              : "action.hover",
                          },
                          borderTop: isFirstFunc ? undefined : "none",
                        }}
                      >
                        {isFirstFunc && (
                          <Typography
                            sx={{
                              minWidth: "60px",
                            }}
                          >
                            {pin.pin}
                          </Typography>
                        )}
                        {!isFirstFunc && <Box sx={{ minWidth: "60px" }} />}
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
                        <Box sx={{ flex: 1 }} />
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
                      </Box>
                    );
                  })}
                </Box>
              );
            }
          )}
        </Box>
      </Paper>

      {/* Панель с настройками пина */}
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
        {selectedFunctionType &&
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
                <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" ,display: "flex", justifyContent: "space-between"}}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {pin.pin} - {func.functionType}
                  </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                      }}
                    >
                      Настройки некоторых пинов выбираются автоматически
                    </Typography>
                </Box>
                <Box sx={{ overflow: "auto", flex: 1, p: 1 }}>
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
          })()}
      </Paper>
    </Box>
  );
};

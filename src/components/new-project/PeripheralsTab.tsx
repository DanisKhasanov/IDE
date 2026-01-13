import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { BoardConfig, SelectedPinFunction } from "@/types/boardConfig";
import { RenderSettings } from "@/components/common/RenderSettings";
import { getPeripheryDefaultSettings, getPeriphery } from "@/utils/config/boardConfigHelpers";

interface PeripheralsTabProps {
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  boardConfig: BoardConfig | null;
  selectedPin: string | null;
  selectedPeripheral: string | null;
  onPinSelect: (pinName: string | null) => void;
  onPeripheralSelect: (peripheralName: string | null) => void;
  onPinFunctionAdd?: (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  onPinFunctionRemove?: (pinName: string, functionType?: string) => void;
  onPinFunctionRemoveSimple?: (pinName: string, functionType?: string) => void;
  getSystemPeripherals: () => string[];
  isPeripheralUsedInPins: (functionType: string) => boolean;
}

interface PinRowData {
  pinName: string;
  signal: string;
  gpioOutputLevel?: string;
  gpioMode?: string;
  gpioPullUpDown?: string;
  maxOutputSpeed?: string;
  modified: boolean;
}

export const PeripheralsTab = ({
  selectedPinFunctions,
  boardConfig,
  selectedPin,
  selectedPeripheral,
  onPinSelect,
  onPeripheralSelect,
  onPinFunctionAdd,
  onPinFunctionRemove,
  onPinFunctionRemoveSimple,
  getSystemPeripherals,
  isPeripheralUsedInPins,
}: PeripheralsTabProps) => {
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>(
    {}
  );

  const availablePeripherals = getSystemPeripherals();

  // Получаем информацию о выбранной периферии из конфига
  const selectedPeripheralConfig = selectedPeripheral
    ? getPeriphery(selectedPeripheral)
    : null;

  // Автоматически выбираем первый элемент при открытии таба
  useEffect(() => {
    // Если нет доступных периферий, ничего не делаем
    if (availablePeripherals.length === 0) return;

    // Если выбранная периферия не в списке доступных, сбрасываем выбор
    if (
      selectedPeripheral &&
      !availablePeripherals.includes(selectedPeripheral)
    ) {
      // Сначала ищем периферию, которая используется в пинах
      const peripheralWithSettings = availablePeripherals.find(
        (peripheralType) => isPeripheralUsedInPins(peripheralType)
      );

      // Выбираем периферию с настройками или первую доступную
      const peripheralToSelect =
        peripheralWithSettings || availablePeripherals[0];
      onPeripheralSelect(peripheralToSelect);
      return;
    }

    // Если уже есть выбранная периферия из списка доступных, ничего не делаем
    if (selectedPeripheral) return;

    // Сначала ищем периферию, которая используется в пинах
    const peripheralWithSettings = availablePeripherals.find((peripheralType) =>
      isPeripheralUsedInPins(peripheralType)
    );

    // Выбираем периферию с настройками или первую доступную
    const peripheralToSelect =
      peripheralWithSettings || availablePeripherals[0];
    onPeripheralSelect(peripheralToSelect);
  }, [
    availablePeripherals,
    selectedPeripheral,
    onPeripheralSelect,
    isPeripheralUsedInPins,
  ]);

  // Получаем список пинов для выбранной периферии
  const getPeripheralPins = (): PinRowData[] => {
    if (!selectedPeripheral || !boardConfig || !selectedPeripheralConfig) {
      return [];
    }

    const pins: PinRowData[] = [];

    // Получаем все пины из pinMapping
    if (selectedPeripheralConfig.pinMapping) {
      Object.entries(selectedPeripheralConfig.pinMapping).forEach(
        ([signal, pinNames]) => {
          pinNames.forEach((pinName) => {
            // Проверяем, есть ли настройки для этого пина
            const pinFunctions = selectedPinFunctions[pinName] || [];
            const funcForPeripheral = pinFunctions.find(
              (f) => f.functionType === selectedPeripheral
            );

            const settings = funcForPeripheral?.settings || {};

            // Для таймеров ШИМ канал хранится в settings.channel, а не в signal
            const timerPWMTypes = ["TIMER0_PWM", "TIMER1_PWM", "TIMER2_PWM"];
            const isTimerPWM = timerPWMTypes.includes(selectedPeripheral);
            const displaySignal =
              isTimerPWM && settings.channel
                ? (settings.channel as string)
                : signal;

            pins.push({
              pinName,
              signal: displaySignal,
              gpioOutputLevel: settings.initialState as string,
              gpioMode: settings.mode as string,
              gpioPullUpDown: settings.pullMode as string,
              maxOutputSpeed: settings.speed as string,
              modified: !!funcForPeripheral,
            });
          });
        }
      );
    }

    return pins;
  };

  // Загружаем настройки выбранного пина
  useEffect(() => {
    if (selectedPin && selectedPeripheral) {
      const pinFunctions = selectedPinFunctions[selectedPin] || [];
      const funcForPeripheral = pinFunctions.find(
        (f) => f.functionType === selectedPeripheral
      );

      if (funcForPeripheral) {
        // Объединяем существующие настройки с дефолтными, чтобы заполнить отсутствующие поля
        // Передаем текущие настройки для проверки условных настроек
        const defaultSettings = getPeripheryDefaultSettings(
          selectedPeripheral,
          funcForPeripheral.settings
        );
        setLocalSettings({ ...defaultSettings, ...funcForPeripheral.settings });
      } else {
        // Дефолтные настройки для нового пина из peripheries.json
        const defaultSettings = getPeripheryDefaultSettings(selectedPeripheral);
        setLocalSettings(defaultSettings);
      }
    } else {
      setLocalSettings({});
    }
  }, [selectedPin, selectedPeripheral, selectedPinFunctions]);

  const handlePeripheralClick = (peripheralType: string) => {
    onPeripheralSelect(peripheralType);
    onPinSelect(null); // Сбрасываем выбранный пин при смене периферии
  };

  const handlePinClick = (pinName: string) => {
    onPinSelect(pinName);
  };

  const handleApplySettings = () => {
    if (!selectedPeripheral || !selectedPin || !onPinFunctionAdd) return;

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

    // Применяем настройки к выбранному пину
    onPinFunctionAdd(selectedPin, selectedPeripheral, cleanedSettings);

    // Не сбрасываем выбор пина, чтобы можно было видеть результат
  };

  const handleClearSettings = () => {
    if (!selectedPin || !selectedPeripheral) return;

    // Проверяем, есть ли примененные настройки для этого пина и периферии
    const pinFunctions = selectedPinFunctions[selectedPin] || [];
    const funcForPeripheral = pinFunctions.find(
      (f) => f.functionType === selectedPeripheral
    );

    if (funcForPeripheral) {
      // Используем простую функцию удаления, которая не сбрасывает выбор периферии
      if (onPinFunctionRemoveSimple) {
        onPinFunctionRemoveSimple(selectedPin, selectedPeripheral);
      } else if (onPinFunctionRemove) {
        onPinFunctionRemove(selectedPin, selectedPeripheral);
      }

      // Просто сбрасываем выбор пина, периферия остается выбранной
      onPinSelect(null);
    } else {
      // Если настройки не применены, просто сбрасываем локальные настройки
      const defaultSettings = getPeripheryDefaultSettings(
        selectedPeripheral,
        localSettings
      );
      setLocalSettings(defaultSettings);
    }
  };

  const peripheralPins = getPeripheralPins();

  // Проверяем, применены ли настройки для выбранного пина и периферии
  const hasAppliedSettings =
    selectedPin && selectedPeripheral
      ? (selectedPinFunctions[selectedPin] || []).some(
          (f) => f.functionType === selectedPeripheral
        )
      : false;

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
              const isActive = selectedPeripheral === peripheralType;
              const usedInPins = isPeripheralUsedInPins(peripheralType);

              return (
                <React.Fragment key={peripheralType}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handlePeripheralClick(peripheralType)}
                      selected={isActive}
                    >
                      <ListItemText primary={peripheralType} />
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

      {/* Панель с таблицей пинов и настройками */}
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
            <Typography>{selectedPeripheralConfig?.ui?.name || selectedPeripheral}</Typography>
          </Box>
        )}

        {/* Таблица пинов */}
        {selectedPeripheral && (
          <TableContainer
            sx={{
              flex: "0 0 auto",
              height: "300px",
              overflow: "auto",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "70px" }}>Pin</TableCell>
                  <TableCell sx={{ width: "80px" }}>Signal</TableCell>
                  <TableCell sx={{ width: "110px" }}>Mode</TableCell>

                  <TableCell sx={{ width: "70px", textAlign: "center" }}>
                    Modified
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {peripheralPins.map((pin) => (
                  <TableRow
                    key={pin.pinName}
                    hover
                    selected={selectedPin === pin.pinName}
                    onClick={() => handlePinClick(pin.pinName)}
                    sx={{
                      cursor: "pointer",
                    }}
                  >
                    <TableCell>{pin.pinName}</TableCell>
                    <TableCell>{pin.signal}</TableCell>

                    <TableCell>{pin.gpioMode || "n/a"}</TableCell>

                    <TableCell align="center">
                      <Checkbox
                        checked={pin.modified}
                        size="small"
                        disabled
                        sx={{
                          padding: 0,
                          color: pin.modified
                            ? "success.main"
                            : "action.disabled",
                          "&.Mui-checked": {
                            color: "success.main",
                          },
                          "&.Mui-disabled": {
                            color: pin.modified
                              ? "success.main"
                              : "action.disabled",
                          },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {peripheralPins.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 3, color: "text.secondary" }}
                    >
                      Нет доступных пинов для этой периферии
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Настройки выбранного пина */}
        {selectedPeripheral && (
          <>
            {selectedPin ? (
              <>
                {/* Заголовок конфигурации */}
                <Box
                  sx={{
                    p: 1,
                    borderTop: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                >
                  <Typography>{selectedPin} Configuration</Typography>
                </Box>

                {/* Настройки - скроллируемая область */}
                <Box sx={{ flex: 1, overflow: "auto", py: 2, px: 1 }}>
                  <RenderSettings
                    func={{
                      type: selectedPeripheral,
                    }}
                    settings={localSettings}
                    onSettingChange={(key: string, value: unknown) => {
                      setLocalSettings((prev) => {
                        const newSettings = { ...prev };
                        if (
                          value === "" ||
                          value === undefined ||
                          value === null
                        ) {
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
            ) : peripheralPins.length > 0 ? (
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
                <Typography>Выберите пин для настройки</Typography>
              </Box>
            ) : null}
          </>
        )}
      </Paper>
    </Box>
  );
};

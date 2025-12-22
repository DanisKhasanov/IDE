import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Typography,
  Checkbox,
  FormControlLabel,
  Box,
} from "@mui/material";
import type { PinFunction, BoardConfig, PinSignal, PinConfig } from "../../types/boardConfig";

interface RenderSettingsProps {
  func: PinFunction | { type: string; modes?: string[] };
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  boardConfig: BoardConfig | null;
  pinName?: string;
  signal?: PinSignal; // Новый формат сигнала
}

export const RenderSettings: React.FC<RenderSettingsProps> = ({
  func,
  settings,
  onSettingChange,
  boardConfig,
  pinName,
  signal,
}) => {
  const handleSettingChange = (key: string, value: any) => {
    onSettingChange(key, value);
  };

  // Получаем доступные режимы GPIO из peripheries.json
  const getGPIOModes = (): string[] => {
    if (signal) {
      // Если есть signal, получаем все GPIO режимы из signals пина
      const currentPin = pinName
        ? boardConfig?.pins.find((p) => (p.id || p.pin) === pinName)
        : null;
      if (currentPin) {
        return currentPin.signals
          .filter((s) => s.type === "GPIO")
          .map((s) => s.mode);
      }
    }
    
    // Если нет привязки к пину, используем конфиг из peripheries.json
    if (boardConfig?.peripherals.GPIO?.modes) {
      return boardConfig.peripherals.GPIO.modes;
    }
    
    // Fallback значения
    return ["INPUT", "OUTPUT", "INPUT_PULLUP"];
  };

  switch (func.type) {
    case "GPIO": {
      // Проверяем, поддерживает ли пин PCINT
      // PCINT доступен на всех GPIO пинах (если у пина есть GPIO сигналы, значит он может поддерживать PCINT)
      // Но только если есть привязка к конкретному пину
      const currentPin = pinName
        ? boardConfig?.pins.find((p) => (p.id || p.pin) === pinName)
        : null;
      const supportsPCINT =
        pinName !== undefined && 
        currentPin?.signals?.some((s) => s.type === "GPIO") || false;
      const isInputMode =
        settings.mode === "INPUT" || settings.mode === "INPUT_PULLUP";

      return (
        <Box>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Режим</InputLabel>
                <Select
                  value={settings.mode || "INPUT"}
                  label="Режим"
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {getGPIOModes().map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {settings.mode === "OUTPUT" && (
              <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Начальное состояние</InputLabel>
                  <Select
                    value={settings.initialState || "LOW"}
                    label="Начальное состояние"
                    onChange={(e) =>
                      handleSettingChange("initialState", e.target.value)
                    }
                  >
                    <MenuItem value="LOW">LOW (0В)</MenuItem>
                    <MenuItem value="HIGH">HIGH (5В)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
          {supportsPCINT && isInputMode && (
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.enablePCINT || false}
                    onChange={(e) =>
                      handleSettingChange("enablePCINT", e.target.checked)
                    }
                  />
                }
                label={
                  <Typography variant="body2">
                    Включить PCINT (Pin Change Interrupt) - прерывание при
                    изменении состояния пина
                  </Typography>
                }
              />
            </Box>
          )}
        </Box>
      );
    }

    case "UART":
      return (
        <>
          <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
            <Typography variant="body2">
              Настройки UART применяются к обоим пинам (RX и TX), так как они
              используют один модуль UART0.
            </Typography>
          </Alert>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Скорость (baud)</InputLabel>
                <Select
                  value={
                    settings.baud ||
                    boardConfig?.peripherals.UART?.baudRates?.[0] ||
                    9600
                  }
                  label="Скорость (baud)"
                  onChange={(e) => handleSettingChange("baud", e.target.value)}
                >
                  {boardConfig?.peripherals.UART?.baudRates?.map((rate) => (
                    <MenuItem key={rate} value={rate}>
                      {rate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Биты данных</InputLabel>
                <Select
                  value={settings.dataBits || 8}
                  label="Биты данных"
                  onChange={(e) =>
                    handleSettingChange("dataBits", e.target.value)
                  }
                >
                  {boardConfig?.peripherals.UART?.dataBits?.map((bits) => (
                    <MenuItem key={bits} value={bits}>
                      {bits}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Стоп-биты</InputLabel>
                <Select
                  value={settings.stopBits || 1}
                  label="Стоп-биты"
                  onChange={(e) =>
                    handleSettingChange("stopBits", e.target.value)
                  }
                >
                  {boardConfig?.peripherals.UART?.stopBits?.map((bits) => (
                    <MenuItem key={bits} value={bits}>
                      {bits}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Паритет</InputLabel>
                <Select
                  value={settings.parity || "None"}
                  label="Паритет"
                  onChange={(e) =>
                    handleSettingChange("parity", e.target.value)
                  }
                >
                  {boardConfig?.peripherals.UART?.parity?.map((parity) => (
                    <MenuItem key={parity} value={parity}>
                      {parity === "None"
                        ? "Без паритета"
                        : parity === "Even"
                          ? "Чётный"
                          : "Нечётный"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Режим</InputLabel>
                <Select
                  value={settings.mode || "Asynchronous"}
                  label="Режим"
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {boardConfig?.peripherals.UART?.modes?.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode === "Asynchronous" ? "Асинхронный" : "Синхронный"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {boardConfig?.peripherals.UART?.interrupts && (
            <>
              <Typography
                variant="body2"
                sx={{ mt: 2, mb: 1, fontWeight: "bold" }}
              >
                Прерывания:
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.enableRXInterrupt || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "enableRXInterrupt",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      RX (USART_RX_vect) - Прерывание при приёме данных
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.enableTXInterrupt || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "enableTXInterrupt",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      TX (USART_TX_vect) - Прерывание при завершении передачи
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.enableUDREInterrupt || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "enableUDREInterrupt",
                          e.target.checked
                        )
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      UDRE (USART_UDRE_vect) - Прерывание при пустом регистре
                      данных
                    </Typography>
                  }
                />
              </Box>
            </>
          )}
        </>
      );

    case "SPI":
      return (
        <>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Режим</InputLabel>
                <Select
                  value={settings.mode || "Master"}
                  label="Режим"
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {boardConfig?.peripherals.SPI?.modes?.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Скорость</InputLabel>
                <Select
                  value={settings.speed || "fosc/16"}
                  label="Скорость"
                  onChange={(e) => handleSettingChange("speed", e.target.value)}
                >
                  {boardConfig?.peripherals.SPI?.speeds?.map((speed) => (
                    <MenuItem key={speed} value={speed}>
                      {speed}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>CPOL (Clock Polarity)</InputLabel>
                <Select
                  value={settings.cpol !== undefined ? settings.cpol : 0}
                  label="CPOL (Clock Polarity)"
                  onChange={(e) =>
                    handleSettingChange("cpol", parseInt(e.target.value))
                  }
                >
                  {boardConfig?.peripherals.SPI?.cpol?.map((cpol) => (
                    <MenuItem key={cpol} value={cpol}>
                      {cpol === 0 ? "0 (Idle Low)" : "1 (Idle High)"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>CPHA (Clock Phase)</InputLabel>
                <Select
                  value={settings.cpha !== undefined ? settings.cpha : 0}
                  label="CPHA (Clock Phase)"
                  onChange={(e) =>
                    handleSettingChange("cpha", parseInt(e.target.value))
                  }
                >
                  {boardConfig?.peripherals.SPI?.cpha?.map((cpha) => (
                    <MenuItem key={cpha} value={cpha}>
                      {cpha === 0
                        ? "0 (Sample on Leading)"
                        : "1 (Sample on Trailing)"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {boardConfig?.peripherals.SPI?.enableInterrupt && (
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.enableInterrupt || false}
                    onChange={(e) =>
                      handleSettingChange("enableInterrupt", e.target.checked)
                    }
                  />
                }
                label="Включить прерывания (SPI_STC_vect)"
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </>
      );

    case "I2C":
      return (
        <>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Режим</InputLabel>
                <Select
                  value={settings.mode || "Master"}
                  label="Режим"
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {boardConfig?.peripherals.I2C?.modes?.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {(settings.mode || "Master") === "Master" && (
              <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Скорость (Hz)</InputLabel>
                  <Select
                    value={settings.speed || 100000}
                    label="Скорость (Hz)"
                    onChange={(e) =>
                      handleSettingChange("speed", e.target.value)
                    }
                  >
                    {boardConfig?.peripherals.I2C?.speeds?.map((speed) => (
                      <MenuItem key={speed} value={speed}>
                        {typeof speed === "number"
                          ? `${speed / 1000}kHz`
                          : `${speed}kHz`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {(settings.mode || "Master") === "Slave" &&
              boardConfig?.peripherals.I2C?.slaveAddressRange && (
                <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Адрес устройства (Slave Address)"
                    value={settings.slaveAddress || 8}
                    onChange={(e) => {
                      const addr = parseInt(e.target.value);
                      const [min, max] = boardConfig?.peripherals.I2C
                        ?.slaveAddressRange || [8, 119];
                      if (addr >= min && addr <= max) {
                        handleSettingChange("slaveAddress", addr);
                      }
                    }}
                    inputProps={{
                      min:
                        boardConfig?.peripherals.I2C?.slaveAddressRange?.[0] ||
                        8,
                      max:
                        boardConfig?.peripherals.I2C?.slaveAddressRange?.[1] ||
                        119,
                    }}
                    sx={{ mt: 1 }}
                    helperText={`Диапазон: ${boardConfig?.peripherals.I2C?.slaveAddressRange?.[0]}-${boardConfig?.peripherals.I2C?.slaveAddressRange?.[1]}`}
                  />
                </Box>
              )}
          </Box>
          {boardConfig?.peripherals.I2C?.enableInterrupt && (
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.enableInterrupt || false}
                    onChange={(e) =>
                      handleSettingChange("enableInterrupt", e.target.checked)
                    }
                  />
                }
                label={
                  <Typography variant="body2">
                    Включить прерывания (TWI_vect) - событие на шине I2C
                  </Typography>
                }
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </>
      );

    case "EXTERNAL_INTERRUPT":
      // Получаем триггеры из peripheries.json или из signal metadata
      const triggers = signal?.metadata?.triggers || 
        (func as PinFunction).triggers || 
        boardConfig?.peripherals.EXTERNAL_INTERRUPT?.triggers ||
        ["LOW", "CHANGE", "RISING", "FALLING"];
      
      return (
        <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Триггер</InputLabel>
              <Select
                value={settings.trigger || "RISING"}
                label="Триггер"
                onChange={(e) => handleSettingChange("trigger", e.target.value)}
              >
                {triggers.map((trigger: string) => (
                  <MenuItem key={trigger} value={trigger}>
                    {trigger}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      );

    case "TIMER0_PWM":
    case "TIMER1_PWM":
    case "TIMER2_PWM": {
      const timerName = func.type.replace("_PWM", "");
      const timerPeripheral =
        boardConfig?.peripherals[
          timerName as keyof typeof boardConfig.peripherals
        ];
      const modes = timerPeripheral?.modes || [];
      const selectedMode = settings.mode || "";
      const isPWM = selectedMode && selectedMode.includes("PWM");
      const isCTC = selectedMode === "CTC";
      const isNormal = selectedMode === "Normal";
      const isInputCapture = selectedMode === "InputCapture";
      const isTimer1 = timerName === "TIMER1";

      // Определяем максимальное значение для OCR в зависимости от таймера
      const maxOCRValue = timerName === "TIMER1" ? 65535 : 255;
      const defaultDutyCycle = timerName === "TIMER1" ? 32768 : 128;

      return (
        <>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Режим</InputLabel>
                <Select
                  value={selectedMode}
                  label="Режим"
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {modes.map((mode: string) => (
                    <MenuItem key={mode} value={mode}>
                      {mode === "FastPWM"
                        ? "Fast PWM"
                        : mode === "PhaseCorrectPWM"
                          ? "Phase Correct PWM"
                          : mode === "PhaseFrequencyCorrectPWM"
                            ? "Phase and Frequency Correct PWM"
                            : mode === "InputCapture"
                              ? "Input Capture"
                              : mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Предделитель</InputLabel>
                <Select
                  value={settings.prescaler || ""}
                  label="Предделитель"
                  onChange={(e) =>
                    handleSettingChange(
                      "prescaler",
                      e.target.value === "" ? undefined : e.target.value
                    )
                  }
                >
                  {timerPeripheral?.prescalers?.map((prescaler: number) => (
                    <MenuItem key={prescaler} value={prescaler}>
                      {prescaler}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {isPWM && (
              <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Duty Cycle / OCR"
                  value={settings.dutyCycle || defaultDutyCycle}
                  onChange={(e) =>
                    handleSettingChange("dutyCycle", parseInt(e.target.value))
                  }
                  inputProps={{ min: 0, max: maxOCRValue }}
                  sx={{ mt: 1 }}
                  helperText={`0-${maxOCRValue}`}
                />
              </Box>
            )}

            {isCTC && (
              <>
                <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="OCR / TOP Value"
                    value={settings.topValue || defaultDutyCycle}
                    onChange={(e) =>
                      handleSettingChange("topValue", parseInt(e.target.value))
                    }
                    inputProps={{ min: 1, max: maxOCRValue }}
                    sx={{ mt: 1 }}
                    helperText={`1-${maxOCRValue}`}
                  />
                </Box>
                <Box sx={{ width: "100%" }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.enableCOMPAInterrupt || false}
                        onChange={(e) =>
                          handleSettingChange(
                            "enableCOMPAInterrupt",
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Включить прерывание по совпадению A (OCIE0A/OCIE1A/OCIE2A)"
                  />
                </Box>
                <Box sx={{ width: "100%" }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.enableCOMPBInterrupt || false}
                        onChange={(e) =>
                          handleSettingChange(
                            "enableCOMPBInterrupt",
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Включить прерывание по совпадению B (OCIE0B/OCIE1B/OCIE2B)"
                  />
                </Box>
                {settings.enableCOMPBInterrupt && (
                  <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label={`OCR${timerName === "TIMER1" ? "1" : timerName === "TIMER2" ? "2" : "0"}B Value`}
                      value={
                        settings[
                          `ocr${timerName === "TIMER1" ? "1" : timerName === "TIMER2" ? "2" : "0"}b`
                        ] || (timerName === "TIMER1" ? 32768 : 64)
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          `ocr${timerName === "TIMER1" ? "1" : timerName === "TIMER2" ? "2" : "0"}b`,
                          parseInt(e.target.value)
                        )
                      }
                      inputProps={{ min: 0, max: maxOCRValue }}
                      sx={{ mt: 1 }}
                      helperText={`0-${maxOCRValue}`}
                    />
                  </Box>
                )}
              </>
            )}

            {isNormal && (
              <Box sx={{ width: "100%" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.enableInterrupt || false}
                      onChange={(e) =>
                        handleSettingChange("enableInterrupt", e.target.checked)
                      }
                    />
                  }
                  label="Включить прерывание по переполнению (TOIE)"
                />
              </Box>
            )}

            {isInputCapture && isTimer1 && (
              <>
                <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel>Триггер</InputLabel>
                    <Select
                      value={settings.trigger || "RISING"}
                      label="Триггер"
                      onChange={(e) =>
                        handleSettingChange("trigger", e.target.value)
                      }
                    >
                      <MenuItem value="RISING">Rising Edge</MenuItem>
                      <MenuItem value="FALLING">Falling Edge</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ width: "100%" }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.noiseCanceler || false}
                        onChange={(e) =>
                          handleSettingChange("noiseCanceler", e.target.checked)
                        }
                      />
                    }
                    label="Подавление шума (ICNC1)"
                  />
                </Box>
                <Box sx={{ width: "100%" }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.enableInterrupt || false}
                        onChange={(e) =>
                          handleSettingChange(
                            "enableInterrupt",
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Включить прерывание Input Capture (ICIE1)"
                  />
                </Box>
              </>
            )}
          </Box>
        </>
      );
    }

    case "ADC":
      return (
        <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Опорное напряжение</InputLabel>
              <Select
                value={settings.reference || "AVcc"}
                label="Опорное напряжение"
                onChange={(e) =>
                  handleSettingChange("reference", e.target.value)
                }
              >
                {boardConfig?.peripherals.ADC?.reference?.map((ref) => (
                  <MenuItem key={ref} value={ref}>
                    {ref}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Предделитель</InputLabel>
              <Select
                value={settings.prescaler || 128}
                label="Предделитель"
                onChange={(e) =>
                  handleSettingChange("prescaler", parseInt(e.target.value))
                }
              >
                {boardConfig?.peripherals.ADC?.prescalers?.map((prescaler) => (
                  <MenuItem key={prescaler} value={prescaler}>
                    {prescaler}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Режим</InputLabel>
              <Select
                value={settings.mode || "Single"}
                label="Режим"
                onChange={(e) => handleSettingChange("mode", e.target.value)}
              >
                {boardConfig?.peripherals.ADC?.modes?.map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode === "Single"
                      ? "Одиночное преобразование"
                      : "Непрерывное (Free Running)"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      );

    case "WATCHDOG":
      return (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Таймаут (ms)</InputLabel>
              <Select
                value={settings.timeout || ""}
                label="Таймаут (ms)"
                onChange={(e) =>
                  handleSettingChange(
                    "timeout",
                    e.target.value === "" ? undefined : parseInt(e.target.value)
                  )
                }
              >
                {boardConfig?.peripherals.WATCHDOG?.timeouts?.map((timeout) => (
                  <MenuItem key={timeout} value={timeout}>
                    {timeout}ms
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Режим</InputLabel>
              <Select
                value={settings.mode || ""}
                label="Режим"
                onChange={(e) =>
                  handleSettingChange(
                    "mode",
                    e.target.value === "" ? undefined : e.target.value
                  )
                }
              >
                <MenuItem value="Reset">Reset</MenuItem>
                <MenuItem value="Interrupt">Interrupt</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      );

    case "PCINT":
      return (
        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="body2">
            PCINT (Pin Change Interrupt) будет настроен автоматически для этого
            пина. Прерывание будет срабатывать при любом изменении состояния
            пина.
          </Typography>
        </Alert>
      );

    case "ANALOG_COMPARATOR": {
      const comparatorMode = settings.mode || "Interrupt";
      return (
        <>
          <Alert severity="info" sx={{ mt: 1 }}>
            <Typography variant="body2">
              Аналоговый компаратор сравнивает напряжение на AIN0 (PD6) и AIN1
              (PD7).
            </Typography>
          </Alert>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Режим работы</InputLabel>
                <Select
                  value={comparatorMode}
                  label="Режим работы"
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {boardConfig?.peripherals.ANALOG_COMPARATOR?.modes?.map(
                    (mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode === "Interrupt"
                          ? "Прерывание при изменении результата"
                          : mode === "Timer1Capture"
                            ? "Использовать с Timer1 Input Capture"
                            : mode}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {comparatorMode === "Timer1Capture" && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                В этом режиме компаратор используется как источник для Timer1
                Input Capture. Необходимо также настроить Timer1 в режиме Input
                Capture.
              </Typography>
            </Alert>
          )}
        </>
      );
    }

    default:
      return null;
  }
};

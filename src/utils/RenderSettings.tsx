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
} from "@mui/material";
import type { PinFunction, BoardConfig } from "../types/boardConfig";

interface RenderSettingsProps {
  func: PinFunction;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  boardConfig: BoardConfig | null;
}

export const RenderSettings: React.FC<RenderSettingsProps> = ({
  func,
  settings,
  onSettingChange,
  boardConfig,
}) => {
  const handleSettingChange = (key: string, value: any) => {
    onSettingChange(key, value);
  };

  switch (func.type) {
    case "GPIO":
      return (
        <>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Режим</InputLabel>
            <Select
              value={settings.mode || "INPUT"}
              label="Режим"
              onChange={(e) => handleSettingChange("mode", e.target.value)}
            >
              {func.modes?.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {settings.mode === "OUTPUT" && (
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Начальное состояние</InputLabel>
              <Select
                value={settings.initialState || "LOW"}
                label="Начальное состояние"
                onChange={(e) => handleSettingChange("initialState", e.target.value)}
              >
                <MenuItem value="LOW">LOW (0В)</MenuItem>
                <MenuItem value="HIGH">HIGH (5В)</MenuItem>
              </Select>
            </FormControl>
          )}
        </>
      );

    case "UART":
      return (
        <>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Скорость (baud)</InputLabel>
            <Select
              value={settings.baud || boardConfig?.peripherals.UART?.baudRates?.[0] || 9600}
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
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Биты данных</InputLabel>
            <Select
              value={settings.dataBits || 8}
              label="Биты данных"
              onChange={(e) => handleSettingChange("dataBits", e.target.value)}
            >
              {boardConfig?.peripherals.UART?.dataBits?.map((bits) => (
                <MenuItem key={bits} value={bits}>
                  {bits}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Стоп-биты</InputLabel>
            <Select
              value={settings.stopBits || 1}
              label="Стоп-биты"
              onChange={(e) => handleSettingChange("stopBits", e.target.value)}
            >
              {boardConfig?.peripherals.UART?.stopBits?.map((bits) => (
                <MenuItem key={bits} value={bits}>
                  {bits}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Паритет</InputLabel>
            <Select
              value={settings.parity || "None"}
              label="Паритет"
              onChange={(e) => handleSettingChange("parity", e.target.value)}
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
          {boardConfig?.peripherals.UART?.interrupts && (
            <>
              <Typography variant="body2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
                Прерывания:
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.enableRXInterrupt || false}
                    onChange={(e) =>
                      handleSettingChange("enableRXInterrupt", e.target.checked)
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
                      handleSettingChange("enableTXInterrupt", e.target.checked)
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
                      handleSettingChange("enableUDREInterrupt", e.target.checked)
                    }
                  />
                }
                label={
                  <Typography variant="body2">
                    UDRE (USART_UDRE_vect) - Прерывание при пустом регистре данных
                  </Typography>
                }
              />
            </>
          )}
        </>
      );

    case "SPI":
      return (
        <>
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
          {boardConfig?.peripherals.SPI?.enableInterrupt && (
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
          )}
        </>
      );

    case "I2C":
      return (
        <>
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
          {(settings.mode || "Master") === "Master" && (
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Скорость (Hz)</InputLabel>
              <Select
                value={settings.speed || 100000}
                label="Скорость (Hz)"
                onChange={(e) => handleSettingChange("speed", e.target.value)}
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
          )}
          {(settings.mode || "Master") === "Slave" &&
            boardConfig?.peripherals.I2C?.slaveAddressRange && (
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Адрес устройства (Slave Address)"
                value={settings.slaveAddress || 8}
                onChange={(e) => {
                  const addr = parseInt(e.target.value);
                  const [min, max] =
                    boardConfig?.peripherals.I2C?.slaveAddressRange || [8, 119];
                  if (addr >= min && addr <= max) {
                    handleSettingChange("slaveAddress", addr);
                  }
                }}
                inputProps={{
                  min: boardConfig?.peripherals.I2C?.slaveAddressRange?.[0] || 8,
                  max: boardConfig?.peripherals.I2C?.slaveAddressRange?.[1] || 119,
                }}
                sx={{ mt: 1 }}
                helperText={`Диапазон: ${boardConfig?.peripherals.I2C?.slaveAddressRange?.[0]}-${boardConfig?.peripherals.I2C?.slaveAddressRange?.[1]}`}
              />
            )}
          {boardConfig?.peripherals.I2C?.enableInterrupt && (
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
          )}
        </>
      );

    case "EXTERNAL_INTERRUPT":
      return (
        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
          <InputLabel>Триггер</InputLabel>
          <Select
            value={settings.trigger || "RISING"}
            label="Триггер"
            onChange={(e) => handleSettingChange("trigger", e.target.value)}
          >
            {func.triggers?.map((trigger) => (
              <MenuItem key={trigger} value={trigger}>
                {trigger}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case "TIMER0_PWM":
    case "TIMER1_PWM":
    case "TIMER2_PWM":
      return (
        <>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Предделитель</InputLabel>
            <Select
              value={settings.prescaler || 64}
              label="Предделитель"
              onChange={(e) =>
                handleSettingChange("prescaler", e.target.value)
              }
            >
              {boardConfig?.peripherals[
                func.type.replace("_PWM", "") as keyof typeof boardConfig.peripherals
              ]?.prescalers?.map((prescaler) => (
                <MenuItem key={prescaler} value={prescaler}>
                  {prescaler}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Duty Cycle"
            value={settings.dutyCycle || 128}
            onChange={(e) =>
              handleSettingChange("dutyCycle", parseInt(e.target.value))
            }
            sx={{ mt: 1 }}
          />
        </>
      );

    case "ADC":
      return (
        <>
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
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Предделитель</InputLabel>
            <Select
              value={settings.prescaler || 0}
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
        </>
      );

    case "WATCHDOG":
      return (
        <>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Таймаут (ms)</InputLabel>
            <Select
              value={settings.timeout || 2000}
              label="Таймаут (ms)"
              onChange={(e) =>
                handleSettingChange("timeout", parseInt(e.target.value))
              }
            >
              {boardConfig?.peripherals.WATCHDOG?.timeouts?.map((timeout) => (
                <MenuItem key={timeout} value={timeout}>
                  {timeout}ms
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Режим</InputLabel>
            <Select
              value={settings.mode || "Reset"}
              label="Режим"
              onChange={(e) => handleSettingChange("mode", e.target.value)}
            >
              <MenuItem value="Reset">Reset</MenuItem>
              <MenuItem value="Interrupt">Interrupt</MenuItem>
            </Select>
          </FormControl>
        </>
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

    case "ANALOG_COMPARATOR":
      return (
        <>
          <Alert severity="info" sx={{ mt: 1 }}>
            <Typography variant="body2">
              Аналоговый компаратор сравнивает напряжение на AIN0 (PD6) и AIN1
              (PD7). Прерывание будет срабатывать при изменении результата
              сравнения.
            </Typography>
          </Alert>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Режим прерывания</InputLabel>
            <Select
              value={settings.interruptMode || "Both"}
              label="Режим прерывания"
              onChange={(e) =>
                handleSettingChange("interruptMode", e.target.value)
              }
            >
              <MenuItem value="Both">Оба фронта</MenuItem>
              <MenuItem value="Rising">Восходящий фронт</MenuItem>
              <MenuItem value="Falling">Нисходящий фронт</MenuItem>
            </Select>
          </FormControl>
        </>
      );

    default:
      return null;
  }
};

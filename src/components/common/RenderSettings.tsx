import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  Box,
} from "@mui/material";
import type { PinFunction, PinSignal, PinConfig } from "@/types/boardConfig";
import {
  getPeripheryConfigValue,
  getPeripheryConfigDefault,
  getPeripheryConfigName,
  getPeripheryInterrupts,
  getPeriphery,
  getDependentFieldsToClean,
  settingsKeyToConfigKey,
} from "@/utils/config/boardConfigHelpers";
import { PeripheryRenderer } from "./PeripheryRenderer";

interface RenderSettingsProps {
  func: PinFunction | { type: string; modes?: string[] };
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

export const RenderSettings: React.FC<RenderSettingsProps> = ({
  func,
  settings,
  onSettingChange,
}) => {
  const handleSettingChange = (key: string, value: any) => {
    // Определяем, какие зависимые поля нужно очистить на основе конфига
    const configKey = settingsKeyToConfigKey(key);
    const dependentFields = getDependentFieldsToClean(
      func.type,
      configKey,
      value,
      settings
    );

    // Очищаем зависимые поля перед обновлением текущего поля
    dependentFields.forEach((fieldKey) => {
      onSettingChange(fieldKey, undefined);
    });

    // Обновляем текущее поле
    onSettingChange(key, value);
  };

  // Определяем, какие периферии можно рендерить универсально
  const universalPeripheries = [
    "GPIO",
    "UART",
    "SPI",
    "I2C",
    "ADC",
    "WATCHDOG",
    "EXTERNAL_INTERRUPT",
    "PCINT",
    "ANALOG_COMPARATOR",
  ];

  // Для универсальных периферий используем универсальный рендерер
  if (universalPeripheries.includes(func.type)) {
    return (
      <PeripheryRenderer
        peripheryName={func.type}
        settings={settings}
        onSettingChange={handleSettingChange}
      />
    );
  }

  switch (func.type) {
    case "TIMER0_PWM":
    case "TIMER1_PWM":
    case "TIMER2_PWM": {
      const modes = getPeripheryConfigValue("SPI", "modes");
      const speeds = getPeripheryConfigValue("SPI", "speeds");
      const cpol = getPeripheryConfigValue("SPI", "cpol");
      const cpha = getPeripheryConfigValue("SPI", "cpha");
      const interrupts = getPeripheryInterrupts("SPI");
      const enableInterrupt = getPeriphery("SPI")?.enableInterrupt;

      const defaultMode = getPeripheryConfigDefault("SPI", "modes");
      const defaultSpeed = getPeripheryConfigDefault("SPI", "speeds");
      const defaultCpol = getPeripheryConfigDefault("SPI", "cpol");
      const defaultCpha = getPeripheryConfigDefault("SPI", "cpha");

      const modesLabel = getPeripheryConfigName("SPI", "modes");
      const speedsLabel = getPeripheryConfigName("SPI", "speeds");
      const cpolLabel = getPeripheryConfigName("SPI", "cpol");
      const cphaLabel = getPeripheryConfigName("SPI", "cpha");

      return (
        <>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>{modesLabel}</InputLabel>
                <Select
                  value={settings.mode || defaultMode || ""}
                  label={modesLabel}
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {modes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>{speedsLabel}</InputLabel>
                <Select
                  value={settings.speed || defaultSpeed || ""}
                  label={speedsLabel}
                  onChange={(e) => handleSettingChange("speed", e.target.value)}
                >
                  {speeds.map((speed) => (
                    <MenuItem key={speed} value={speed}>
                      {speed}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>{cpolLabel}</InputLabel>
                <Select
                  value={
                    settings.cpol !== undefined
                      ? settings.cpol
                      : (defaultCpol ?? "")
                  }
                  label={cpolLabel}
                  onChange={(e) =>
                    handleSettingChange("cpol", parseInt(e.target.value))
                  }
                >
                  {cpol.map((cpolValue) => (
                    <MenuItem key={cpolValue} value={cpolValue}>
                      {cpolValue}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>{cphaLabel}</InputLabel>
                <Select
                  value={
                    settings.cpha !== undefined
                      ? settings.cpha
                      : (defaultCpha ?? "")
                  }
                  label={cphaLabel}
                  onChange={(e) =>
                    handleSettingChange("cpha", parseInt(e.target.value))
                  }
                >
                  {cpha.map((cphaValue) => (
                    <MenuItem key={cphaValue} value={cphaValue}>
                      {cphaValue}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {enableInterrupt && interrupts && (
            <Box sx={{ mt: 1 }}>
              {Object.entries(interrupts).map(([key, info]) => (
                <FormControlLabel
                  key={key}
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
                      {info.name} - {info.description}
                    </Typography>
                  }
                  sx={{ mt: 1 }}
                />
              ))}
            </Box>
          )}
        </>
      );
    }

    case "TIMER0_PWM":
    case "TIMER1_PWM":
    case "TIMER2_PWM": {
      const timerName = func.type.replace("_PWM", "");
      const modes = getPeripheryConfigValue(timerName, "modes");
      const prescalers = getPeripheryConfigValue(timerName, "prescalers");
      const interrupts = getPeripheryInterrupts(timerName);

      const defaultMode = getPeripheryConfigDefault(timerName, "modes");
      const selectedMode = settings.mode || defaultMode || "";
      const isPWM = selectedMode && selectedMode.includes("PWM");
      const isCTC = selectedMode === "CTC";
      const isNormal = selectedMode === "Normal";
      const isInputCapture = selectedMode === "InputCapture";
      const isTimer1 = timerName === "TIMER1";

      const modesLabel = getPeripheryConfigName(timerName, "modes");
      const prescalersLabel = getPeripheryConfigName(timerName, "prescalers");

      // Определяем максимальное значение для OCR в зависимости от таймера
      const maxOCRValue = timerName === "TIMER1" ? 65535 : 255;
      const defaultDutyCycle = timerName === "TIMER1" ? 32768 : 128;

      return (
        <>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{modesLabel}</InputLabel>
                <Select
                  value={selectedMode}
                  label={modesLabel}
                  onChange={(e) => handleSettingChange("mode", e.target.value)}
                >
                  {modes.map((mode: string) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{prescalersLabel}</InputLabel>
                <Select
                  value={
                    settings.prescaler ||
                    getPeripheryConfigDefault(timerName, "prescalers") ||
                    ""
                  }
                  label={prescalersLabel}
                  onChange={(e) =>
                    handleSettingChange(
                      "prescaler",
                      e.target.value === "" ? undefined : e.target.value
                    )
                  }
                >
                  {prescalers.map((prescaler: number) => (
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
                {interrupts?.COMPA && (
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
                      label={
                        <Typography variant="body2">
                          {interrupts.COMPA.name} -{" "}
                          {interrupts.COMPA.description}
                        </Typography>
                      }
                    />
                  </Box>
                )}
                {interrupts?.COMPB && (
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
                      label={
                        <Typography variant="body2">
                          {interrupts.COMPB.name} -{" "}
                          {interrupts.COMPB.description}
                        </Typography>
                      }
                    />
                  </Box>
                )}
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

            {isNormal && interrupts?.OVF && (
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
                  label={
                    <Typography variant="body2">
                      {interrupts.OVF.name} - {interrupts.OVF.description}
                    </Typography>
                  }
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
                {interrupts?.CAPT && (
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
                      label={
                        <Typography variant="body2">
                          {interrupts.CAPT.name} - {interrupts.CAPT.description}
                        </Typography>
                      }
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </>
      );
    }

    default:
      return null;
  }
};

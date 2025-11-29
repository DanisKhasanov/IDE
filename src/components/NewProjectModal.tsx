import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { BoardConfig, PinConfig, SelectedPinFunction, PinFunction } from "@/types/boardConfig";
import atmega328pConfigData from "@config/boards/atmega328p.json";
const atmega328pConfig = atmega328pConfigData as BoardConfig;

// Маппинг плат к конфигурациям микроконтроллеров
const BOARD_CONFIGS: Record<string, { name: string; mcu: string; config: BoardConfig }> = {
  uno: {
    name: "Arduino Uno",
    mcu: "atmega328p",
    config: atmega328pConfig as BoardConfig,
  },
};

const CPU_FREQUENCIES = [
  { value: "8000000L", label: "8 MHz" },
  { value: "16000000L", label: "16 MHz" },
  { value: "20000000L", label: "20 MHz" },
];

type NewProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onProjectCreate: (projectPath: string) => void;
};

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  open,
  onClose,
  onProjectCreate,
}) => {
  const [projectName, setProjectName] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>("uno");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("16000000L");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  // Храним только одну функцию на пин (ключ - pinName)
  const [selectedPinFunctions, setSelectedPinFunctions] = useState<Record<string, SelectedPinFunction>>({});
  const [conflicts, setConflicts] = useState<string[]>([]);

  const currentBoardConfig = BOARD_CONFIGS[selectedBoard]?.config;

  // Проверка конфликтов при изменении выбранных функций
  useEffect(() => {
    if (!currentBoardConfig) return;

    const detectedConflicts: string[] = [];
    const activeFunctions = Object.values(selectedPinFunctions);

    // Проверяем каждый конфликт из конфигурации
    currentBoardConfig.conflicts.forEach((conflict) => {
      const hasConflictTrigger = activeFunctions.some((func) => {
        if (conflict.when === "UART" && func.functionType === "UART") return true;
        if (conflict.when === "SPI_Master" && func.functionType === "SPI" && func.settings.mode === "Master") return true;
        if (conflict.when === "SPI_Slave" && func.functionType === "SPI" && func.settings.mode === "Slave") return true;
        if (conflict.when === "I2C" && func.functionType === "I2C") return true;
        return false;
      });

      if (hasConflictTrigger) {
        const conflictingPins = activeFunctions.filter((func) => {
          const pin = currentBoardConfig.pins.find((p) => p.name === func.pinName);
          return pin && conflict.pins.includes(pin.name);
        });

        if (conflictingPins.length > 0) {
          // Проверяем, действительно ли есть конфликт
          conflictingPins.forEach((func) => {
            const pin = currentBoardConfig.pins.find((p) => p.name === func.pinName);
            if (pin && conflict.conflictsWith.includes(func.functionType)) {
              detectedConflicts.push(`${conflict.description}: пин ${pin.arduinoName} (${pin.name})`);
            }
          });
        }
      }
    });

    setConflicts(detectedConflicts);
  }, [selectedPinFunctions, currentBoardConfig]);

  const handleSelectFolder = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.selectParentFolder) {
        console.error("selectParentFolder не доступен");
        return;
      }
      const result = await window.electronAPI.selectParentFolder();
      if (result) {
        setParentPath(result.path);
      }
    } catch (error) {
      console.error("Ошибка выбора папки:", error);
    }
  };

  const handleCreate = async () => {
    if (!parentPath || !projectName || !projectName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      if (!window.electronAPI || !window.electronAPI.createNewProject) {
        console.error("createNewProject не доступен");
        return;
      }

      // Подготавливаем конфигурацию пинов для передачи
      const pinConfig = {
        boardId: selectedBoard,
        fCpu: selectedFrequency,
        selectedPins: Object.values(selectedPinFunctions),
      };

      const project = await window.electronAPI.createNewProject(
        parentPath,
        projectName.trim(),
        pinConfig
      );
      if (project) {
        window.dispatchEvent(new CustomEvent("project-list-changed"));
        onProjectCreate(project.path);
        handleClose();
      }
    } catch (error) {
      console.error("Ошибка создания проекта:", error);
      alert(error instanceof Error ? error.message : "Ошибка создания проекта");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setProjectName("");
    setParentPath("");
    setIsCreating(false);
    setSelectedBoard("uno");
    setSelectedFrequency("16000000L");
    setSelectedPin(null);
    setSelectedPinFunctions({});
    setConflicts([]);
    onClose();
  };

  const handlePinClick = (pinName: string) => {
    setSelectedPin(pinName);
  };

  const handleFunctionSelect = (pinName: string, functionType: string, settings: Record<string, any>) => {
    // Проверяем, есть ли уже функция на этом пине
    const existingFunction = selectedPinFunctions[pinName];
    
    // Если уже есть функция на этом пине, заменяем её
    // (согласно документации: на один пин можно выбрать только одну активную функцию)
    setSelectedPinFunctions((prev) => ({
      ...prev,
      [pinName]: {
        pinName,
        functionType,
        settings,
      },
    }));

    // Показываем предупреждение, если заменяем функцию
    if (existingFunction && existingFunction.functionType !== functionType) {
      const pin = currentBoardConfig?.pins.find((p) => p.name === pinName);
      const pinDisplay = pin ? `${pin.arduinoName} (${pin.name})` : pinName;
      console.warn(`Функция ${existingFunction.functionType} на пине ${pinDisplay} заменена на ${functionType}`);
    }
  };

  const handleFunctionRemove = (pinName: string) => {
    setSelectedPinFunctions((prev) => {
      const newState = { ...prev };
      delete newState[pinName];
      return newState;
    });
  };

  const getPinFunctions = (pin: PinConfig): PinFunction[] => {
    return pin.functions || [];
  };

  const isPinFunctionSelected = (pinName: string, functionType: string): boolean => {
    const selectedFunc = selectedPinFunctions[pinName];
    return selectedFunc?.functionType === functionType;
  };

  const getSelectedFunctionSettings = (pinName: string, functionType: string): Record<string, any> | null => {
    const selectedFunc = selectedPinFunctions[pinName];
    if (selectedFunc?.functionType === functionType) {
      return selectedFunc.settings;
    }
    return null;
  };

  const getSelectedFunctionForPin = (pinName: string): SelectedPinFunction | null => {
    return selectedPinFunctions[pinName] || null;
  };

  // Компонент для настройки функции пина
  const PinFunctionSettings: React.FC<{
    pin: PinConfig;
    func: PinFunction;
    onSelect: (settings: Record<string, any>) => void;
    onRemove: () => void;
    isSelected: boolean;
    currentSettings: Record<string, any> | null;
  }> = ({ pin, func, onSelect, onRemove, isSelected, currentSettings }) => {
    const selectedFunc = getSelectedFunctionForPin(pin.name);
    const hasOtherFunction = selectedFunc && selectedFunc.functionType !== func.type;
    
    // Инициализация настроек по умолчанию
    const getDefaultSettings = (): Record<string, any> => {
      if (currentSettings) return currentSettings;
      if (func.type === "PCINT") return {};
      if (func.type === "ANALOG_COMPARATOR") return { interruptMode: "Both" };
      return {};
    };
    
    const [settings, setSettings] = useState<Record<string, any>>(getDefaultSettings);

    // Обновляем настройки при изменении currentSettings
    useEffect(() => {
      if (currentSettings) {
        setSettings(currentSettings);
      } else {
        // Сбрасываем на настройки по умолчанию
        if (func.type === "PCINT") {
          setSettings({});
        } else if (func.type === "ANALOG_COMPARATOR") {
          setSettings({ interruptMode: "Both" });
        } else {
          setSettings({});
        }
      }
    }, [currentSettings, func.type]);

    const handleSettingChange = (key: string, value: any) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      onSelect(newSettings);
    };

    const renderSettings = () => {
      switch (func.type) {
        case "GPIO":
          return (
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Режим</InputLabel>
              <Select
                value={settings.mode || "OUTPUT"}
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
          );

        case "UART":
          return (
            <>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Скорость (baud)</InputLabel>
                <Select
                  value={settings.baud || 9600}
                  label="Скорость (baud)"
                  onChange={(e) => handleSettingChange("baud", e.target.value)}
                >
                  {currentBoardConfig?.peripherals.UART?.baudRates?.map((rate) => (
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
                  {currentBoardConfig?.peripherals.UART?.dataBits?.map((bits) => (
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
                  {currentBoardConfig?.peripherals.UART?.stopBits?.map((bits) => (
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
                  {currentBoardConfig?.peripherals.UART?.parity?.map((parity) => (
                    <MenuItem key={parity} value={parity}>
                      {parity === "None" ? "Без паритета" : parity === "Even" ? "Чётный" : "Нечётный"}
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
                  {currentBoardConfig?.peripherals.UART?.modes?.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode === "Asynchronous" ? "Асинхронный" : "Синхронный"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {currentBoardConfig?.peripherals.UART?.interrupts && (
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
                  {currentBoardConfig?.peripherals.SPI?.modes?.map((mode) => (
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
                  {currentBoardConfig?.peripherals.SPI?.speeds?.map((speed) => (
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
                  onChange={(e) => handleSettingChange("cpol", parseInt(e.target.value))}
                >
                  {currentBoardConfig?.peripherals.SPI?.cpol?.map((cpol) => (
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
                  onChange={(e) => handleSettingChange("cpha", parseInt(e.target.value))}
                >
                  {currentBoardConfig?.peripherals.SPI?.cpha?.map((cpha) => (
                    <MenuItem key={cpha} value={cpha}>
                      {cpha === 0 ? "0 (Sample on Leading)" : "1 (Sample on Trailing)"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                  {currentBoardConfig?.peripherals.I2C?.modes?.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {settings.mode === "Master" && (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Скорость (Hz)</InputLabel>
                  <Select
                    value={settings.speed || 100000}
                    label="Скорость (Hz)"
                    onChange={(e) => handleSettingChange("speed", e.target.value)}
                  >
                    {currentBoardConfig?.peripherals.I2C?.speeds?.map((speed) => (
                      <MenuItem key={speed} value={speed}>
                        {typeof speed === 'number' ? `${speed / 1000}kHz` : `${speed}kHz`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {settings.mode === "Slave" && currentBoardConfig?.peripherals.I2C?.slaveAddressRange && (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Адрес устройства (Slave Address)"
                  value={settings.slaveAddress || 8}
                  onChange={(e) => {
                    const addr = parseInt(e.target.value);
                    const [min, max] = currentBoardConfig?.peripherals.I2C?.slaveAddressRange || [8, 119];
                    if (addr >= min && addr <= max) {
                      handleSettingChange("slaveAddress", addr);
                    }
                  }}
                  inputProps={{
                    min: currentBoardConfig?.peripherals.I2C?.slaveAddressRange?.[0] || 8,
                    max: currentBoardConfig?.peripherals.I2C?.slaveAddressRange?.[1] || 119,
                  }}
                  sx={{ mt: 1 }}
                  helperText={`Диапазон: ${currentBoardConfig?.peripherals.I2C?.slaveAddressRange?.[0]}-${currentBoardConfig?.peripherals.I2C?.slaveAddressRange?.[1]}`}
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
                  onChange={(e) => handleSettingChange("prescaler", e.target.value)}
                >
                  {currentBoardConfig?.peripherals[func.type.replace("_PWM", "") as keyof typeof currentBoardConfig.peripherals]?.prescalers?.map((prescaler) => (
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
                onChange={(e) => handleSettingChange("dutyCycle", parseInt(e.target.value))}
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
                  onChange={(e) => handleSettingChange("reference", e.target.value)}
                >
                  {currentBoardConfig?.peripherals.ADC?.reference?.map((ref) => (
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
                  onChange={(e) => handleSettingChange("prescaler", parseInt(e.target.value))}
                >
                  {currentBoardConfig?.peripherals.ADC?.prescalers?.map((prescaler) => (
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
                  {currentBoardConfig?.peripherals.ADC?.modes?.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode === "Single" ? "Одиночное преобразование" : "Непрерывное (Free Running)"}
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
                  onChange={(e) => handleSettingChange("timeout", parseInt(e.target.value))}
                >
                  {currentBoardConfig?.peripherals.WATCHDOG?.timeouts?.map((timeout) => (
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
                PCINT (Pin Change Interrupt) будет настроен автоматически для этого пина.
                Прерывание будет срабатывать при любом изменении состояния пина.
              </Typography>
            </Alert>
          );

        case "ANALOG_COMPARATOR":
          return (
            <>
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Аналоговый компаратор сравнивает напряжение на AIN0 (PD6) и AIN1 (PD7).
                  Прерывание будет срабатывать при изменении результата сравнения.
                </Typography>
              </Alert>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Режим прерывания</InputLabel>
                <Select
                  value={settings.interruptMode || "Both"}
                  label="Режим прерывания"
                  onChange={(e) => handleSettingChange("interruptMode", e.target.value)}
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

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
            <Typography>{func.type}</Typography>
            {isSelected && <Chip label="Активна" size="small" color="primary" />}
            {hasOtherFunction && !isSelected && (
              <Chip label="Заменит текущую" size="small" color="warning" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {hasOtherFunction && !isSelected && (
            <Alert severity="info" sx={{ mb: 2 }}>
              На этом пине уже выбрана функция {selectedFunc?.functionType}. 
              Выбор этой функции заменит текущую.
            </Alert>
          )}
          {renderSettings()}
          {isSelected ? (
            <Button
              variant="outlined"
              color="error"
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              onClick={onRemove}
            >
              Удалить функцию
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => onSelect(settings)}
            >
              {hasOtherFunction ? "Заменить функцию" : "Выбрать функцию"}
            </Button>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  if (!currentBoardConfig) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          width: "95%",
          maxWidth: "1600px",
          height: "90%",
          maxHeight: "900px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6">Новый проект</Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2, height: "calc(100% - 120px)", overflow: "hidden" }}>
        <Box sx={{ display: "flex", gap: 2, height: "100%" }}>
          {/* Левая панель - Выбор платы */}
          <Box
            sx={{
              width: "25%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              height: "100%",
              borderRight: 1,
              borderColor: "divider",
              pr: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Выбор платы
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="board-select-label">Плата</InputLabel>
              <Select
                labelId="board-select-label"
                value={selectedBoard}
                label="Плата"
                onChange={(e) => {
                  setSelectedBoard(e.target.value);
                  setSelectedPinFunctions({});
                  setSelectedPin(null);
                }}
              >
                {Object.entries(BOARD_CONFIGS).map(([id, board]) => (
                  <MenuItem key={id} value={id}>
                    {board.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Информация о плате:
              </Typography>
              <Typography variant="caption" display="block">
                MCU: {BOARD_CONFIGS[selectedBoard]?.mcu}
              </Typography>
              <Typography variant="caption" display="block">
                Пинов: {currentBoardConfig.pins.length}
              </Typography>
            </Box>
            <Box sx={{ mt: "auto", pt: 2 }}>
              <TextField
                label="Название проекта"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Введите название проекта"
              />
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  label="Родительская папка"
                  value={parentPath}
                  onChange={(e) => setParentPath(e.target.value)}
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Выберите папку для создания проекта"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<FolderIcon />}
                  onClick={handleSelectFolder}
                  fullWidth
                  size="small"
                >
                  Выбрать папку
                </Button>
              </Box>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="frequency-select-label">Частота CPU</InputLabel>
                <Select
                  labelId="frequency-select-label"
                  value={selectedFrequency}
                  label="Частота CPU"
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                >
                  {CPU_FREQUENCIES.map((freq) => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Центральная панель - Настройки выбранных пинов */}
          <Box
            sx={{
              width: "35%",
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
              <Typography variant="body2" color="text.secondary">
                Выберите пин справа для настройки функций
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {Object.entries(selectedPinFunctions).map(([pinName, func]) => {
                  const pin = currentBoardConfig.pins.find((p) => p.name === pinName);
                  if (!pin) return null;
                  const pinFunc = pin.functions.find((f) => f.type === func.functionType);
                  if (!pinFunc) return null;

                  return (
                    <Paper key={pinName} sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="subtitle2">
                          {pin.arduinoName} ({pin.name})
                        </Typography>
                        <Chip label={func.functionType} size="small" color="primary" />
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {Object.entries(func.settings).map(([settingKey, settingValue]) => (
                          <Typography key={settingKey} variant="caption">
                            <strong>{settingKey}:</strong> {String(settingValue)}
                          </Typography>
                        ))}
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        fullWidth
                        sx={{ mt: 1 }}
                        onClick={() => handleFunctionRemove(pinName)}
                      >
                        Удалить функцию
                      </Button>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Правая панель - Список пинов */}
          <Box
            sx={{
              width: "40%",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "auto",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
              Пины
            </Typography>
            <List>
              {currentBoardConfig.pins.map((pin) => (
                <React.Fragment key={pin.name}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={selectedPin === pin.name}
                      onClick={() => handlePinClick(pin.name)}
                    >
                      <ListItemText
                        primary={`${pin.arduinoName} (${pin.name})`}
                        secondary={`Порт: ${pin.port}, Бит: ${pin.bit}`}
                      />
                      {selectedPinFunctions[pin.name] && (
                        <Chip 
                          label={selectedPinFunctions[pin.name].functionType} 
                          size="small" 
                          color="primary" 
                          sx={{ ml: 1 }} 
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                  {selectedPin === pin.name && (
                    <Box sx={{ pl: 2, pr: 2, pb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                        Доступные функции:
                      </Typography>
                      {getPinFunctions(pin).map((func, idx) => (
                        <PinFunctionSettings
                          key={idx}
                          pin={pin}
                          func={func}
                          onSelect={(settings) =>
                            handleFunctionSelect(pin.name, func.type, settings)
                          }
                          onRemove={() => {
                            const selectedFunc = getSelectedFunctionForPin(pin.name);
                            if (selectedFunc) {
                              handleFunctionRemove(pin.name);
                            }
                          }}
                          isSelected={isPinFunctionSelected(pin.name, func.type)}
                          currentSettings={getSelectedFunctionSettings(pin.name, func.type)}
                        />
                      ))}
                    </Box>
                  )}
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isCreating}>
          Отмена
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!parentPath || !projectName || !projectName.trim() || isCreating}
        >
          {isCreating ? "Создание..." : "Создать проект"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;

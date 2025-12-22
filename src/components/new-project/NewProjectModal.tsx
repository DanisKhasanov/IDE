import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type {
  BoardConfig,
  SelectedPinFunction,
  PinConfig,
} from "@/types/boardConfig";
import { BoardSelectionPanel } from "./BoardSelectionPanel";
import { SelectedPinsPanel } from "./SelectedPinsPanel";
import { PinsListPanel } from "../common/PinsListPanel";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { loadBoardConfig } from "@/utils/config/loadBoardConfig";
import { useProjectConfiguration } from "@/hooks/project/useProjectConfiguration";
const CONTROLLER = loadBoardConfig();

// Маппинг плат к конфигурациям микроконтроллеров
const BOARD_CONFIGS: Record<
  string,
  { name: string; frequency: string; config: BoardConfig }
> = {
  uno: {
    name: CONTROLLER.name,
    frequency: CONTROLLER.frequency,
    config: CONTROLLER as BoardConfig,
  },
};

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
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>("");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [selectedFunctionType, setSelectedFunctionType] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const { showError, showWarning } = useSnackbar();

  const currentBoardConfig = BOARD_CONFIGS[selectedBoard]?.config;
  
  // Используем единый hook для управления настройками
  const {
    configuration,
    addOrUpdatePinFunction,
    removePinFunction,
    updatePeripheralSettingsOnAllPins,
    addOrUpdateTimer,
    removeTimer,
    getPeripheralPins,
    isPeripheralUsedInPins,
    getSelectedPinsForPeripheral,
    getCombinedPeripheralSettings,
    resetConfiguration,
  } = useProjectConfiguration(currentBoardConfig);
  
  // Деструктурируем для удобства использования
  const { selectedPinFunctions, timers } = configuration;
  
  // Функция для получения всех системных периферий из peripheries.json
  const getSystemPeripherals = (): string[] => {
    if (!currentBoardConfig) return [];
    
    // Возвращаем все периферии из конфига (кроме таймеров, которые обрабатываются отдельно)
    const peripheralsInConfig = Object.keys(currentBoardConfig.peripherals);
    
    // Исключаем таймеры, так как они обрабатываются в отдельном табе
    return peripheralsInConfig.filter((peripheral) => 
      !peripheral.startsWith("TIMER")
    );
  };

  // Функция для получения доступных таймеров (TIMER0, TIMER1, TIMER2)
  const getAvailableTimers = (): string[] => {
    if (!currentBoardConfig) return [];
    
    const timerNames = ["TIMER0", "TIMER1", "TIMER2"];
    return timerNames.filter((timerName) => {
      // Проверяем, есть ли таймер в конфигурации
      return currentBoardConfig.peripherals[timerName] !== undefined;
    });
  };

  // getPeripheralPins уже доступен из hook

  // Вывод всех настроек в консоль одним объектом
  useEffect(() => {
    const allSettings = {
      projectName,
      parentPath,
      selectedBoard,
      selectedFrequency,
      configuration: {
        selectedPinFunctions,
        timers,
      },
      conflicts,
      selectedPin,
      selectedFunctionType,
    };
    console.log("📦 Все настройки проекта:", allSettings);
  }, [
    projectName,
    parentPath,
    selectedBoard,
    selectedFrequency,
    selectedPinFunctions,
    timers,
    conflicts,
    selectedPin,
    selectedFunctionType,
  ]);

  // Проверка конфликтов при изменении выбранных функций
  useEffect(() => {
    if (!currentBoardConfig) return;

    const detectedConflicts: string[] = [];
    // Преобразуем Record<string, SelectedPinFunction[]> в плоский массив
    const activeFunctions = Object.values(selectedPinFunctions).flat();

    // Проверяем каждый конфликт из конфигурации
    currentBoardConfig.conflicts.forEach((conflict) => {
      const hasConflictTrigger = activeFunctions.some((func) => {
        if (conflict.when === "UART" && func.functionType === "UART")
          return true;
        if (
          conflict.when === "SPI_Master" &&
          func.functionType === "SPI" &&
          (func.settings.mode === "Master" || func.settings.mode === undefined)
        )
          return true;
        if (
          conflict.when === "SPI_Slave" &&
          func.functionType === "SPI" &&
          func.settings.mode === "Slave"
        )
          return true;
        if (conflict.when === "I2C" && func.functionType === "I2C") return true;
        return false;
      });

      if (hasConflictTrigger) {
        const conflictingPins = activeFunctions.filter((func) => {
          const pin = currentBoardConfig.pins.find(
            (p) => (p.id || p.pin) === func.pinName
          );
          const pinId = pin ? (pin.id || pin.pin) : "";
          return pin && conflict.pins.includes(pinId);
        });

        if (conflictingPins.length > 0) {
          // Проверяем, действительно ли есть конфликт
          conflictingPins.forEach((func) => {
            const pin = currentBoardConfig.pins.find(
              (p) => (p.id || p.pin) === func.pinName
            );
            if (pin && conflict.conflictsWith.includes(func.functionType)) {
              const pinId = pin.id || pin.pin || "";
              detectedConflicts.push(
                `${conflict.description}: пин ${pinId}`
              );
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
    if (!selectedBoard || !parentPath || !projectName || !projectName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      if (!window.electronAPI || !window.electronAPI.createNewProject) {
        console.error("createNewProject не доступен");
        return;
      }

      // Подготавливаем конфигурацию пинов для передачи
      // Преобразуем Record<string, SelectedPinFunction[]> в плоский массив
      const allSelectedPins = Object.values(selectedPinFunctions).flat();
      // Добавляем независимые таймеры (используем виртуальный pinName "TIMER")
      const timersArray = Object.entries(timers).map(([timerName, timer]) => ({
        ...timer,
        pinName: "TIMER", // Виртуальный pinName для независимых таймеров
        functionType: timerName, // Используем имя таймера как functionType
      }));
      const pinConfig = {
        boardId: selectedBoard,
        fCpu: selectedFrequency,
        selectedPins: [...allSelectedPins, ...timersArray],
      };

      const project = await window.electronAPI.createNewProject(
        parentPath,
        projectName.trim(),
        pinConfig
      );
      if (project) {
        window.dispatchEvent(new CustomEvent("project-list-changed"));
        // Отправляем событие для автоматического открытия main.cpp
        window.dispatchEvent(
          new CustomEvent("open-main-cpp", {
            detail: { projectPath: project.path },
          })
        );
        onProjectCreate(project.path);
        handleClose();
      }
    } catch (error) {
      console.error("Ошибка создания проекта:", error);
      showError(
        error instanceof Error ? error.message : "Ошибка создания проекта"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setProjectName("");
    setParentPath("");
    setIsCreating(false);
    setSelectedBoard(null);
    setSelectedFrequency("");
    setSelectedPin(null);
    setSelectedFunctionType(null);
    resetConfiguration();
    setConflicts([]);
    onClose();
  };

  const handlePinClick = (pinName: string) => {
    setSelectedPin(pinName);
  };

  // Функция для проверки совместимости функций
  const areFunctionsCompatible = (
    func1: string,
    func2: string,
    pin: PinConfig | undefined
  ): boolean => {
    if (!pin) return false;

    // Функции, которые всегда совместимы с другими
    const alwaysCompatible = ["PCINT", "EXTERNAL_INTERRUPT"];
    
    // Если одна из функций всегда совместима, они совместимы
    if (alwaysCompatible.includes(func1) || alwaysCompatible.includes(func2)) {
      return true;
    }

    // GPIO совместим с большинством функций (кроме тех, что конфликтуют)
    if (func1 === "GPIO" || func2 === "GPIO") {
      // Проверяем конфликты из конфигурации
      if (!currentBoardConfig) return true;
      
      for (const conflict of currentBoardConfig.conflicts) {
        const conflictPins = conflict.pins || [];
        const pinId = pin.id || pin.pin || "";
        if (!conflictPins.includes(pinId)) continue;
        
        const conflictsWith = conflict.conflictsWith || [];
        const otherFunc = func1 === "GPIO" ? func2 : func1;
        
        // Если другая функция конфликтует с GPIO на этом пине
        if (conflictsWith.includes("GPIO") && conflictsWith.includes(otherFunc)) {
          return false;
        }
      }
      return true;
    }

    // TIMER_PWM совместим с GPIO
    if (
      (func1.startsWith("TIMER") && func2 === "GPIO") ||
      (func2.startsWith("TIMER") && func1 === "GPIO")
    ) {
      return true;
    }

    // По умолчанию функции несовместимы, если не указано иное
    return false;
  };

  const handleFunctionSelect = (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => {
    const pin = currentBoardConfig?.pins.find((p) => (p.id || p.pin) === pinName);
    const existingFunctions = selectedPinFunctions[pinName] || [];

    // Проверяем, не выбрана ли уже эта функция
    const alreadySelected = existingFunctions.some(
      (f) => f.functionType === functionType
    );

    if (alreadySelected) {
      // Если функция уже выбрана, ничего не делаем
      return;
    }

    // Проверяем совместимость с существующими функциями
    const incompatible = existingFunctions.some(
      (existingFunc) =>
        !areFunctionsCompatible(functionType, existingFunc.functionType, pin)
    );

    if (incompatible) {
      const pinDisplay = pin ? (pin.id || pin.pin) : pinName;
      showWarning(
        `Функция ${functionType} несовместима с уже выбранными функциями на пине ${pinDisplay}`
      );
      return;
    }

    // Для SPI автоматически добавляем все 4 пина SPI с одинаковыми настройками
    if (functionType === "SPI") {
      const spiPins = getPeripheralPins("SPI");
      
      spiPins.forEach((spiPinName) => {
        const spiPin = currentBoardConfig?.pins.find((p) => (p.id || p.pin) === spiPinName);
        if (!spiPin) return;
        
        const spiPinFunctions = selectedPinFunctions[spiPinName] || [];
        
        // Проверяем, не выбрана ли уже SPI на этом пине
        const spiAlreadySelected = spiPinFunctions.some(
          (f) => f.functionType === "SPI"
        );
        
        if (!spiAlreadySelected) {
          // Проверяем совместимость с существующими функциями на этом пине
          const isIncompatible = spiPinFunctions.some(
            (existingFunc) =>
              !areFunctionsCompatible("SPI", existingFunc.functionType, spiPin)
          );
          
          if (!isIncompatible) {
            addOrUpdatePinFunction(spiPinName, "SPI", settings);
          }
        }
      });
      
      // Для SPI выбираем первый пин SPI и функцию SPI
      if (spiPins.length > 0) {
        setSelectedPin(spiPins[0]);
        setSelectedFunctionType("SPI");
      }
    } else if (functionType === "UART") {
      // Для UART автоматически добавляем оба пина (RX и TX) с одинаковыми настройками
      const uartPins = getPeripheralPins("UART");
      
      uartPins.forEach((uartPinName) => {
        const uartPin = currentBoardConfig?.pins.find((p) => (p.id || p.pin) === uartPinName);
        if (!uartPin) return;
        
        const uartPinFunctions = selectedPinFunctions[uartPinName] || [];
        
        // Проверяем, не выбрана ли уже UART на этом пине
        const uartAlreadySelected = uartPinFunctions.some(
          (f) => f.functionType === "UART"
        );
        
        if (!uartAlreadySelected) {
          // Проверяем совместимость с существующими функциями на этом пине
          const isIncompatible = uartPinFunctions.some(
            (existingFunc) =>
              !areFunctionsCompatible("UART", existingFunc.functionType, uartPin)
          );
          
          if (!isIncompatible) {
            addOrUpdatePinFunction(uartPinName, "UART", settings);
          }
        }
      });
      
      // Для UART выбираем первый пин UART и функцию UART
      if (uartPins.length > 0) {
        setSelectedPin(uartPins[0]);
        setSelectedFunctionType("UART");
      }
    } else if (functionType === "I2C") {
      // Для I2C автоматически добавляем оба пина (SDA и SCL) с одинаковыми настройками
      const i2cPins = getPeripheralPins("I2C");
      
      i2cPins.forEach((i2cPinName) => {
        const i2cPin = currentBoardConfig?.pins.find((p) => (p.id || p.pin) === i2cPinName);
        if (!i2cPin) return;
        
        const i2cPinFunctions = selectedPinFunctions[i2cPinName] || [];
        
        // Проверяем, не выбрана ли уже I2C на этом пине
        const i2cAlreadySelected = i2cPinFunctions.some(
          (f) => f.functionType === "I2C"
        );
        
        if (!i2cAlreadySelected) {
          // Проверяем совместимость с существующими функциями на этом пине
          const isIncompatible = i2cPinFunctions.some(
            (existingFunc) =>
              !areFunctionsCompatible("I2C", existingFunc.functionType, i2cPin)
          );
          
          if (!isIncompatible) {
            addOrUpdatePinFunction(i2cPinName, "I2C", settings);
          }
        }
      });
      
      // Для I2C выбираем первый пин I2C и функцию I2C
      if (i2cPins.length > 0) {
        setSelectedPin(i2cPins[0]);
        setSelectedFunctionType("I2C");
      }
    } else {
      // Для других функций добавляем только на выбранный пин
      addOrUpdatePinFunction(pinName, functionType, settings);
      // Автоматически выбираем добавленную функцию
      setSelectedPin(pinName);
      setSelectedFunctionType(functionType);
    }
  };

  const handleFunctionRemove = (pinName: string, functionType?: string) => {
    // Для SPI удаляем все 4 пина SPI одновременно
    if (functionType === "SPI") {
      const spiPins = getPeripheralPins("SPI");
      
      spiPins.forEach((spiPinName) => {
        removePinFunction(spiPinName, "SPI");
      });
      
      // Если удаляется выбранная функция SPI, сбрасываем выбор
      if (selectedPin && spiPins.includes(selectedPin) && selectedFunctionType === "SPI") {
        setSelectedPin(null);
        setSelectedFunctionType(null);
      }
      
      return;
    }
    
    // Для UART удаляем оба пина (RX и TX) одновременно
    if (functionType === "UART") {
      const uartPins = getPeripheralPins("UART");
      
      uartPins.forEach((uartPinName) => {
        removePinFunction(uartPinName, "UART");
      });
      
      // Если удаляется выбранная функция UART, сбрасываем выбор
      if (selectedPin && uartPins.includes(selectedPin) && selectedFunctionType === "UART") {
        setSelectedPin(null);
        setSelectedFunctionType(null);
      }
      
      return;
    }
    
    // Для I2C удаляем оба пина (SDA и SCL) одновременно
    if (functionType === "I2C") {
      const i2cPins = getPeripheralPins("I2C");
      
      i2cPins.forEach((i2cPinName) => {
        removePinFunction(i2cPinName, "I2C");
      });
      
      // Если удаляется выбранная функция I2C, сбрасываем выбор
      if (selectedPin && i2cPins.includes(selectedPin) && selectedFunctionType === "I2C") {
        setSelectedPin(null);
        setSelectedFunctionType(null);
      }
      
      return;
    }
    
    // Для других функций удаляем только с указанного пина
    const existingFunctions = selectedPinFunctions[pinName] || [];
    
    // Если указан тип функции, удаляем только её
    if (functionType) {
      const filtered = existingFunctions.filter(
        (f) => f.functionType !== functionType
      );
      
      // Если удаляется выбранная функция, сбрасываем или обновляем выбор
      if (selectedPin === pinName && selectedFunctionType === functionType) {
        if (filtered.length > 0) {
          // Выбираем первую оставшуюся функцию
          setSelectedFunctionType(filtered[0].functionType);
        } else {
          // Если функций не осталось, сбрасываем выбор
          setSelectedPin(null);
          setSelectedFunctionType(null);
        }
      }
      
      removePinFunction(pinName, functionType);
      return;
    }
    
    // Если тип не указан, удаляем все функции пина
    removePinFunction(pinName);
    
    // Если удаляется выбранный пин, сбрасываем выбор
    if (selectedPin === pinName) {
      setSelectedPin(null);
      setSelectedFunctionType(null);
    }
  };

  const handleFunctionSettingsUpdate = (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => {
    // Для SPI обновляем настройки на всех 4 пинах одновременно
    if (functionType === "SPI") {
      const spiPins = getPeripheralPins("SPI");
      spiPins.forEach((spiPinName) => {
        addOrUpdatePinFunction(spiPinName, "SPI", settings);
      });
      return;
    }
    
    // Для UART обновляем настройки на обоих пинах UART одновременно
    if (functionType === "UART") {
      const uartPins = getPeripheralPins("UART");
      uartPins.forEach((uartPinName) => {
        addOrUpdatePinFunction(uartPinName, "UART", settings);
      });
      return;
    }
    
    // Для I2C обновляем настройки на обоих пинах I2C одновременно
    if (functionType === "I2C") {
      const i2cPins = getPeripheralPins("I2C");
      i2cPins.forEach((i2cPinName) => {
        addOrUpdatePinFunction(i2cPinName, "I2C", settings);
      });
      return;
    }
    
    // Для других функций обновляем только на указанном пине
    addOrUpdatePinFunction(pinName, functionType, settings);
  };



  return (
    <Dialog
      open={open}
      onClose={handleClose} 
      fullWidth
      PaperProps={{
        sx: {
          maxWidth: "1800px",
          height: "100%",
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
        Новый проект
        <IconButton aria-label="close" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ overflow: "hidden" }}>
        <Box sx={{ display: "flex", gap: 2, height: "100%" }}>
          <BoardSelectionPanel
            selectedBoard={selectedBoard}
            boardConfigs={BOARD_CONFIGS}
            currentBoardConfig={currentBoardConfig}
            projectName={projectName}
            parentPath={parentPath}
            selectedFrequency={selectedFrequency}
            onBoardChange={(boardId) => {
              setSelectedBoard(boardId);
              // Обновляем частоту при смене платы
              if (boardId) {
                const boardConfig = BOARD_CONFIGS[boardId];
                if (boardConfig) {
                  setSelectedFrequency(boardConfig.frequency);
                }
              } else {
                setSelectedFrequency("");
              }
              resetConfiguration();
              setSelectedPin(null);
              setSelectedFunctionType(null);
            }}
            onProjectNameChange={setProjectName}
            onParentPathChange={setParentPath}
            onFrequencyChange={setSelectedFrequency}
            onSelectFolder={handleSelectFolder}
          />
          {!selectedBoard || !currentBoardConfig ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                Выберите плату 
              </Typography>
              <Typography variant="body2" color="text.secondary">
                После чего Вы сможете настроить проект
              </Typography>
            </Box>
          ) : (
            <>
              <SelectedPinsPanel
                selectedPinFunctions={selectedPinFunctions}
                timers={timers}
                conflicts={conflicts}
                boardConfig={currentBoardConfig ?? null}
                onRemoveFunction={handleFunctionRemove}
                onFunctionSettingsUpdate={handleFunctionSettingsUpdate}
                onPinFunctionAdd={addOrUpdatePinFunction}
                onPeripheralSettingsUpdate={updatePeripheralSettingsOnAllPins}
                onTimerAdd={addOrUpdateTimer}
                onTimerRemove={removeTimer}
                onTimerSettingsUpdate={addOrUpdateTimer}
                getSystemPeripherals={getSystemPeripherals}
                getAvailableTimers={getAvailableTimers}
                selectedPin={selectedPin}
                selectedFunctionType={selectedFunctionType}
              />
              <PinsListPanel
                boardConfig={currentBoardConfig ?? null}
                selectedPin={selectedPin}
                selectedPinFunctions={selectedPinFunctions}
                onPinClick={handlePinClick}
                onFunctionSelect={handleFunctionSelect}
              />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isCreating}>
          Отмена
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={
            !selectedBoard || !parentPath || !projectName || !projectName.trim() || isCreating
          }
        >
          {isCreating ? "Создание..." : "Создать проект"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;

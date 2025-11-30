import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type {
  BoardConfig,
  SelectedPinFunction,
  PinConfig,
  PinFunction,
} from "../types/boardConfig";
import { BoardSelectionPanel } from "./BoardSelectionPanel";
import { SelectedPinsPanel } from "./SelectedPinsPanel";
import { PinsListPanel } from "./PinsListPanel";
import atmega328pConfigData from "@config/boards/atmega328p.json";
const atmega328pConfig = atmega328pConfigData as BoardConfig;

// Маппинг плат к конфигурациям микроконтроллеров
const BOARD_CONFIGS: Record<
  string,
  { name: string; mcu: string; config: BoardConfig }
> = {
  uno: {
    name: "Arduino Uno",
    mcu: "atmega328p",
    config: atmega328pConfig as BoardConfig,
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
  const [selectedBoard, setSelectedBoard] = useState<string>("uno");
  const [selectedFrequency, setSelectedFrequency] =
    useState<string>("16000000L");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  // Храним массив функций на пин (ключ - pinName, значение - массив функций)
  const [selectedPinFunctions, setSelectedPinFunctions] = useState<
    Record<string, SelectedPinFunction[]>
  >({});
  const [conflicts, setConflicts] = useState<string[]>([]);

  const currentBoardConfig = BOARD_CONFIGS[selectedBoard]?.config;

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
            (p) => p.name === func.pinName
          );
          return pin && conflict.pins.includes(pin.name);
        });

        if (conflictingPins.length > 0) {
          // Проверяем, действительно ли есть конфликт
          conflictingPins.forEach((func) => {
            const pin = currentBoardConfig.pins.find(
              (p) => p.name === func.pinName
            );
            if (pin && conflict.conflictsWith.includes(func.functionType)) {
              detectedConflicts.push(
                `${conflict.description}: пин ${pin.arduinoName} (${pin.name})`
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
      // Преобразуем Record<string, SelectedPinFunction[]> в плоский массив
      const allSelectedPins = Object.values(selectedPinFunctions).flat();
      const pinConfig = {
        boardId: selectedBoard,
        fCpu: selectedFrequency,
        selectedPins: allSelectedPins,
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
        if (!conflictPins.includes(pin.name)) continue;
        
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
    const pin = currentBoardConfig?.pins.find((p) => p.name === pinName);
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
      const pinDisplay = pin ? `${pin.arduinoName} (${pin.name})` : pinName;
      alert(
        `Функция ${functionType} несовместима с уже выбранными функциями на пине ${pinDisplay}`
      );
      return;
    }

    // Для SPI автоматически добавляем все 4 пина SPI с одинаковыми настройками
    if (functionType === "SPI" && currentBoardConfig?.peripherals?.SPI?.pins) {
      const spiPins = currentBoardConfig.peripherals.SPI.pins;
      const updatedFunctions: Record<string, SelectedPinFunction[]> = { ...selectedPinFunctions };
      
      spiPins.forEach((spiPinName) => {
        const spiPin = currentBoardConfig?.pins.find((p) => p.name === spiPinName);
        if (!spiPin) return;
        
        const spiPinFunctions = updatedFunctions[spiPinName] || [];
        
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
            updatedFunctions[spiPinName] = [
              ...spiPinFunctions,
              {
                pinName: spiPinName,
                functionType: "SPI",
                settings, // Используем те же настройки для всех пинов SPI
              },
            ];
          }
        }
      });
      
      setSelectedPinFunctions(updatedFunctions);
    } else {
      // Для других функций добавляем только на выбранный пин
      setSelectedPinFunctions((prev) => ({
        ...prev,
        [pinName]: [
          ...existingFunctions,
          {
            pinName,
            functionType,
            settings,
          },
        ],
      }));
    }
  };

  const handleFunctionRemove = (pinName: string, functionType?: string) => {
    setSelectedPinFunctions((prev) => {
      // Для SPI удаляем все 4 пина SPI одновременно
      if (functionType === "SPI" && currentBoardConfig?.peripherals?.SPI?.pins) {
        const spiPins = currentBoardConfig.peripherals.SPI.pins;
        const newState = { ...prev };
        
        spiPins.forEach((spiPinName) => {
          const existingFunctions = newState[spiPinName] || [];
          const filtered = existingFunctions.filter(
            (f) => f.functionType !== "SPI"
          );
          
          if (filtered.length === 0) {
            delete newState[spiPinName];
          } else {
            newState[spiPinName] = filtered;
          }
        });
        
        return newState;
      }
      
      // Для других функций удаляем только с указанного пина
      const existingFunctions = prev[pinName] || [];
      
      // Если указан тип функции, удаляем только её
      if (functionType) {
        const filtered = existingFunctions.filter(
          (f) => f.functionType !== functionType
        );
        if (filtered.length === 0) {
          const newState = { ...prev };
          delete newState[pinName];
          return newState;
        }
        return {
          ...prev,
          [pinName]: filtered,
        };
      }
      
      // Если тип не указан, удаляем все функции пина
      const newState = { ...prev };
      delete newState[pinName];
      return newState;
    });
  };

  const handleFunctionSettingsUpdate = (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => {
    setSelectedPinFunctions((prev) => {
      // Для SPI обновляем настройки на всех 4 пинах одновременно
      if (functionType === "SPI" && currentBoardConfig?.peripherals?.SPI?.pins) {
        const spiPins = currentBoardConfig.peripherals.SPI.pins;
        const newState = { ...prev };
        
        spiPins.forEach((spiPinName) => {
          const existingFunctions = newState[spiPinName] || [];
          const functionIndex = existingFunctions.findIndex(
            (f) => f.functionType === "SPI"
          );
          
          if (functionIndex !== -1) {
            const updatedFunctions = [...existingFunctions];
            updatedFunctions[functionIndex] = {
              ...updatedFunctions[functionIndex],
              settings, // Обновляем настройки на всех пинах SPI
            };
            newState[spiPinName] = updatedFunctions;
          }
        });
        
        return newState;
      }
      
      // Для других функций обновляем только на указанном пине
      const existingFunctions = prev[pinName] || [];
      const functionIndex = existingFunctions.findIndex(
        (f) => f.functionType === functionType
      );

      if (functionIndex === -1) return prev;

      const updatedFunctions = [...existingFunctions];
      updatedFunctions[functionIndex] = {
        ...updatedFunctions[functionIndex],
        settings,
      };

      return {
        ...prev,
        [pinName]: updatedFunctions,
      };
    });
  };

  const getPinFunctions = (pin: PinConfig): PinFunction[] => {
    return pin.functions || [];
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
          maxWidth: "1600px",
          height: "90%",
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
              setSelectedPinFunctions({});
              setSelectedPin(null);
            }}
            onProjectNameChange={setProjectName}
            onParentPathChange={setParentPath}
            onFrequencyChange={setSelectedFrequency}
            onSelectFolder={handleSelectFolder}
          />
          <SelectedPinsPanel
            selectedPinFunctions={selectedPinFunctions}
            conflicts={conflicts}
            boardConfig={currentBoardConfig}
            onRemoveFunction={handleFunctionRemove}
            onFunctionSettingsUpdate={handleFunctionSettingsUpdate}
          />
          <PinsListPanel
            boardConfig={currentBoardConfig}
            selectedPin={selectedPin}
            selectedPinFunctions={selectedPinFunctions}
            onPinClick={handlePinClick}
            onFunctionSelect={handleFunctionSelect}
            getPinFunctions={getPinFunctions}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isCreating}>
          Отмена
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={
            !parentPath || !projectName || !projectName.trim() || isCreating
          }
        >
          {isCreating ? "Создание..." : "Создать проект"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;

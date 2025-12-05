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
} from "@/types/boardConfig";
import { BoardSelectionPanel } from "./BoardSelectionPanel";
import { SelectedPinsPanel } from "./SelectedPinsPanel";
import { PinsListPanel } from "./PinsListPanel";
import atmega328pConfigData from "@config/boards/atmega328p.json";
const atmega328pConfig = atmega328pConfigData as unknown as BoardConfig;

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
  const [selectedFunctionType, setSelectedFunctionType] = useState<string | null>(null);
  // Храним массив функций на пин (ключ - pinName, значение - массив функций)
  const [selectedPinFunctions, setSelectedPinFunctions] = useState<
    Record<string, SelectedPinFunction[]>
  >({});
  // Храним системные периферии (не привязанные к пинам) - ключ: functionType, значение: SelectedPinFunction
  const [systemPeripherals, setSystemPeripherals] = useState<
    Record<string, SelectedPinFunction>
  >({});
  const [conflicts, setConflicts] = useState<string[]>([]);

  const currentBoardConfig = BOARD_CONFIGS[selectedBoard]?.config;
  
  // Функция для определения системных периферий (те, что есть в peripherals, но не привязаны к пинам)
  const getSystemPeripherals = (): string[] => {
    if (!currentBoardConfig) return [];
    
    const peripheralsInConfig = Object.keys(currentBoardConfig.peripherals);
    const peripheralsOnPins = new Set<string>();
    
    // Собираем все типы периферий, которые есть на пинах
    currentBoardConfig.pins.forEach((pin) => {
      pin.functions.forEach((func) => {
        peripheralsOnPins.add(func.type);
        
        // Обрабатываем специальные случаи: TIMER0_PWM -> TIMER0, TIMER1_PWM -> TIMER1, TIMER2_PWM -> TIMER2
        if (func.type.startsWith("TIMER") && func.type.includes("_PWM")) {
          const timerName = func.type.split("_PWM")[0]; // Извлекаем TIMER0, TIMER1, TIMER2
          peripheralsOnPins.add(timerName);
        }
      });
    });
    
    // Системные периферии - те, что в конфигурации, но не на пинах
    return peripheralsInConfig.filter((peripheral) => !peripheralsOnPins.has(peripheral));
  };

  // Вспомогательная функция для получения пинов периферии из массива pins
  const getPeripheralPins = (functionType: string): string[] => {
    if (!currentBoardConfig) return [];
    
    return currentBoardConfig.pins
      .filter((pin) => 
        pin.functions.some((func) => func.type === functionType)
      )
      .map((pin) => pin.pin);
  };

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
            (p) => p.pin === func.pinName
          );
          return pin && conflict.pins.includes(pin.pin);
        });

        if (conflictingPins.length > 0) {
          // Проверяем, действительно ли есть конфликт
          conflictingPins.forEach((func) => {
            const pin = currentBoardConfig.pins.find(
              (p) => p.pin === func.pinName
            );
            if (pin && conflict.conflictsWith.includes(func.functionType)) {
              detectedConflicts.push(
                `${conflict.description}: пин ${pin.pin}`
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
      // Добавляем системные периферии (используем виртуальный pinName "SYSTEM")
      const systemPeripheralsArray = Object.values(systemPeripherals).map((peripheral) => ({
        ...peripheral,
        pinName: "SYSTEM", // Виртуальный pinName для системных периферий
      }));
      const pinConfig = {
        boardId: selectedBoard,
        fCpu: selectedFrequency,
        selectedPins: [...allSelectedPins, ...systemPeripheralsArray],
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
    setSelectedFunctionType(null);
    setSelectedPinFunctions({});
    setSystemPeripherals({});
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
        if (!conflictPins.includes(pin.pin)) continue;
        
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
    const pin = currentBoardConfig?.pins.find((p) => p.pin === pinName);
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
      const pinDisplay = pin ? pin.pin : pinName;
      alert(
        `Функция ${functionType} несовместима с уже выбранными функциями на пине ${pinDisplay}`
      );
      return;
    }

    // Для SPI автоматически добавляем все 4 пина SPI с одинаковыми настройками
    if (functionType === "SPI") {
      const spiPins = getPeripheralPins("SPI");
      const updatedFunctions: Record<string, SelectedPinFunction[]> = { ...selectedPinFunctions };
      
      spiPins.forEach((spiPinName) => {
        const spiPin = currentBoardConfig?.pins.find((p) => p.pin === spiPinName);
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
      // Для SPI выбираем первый пин SPI и функцию SPI
      if (spiPins.length > 0) {
        setSelectedPin(spiPins[0]);
        setSelectedFunctionType("SPI");
      }
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
      // Автоматически выбираем добавленную функцию
      setSelectedPin(pinName);
      setSelectedFunctionType(functionType);
    }
  };

  const handleFunctionRemove = (pinName: string, functionType?: string) => {
    setSelectedPinFunctions((prev) => {
      // Для SPI удаляем все 4 пина SPI одновременно
      if (functionType === "SPI") {
        const spiPins = getPeripheralPins("SPI");
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
        
        // Если удаляется выбранная функция SPI, сбрасываем выбор
        if (selectedPin && spiPins.includes(selectedPin) && selectedFunctionType === "SPI") {
          setSelectedPin(null);
          setSelectedFunctionType(null);
        }
        
        return newState;
      }
      
      // Для других функций удаляем только с указанного пина
      const existingFunctions = prev[pinName] || [];
      
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
      
      // Если удаляется выбранный пин, сбрасываем выбор
      if (selectedPin === pinName) {
        setSelectedPin(null);
        setSelectedFunctionType(null);
      }
      
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
      if (functionType === "SPI") {
        const spiPins = getPeripheralPins("SPI");
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
              setSystemPeripherals({});
              setSelectedPin(null);
              setSelectedFunctionType(null);
            }}
            onProjectNameChange={setProjectName}
            onParentPathChange={setParentPath}
            onFrequencyChange={setSelectedFrequency}
            onSelectFolder={handleSelectFolder}
          />
          <SelectedPinsPanel
            selectedPinFunctions={selectedPinFunctions}
            systemPeripherals={systemPeripherals}
            conflicts={conflicts}
            boardConfig={currentBoardConfig}
            onRemoveFunction={handleFunctionRemove}
            onFunctionSettingsUpdate={handleFunctionSettingsUpdate}
            onSystemPeripheralAdd={(functionType: string, settings: Record<string, unknown>) => {
              setSystemPeripherals((prev) => ({
                ...prev,
                [functionType]: {
                  pinName: "", // Пустой pinName для системных периферий
                  functionType,
                  settings,
                },
              }));
            }}
            onSystemPeripheralRemove={(functionType: string) => {
              setSystemPeripherals((prev) => {
                const newState = { ...prev };
                delete newState[functionType];
                return newState;
              });
            }}
            onSystemPeripheralSettingsUpdate={(functionType: string, settings: Record<string, unknown>) => {
              setSystemPeripherals((prev) => ({
                ...prev,
                [functionType]: {
                  ...prev[functionType],
                  settings,
                },
              }));
            }}
            getSystemPeripherals={getSystemPeripherals}
            selectedPin={selectedPin}
            selectedFunctionType={selectedFunctionType}
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

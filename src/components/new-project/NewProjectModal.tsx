import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type {
  BoardConfig,
  SelectedPinFunction,
  PinConfig,
} from "@/types/boardConfig";
import { BoardSelectionTab } from "./BoardSelectionTab";
import { PeripheralsTab } from "./PeripheralsTab";
import { SystemPeripheralsTab } from "./SystemPeripheralsTab";
import { TimersTab } from "./TimersTab";
import { PinsListPanel } from "../common/PinsListPanel";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { getBoardInfo, getPins, getConflicts, peripheriesJson, systemPeripheriesJson } from "@/utils/config/boardConfigHelpers";
import { useProjectConfiguration } from "@/hooks/project/useProjectConfiguration";

// Маппинг плат к конфигурациям микроконтроллеров
const BOARD_INFO = getBoardInfo();
const BOARD_CONFIGS: Record<
  string,
  { name: string; frequency: string; config: any }
> = {
  uno: {
    name: BOARD_INFO.name,
    frequency: BOARD_INFO.frequency,
    config: {
      id: BOARD_INFO.id,
      name: BOARD_INFO.name,
      frequency: BOARD_INFO.frequency,
      image: BOARD_INFO.image,
      pins: getPins(),
      peripherals: peripheriesJson,
      conflicts: getConflicts(),
    },
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
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2 | 3>(0); // 0 - плата, 1 - периферии, 2 - системные периферии, 3 - таймеры
  const { showError, showWarning } = useSnackbar();

  const currentBoardConfig = BOARD_CONFIGS[selectedBoard]?.config;
  
  // Используем единый hook для управления настройками
  const {
    configuration,
    selectedPin,
    selectedPeripheral,
    selectPin,
    selectPeripheral,
    selectPinAndPeripheral,
    addOrUpdatePinFunction,
    removePinFunction,
    addPinFunctionWithAutoSelect,
    removePinFunctionWithAutoSelect,
    addOrUpdateTimer,
    removeTimer,
    addOrUpdateSystemPeripheral,
    removeSystemPeripheral,
    getPeripheralPins,
    isPeripheralUsedInPins,
    resetAll,
  } = useProjectConfiguration(currentBoardConfig);
  
  // Деструктурируем для удобства использования
  const { selectedPinFunctions, timers, systemPeripherals } = configuration;
  
  // Вычисляемые значения для управления вкладками
  const hasTimers = Object.keys(timers).length > 0;
  const isFolderSelected = !!parentPath && parentPath.trim() !== "";
  const isProjectNameEntered = !!projectName && projectName.trim() !== "";
  const isProjectInfoComplete = isFolderSelected && isProjectNameEntered;

  // Сбрасываем активную вкладку на "Проект", если папка или название проекта не заполнены
  useEffect(() => {
    if (!isProjectInfoComplete && activeTab !== 0) {
      setActiveTab(0);
    }
  }, [isProjectInfoComplete, activeTab]);

  // Сбрасываем выбранную периферию при переключении табов
  useEffect(() => {
    // При переключении на таб "Периферии" или "Системные периферии" сбрасываем выбор, если он не относится к этому табу
    if (activeTab === 1 && currentBoardConfig) {
      const systemPeripherals = getSystemPeripherals();
      if (selectedPeripheral && !systemPeripherals.includes(selectedPeripheral)) {
        selectPeripheral(null);
      }
    } else if (activeTab === 2 && currentBoardConfig) {
      const systemPeripheralsList = getSystemPeripheralsList();
      if (selectedPeripheral && !systemPeripheralsList.includes(selectedPeripheral)) {
        selectPeripheral(null);
      }
    } else if (activeTab === 3) {
      // При переключении на таб "Таймеры" сбрасываем выбор периферии
      selectPeripheral(null);
    }
  }, [activeTab, currentBoardConfig, selectedPeripheral, selectPeripheral]);
  
  // Функция для получения всех системных периферий из peripheries.json
  const getSystemPeripherals = (): string[] => {
    if (!currentBoardConfig) return [];
    
    // Возвращаем все периферии из конфига (кроме таймеров, которые обрабатываются отдельно)
    const peripheralsInConfig = Object.keys(peripheriesJson);
    
    // Исключаем таймеры, так как они обрабатываются в отдельном табе
    return peripheralsInConfig.filter((peripheral) => 
      !peripheral.startsWith("TIMER")
    );
  };

  // Функция для получения системных периферий из systemPeripheries.json (для таба "Системные периферии")
  const getSystemPeripheralsList = (): string[] => {
    if (!currentBoardConfig) return [];
    
    // Возвращаем все системные периферии из systemPeripheries.json
    return Object.keys(systemPeripheriesJson);
  };

  // Функция для получения доступных таймеров (TIMER0, TIMER1, TIMER2)
  const getAvailableTimers = (): string[] => {
    if (!currentBoardConfig) return [];
    
    const timerNames = ["TIMER0", "TIMER1", "TIMER2"];
    return timerNames.filter((timerName) => {
      // Проверяем, есть ли таймер в конфигурации
      return peripheriesJson[timerName as keyof typeof peripheriesJson] !== undefined;
    });
  };

  // Проверка конфликтов при изменении выбранных функций
  useEffect(() => {
    if (!currentBoardConfig) return;

    const detectedConflicts: string[] = [];
    // Преобразуем Record<string, SelectedPinFunction[]> в плоский массив
    const activeFunctions = Object.values(selectedPinFunctions).flat();

    // Проверяем каждый конфликт из конфигурации
    const conflicts = getConflicts();
    const pins = getPins();
    conflicts.forEach((conflict: any) => {
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
          const pin = pins.find(
            (p: PinConfig) => (p.id || p.pin) === func.pinName
          );
          const pinId = pin ? (pin.id || pin.pin) : "";
          return pin && conflict.pins.includes(pinId);
        });

        if (conflictingPins.length > 0) {
          // Проверяем, действительно ли есть конфликт
          conflictingPins.forEach((func) => {
            const pin = pins.find(
              (p: PinConfig) => (p.id || p.pin) === func.pinName
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

  // Вывод в консоль данных по выбранным пинам, периферии и т.д.
  useEffect(() => {
    console.log("Конфигурация проекта:", {
      selectedBoard,
      selectedFrequency,
      selectedPin,
      selectedPeripheral,
      selectedPinFunctions,
      timers,
      systemPeripherals,
      conflicts,
    });
  }, [
    selectedBoard,
    selectedFrequency,
    selectedPin,
    selectedPeripheral,
    selectedPinFunctions,
    timers,
    systemPeripherals,
    conflicts,
  ]);

 
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
      // Добавляем системные периферии (используем виртуальный pinName "SYSTEM")
      const systemPeripheralsArray = Object.entries(systemPeripherals).map(([peripheralName, peripheral]) => ({
        ...peripheral,
        pinName: "SYSTEM", // Виртуальный pinName для системных периферий
        functionType: peripheralName, // Используем имя периферии как functionType
      }));
      const pinConfig = {
        boardId: selectedBoard,
        fCpu: selectedFrequency,
        selectedPins: [...allSelectedPins, ...timersArray, ...systemPeripheralsArray],
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
    resetAll();
    setConflicts([]);
    onClose();
  };

  const handlePinClick = (pinName: string) => {
    // При клике на пин определяем периферию, которую он использует
    const pinFunctions = selectedPinFunctions[pinName] || [];
    if (pinFunctions.length > 0) {
      // Выбираем первую функцию как активную периферию
      selectPinAndPeripheral(pinName, pinFunctions[0].functionType);
    } else {
      // Если функций нет, просто выбираем пин
      selectPin(pinName);
    }
  };

  const handleFunctionSelect = (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => {
    // Проверяем, существует ли уже функция для этого пина
    const pinFunctions = selectedPinFunctions[pinName] || [];
    const functionExists = pinFunctions.some(
      (f) => f.functionType === functionType
    );
    
    if (functionExists) {
      // Если функция уже существует, обновляем её настройки
      addOrUpdatePinFunction(pinName, functionType, settings);
      // Обновляем выбор пина и периферии для визуального выделения
      selectPinAndPeripheral(pinName, functionType);
    } else {
      // Если функции нет, добавляем её с автоматическим выбором связанных пинов
      addPinFunctionWithAutoSelect(pinName, functionType, settings, showWarning);
    }
  };

  const handleFunctionRemove = (pinName: string, functionType?: string) => {
    removePinFunctionWithAutoSelect(pinName, functionType);
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
          {/* Левая панель с настройками */}
          <Box
            sx={{
              width: "70%",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              borderRight: 1,
              borderColor: "divider",
              pr: 2,
              overflow: "hidden",
            }}
          >
            {/* Заголовок и конфликты */}
            <Box>
              {conflicts.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
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
            </Box>

            {/* Вкладки */}
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => {
                // Не позволяем переключаться на другие вкладки, если папка или название проекта не заполнены
                if (!isProjectInfoComplete && newValue !== 0) {
                  return;
                }
                setActiveTab(newValue as 0 | 1 | 2 | 3);
              }}
              sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
            >
              <Tab label="Проект" />
              <Tab label="Периферии" disabled={!isProjectInfoComplete} />
              <Tab
                label="Системные периферии"
                disabled={!isProjectInfoComplete}
              />
              <Tab
                label="Таймеры"
                disabled={!isProjectInfoComplete}
              />
            </Tabs>

            {/* Контент вкладок */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              {activeTab === 0 ? (
                <BoardSelectionTab
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
                    resetAll();
                  }}
                  onProjectNameChange={setProjectName}
                  onParentPathChange={setParentPath}
                  onFrequencyChange={setSelectedFrequency}
                  onSelectFolder={handleSelectFolder}
                />
              ) : activeTab === 1 ? (
                <PeripheralsTab
                  selectedPinFunctions={selectedPinFunctions}
                  boardConfig={currentBoardConfig ?? null}
                  selectedPin={selectedPin}
                  selectedPeripheral={selectedPeripheral}
                  onPinSelect={selectPin}
                  onPeripheralSelect={selectPeripheral}
                  onPinFunctionAdd={(pinName, functionType, settings) => {
                    // Проверяем, существует ли уже функция для этого пина
                    const pinFunctions = selectedPinFunctions[pinName] || [];
                    const functionExists = pinFunctions.some(
                      (f) => f.functionType === functionType
                    );
                    
                    if (functionExists) {
                      // Если функция уже существует, обновляем её настройки
                      addOrUpdatePinFunction(pinName, functionType, settings);
                    } else {
                      // Если функции нет, добавляем её с автоматическим выбором связанных пинов
                      addPinFunctionWithAutoSelect(pinName, functionType, settings, showWarning);
                    }
                  }}
                  onPinFunctionRemove={removePinFunctionWithAutoSelect}
                  onPinFunctionRemoveSimple={removePinFunction}
                  getSystemPeripherals={getSystemPeripherals}
                  isPeripheralUsedInPins={isPeripheralUsedInPins}
                />
              ) : activeTab === 2 ? (
                <SystemPeripheralsTab
                  systemPeripherals={systemPeripherals}
                  boardConfig={currentBoardConfig ?? null}
                  selectedPeripheral={selectedPeripheral}
                  onPeripheralSelect={selectPeripheral}
                  onSystemPeripheralAdd={addOrUpdateSystemPeripheral}
                  onSystemPeripheralRemove={removeSystemPeripheral}
                  getSystemPeripherals={getSystemPeripheralsList}
                  isSystemPeripheralUsed={(peripheralName) =>
                    !!systemPeripherals[peripheralName]
                  }
                />
              ) : (
                <TimersTab
                  timers={timers}
                  boardConfig={currentBoardConfig ?? null}
                  onTimerAdd={addOrUpdateTimer}
                  onTimerRemove={removeTimer}
                  onTimerSettingsUpdate={addOrUpdateTimer}
                  getAvailableTimers={getAvailableTimers}
                />
              )}
            </Box>
          </Box>

          {/* Правая панель с пинами */}
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
            <PinsListPanel
              boardConfig={currentBoardConfig ?? null}
              selectedPin={selectedPin}
              selectedPinFunctions={selectedPinFunctions}
              onPinClick={handlePinClick}
              onFunctionSelect={handleFunctionSelect}
              onFunctionRemove={handleFunctionRemove}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isCreating}>
          Отмена
        </Button>
        <Button
          onClick={
            activeTab === 0
              ? () => setActiveTab(1)
              : activeTab === 1
              ? () => setActiveTab(2)
              : activeTab === 2
              ? () => setActiveTab(3)
              : handleCreate
          }
          variant="contained"
          disabled={
            activeTab === 0
              ? !isProjectInfoComplete || !selectedBoard
              : !selectedBoard || !parentPath || !projectName || !projectName.trim() || isCreating
          }
        >
          {activeTab === 0 || activeTab === 1 || activeTab === 2
            ? "Далее"
            : isCreating
            ? "Создание..."
            : "Создать проект"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;

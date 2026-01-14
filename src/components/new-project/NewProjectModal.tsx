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
import type { SelectedPinFunction, PinConfig, ConflictRule } from "@/types/boardConfig";
import { BoardSelectionTab } from "./BoardSelectionTab";
import { PeripheralsTab } from "./PeripheralsTab";
import { SystemPeripheralsTab } from "./SystemPeripheralsTab";
import { PinsListPanel } from "../common/PinsListPanel";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  getBoardInfo,
  getPins,
  getConflicts,
  getPinPeripheries,
  getSystemPeripheries,
} from "@/utils/config/boardConfigHelpers";
import { useProjectConfiguration } from "@/hooks/project/useProjectConfiguration";

// Маппинг плат к конфигурациям микроконтроллеров
const BOARD_INFO = getBoardInfo();
const BOARD_CONFIGS: Record<
  string,
  { name: string; fcpuOptions?: string[]; defaultFcpu: string; config: any }
> = {
  uno: {
    name: BOARD_INFO.name,
    fcpuOptions: BOARD_INFO.fcpuOptions,
    defaultFcpu: BOARD_INFO.frequency, // defaultFcpu из конфига
    config: {
      id: BOARD_INFO.id,
      name: BOARD_INFO.name,
      frequency: BOARD_INFO.frequency,
      image: BOARD_INFO.image,
      pins: getPins(),
      peripherals: {}, // Периферии теперь получаются динамически через getPinPeripheries/getSystemPeripheries
      conflicts: getConflicts(),
    },
  },
};

type NewProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onProjectCreate: (projectPath: string) => void;
};

const NewProjectModal = ({
  open,
  onClose,
  onProjectCreate,
}: NewProjectModalProps) => {
  const [projectName, setProjectName] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>("");
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
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
    addOrUpdateSystemPeripheral,
    removeSystemPeripheral,
    isPeripheralUsedInPins,
    resetAll,
  } = useProjectConfiguration(currentBoardConfig);

  // Деструктурируем для удобства использования
  const { peripherals } = configuration;

  // Вычисляемые значения для управления вкладками
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
      if (
        selectedPeripheral &&
        !systemPeripherals.includes(selectedPeripheral)
      ) {
        selectPeripheral(null);
      }
    } else if (activeTab === 2 && currentBoardConfig) {
      const systemPeripheralsList = getSystemPeripheralsList();
      if (
        selectedPeripheral &&
        !systemPeripheralsList.includes(selectedPeripheral)
      ) {
        selectPeripheral(null);
      }
    }
  }, [activeTab, currentBoardConfig, selectedPeripheral, selectPeripheral]);

  // Функция для получения всех периферий с пинами (kind === "pin")
  const getSystemPeripherals = (): string[] => {
    if (!currentBoardConfig) return [];

    // Возвращаем все периферии с пинами из нового конфига
    return getPinPeripheries();
  };

  // Функция для получения системных периферий (kind === "global") для таба "Системные периферии"
  const getSystemPeripheralsList = (): string[] => {
    if (!currentBoardConfig) return [];

    return getSystemPeripheries();
  };

  // Проверка конфликтов при изменении выбранных функций
  useEffect(() => {
    if (!currentBoardConfig) return;

    const detectedConflicts: string[] = [];
    // Получаем все активные функции из новой структуры
    const activeFunctions: SelectedPinFunction[] = [];
    Object.entries(peripherals).forEach(([peripheralName, peripheral]) => {
      if ("pins" in peripheral && peripheral.pins) {
        // Периферии с пинами
        Object.entries(peripheral.pins).forEach(([pinName, settings]) => {
          activeFunctions.push({
            pinName,
            functionType: peripheralName,
            settings,
          });
        });
      }
    });

    // Проверяем каждый конфликт из конфигурации
    const conflicts = getConflicts();
    const pins = getPins();

    conflicts.forEach((conflict: ConflictRule) => {
      // Проверяем, активна ли периферия, которая вызывает конфликт И использует пины из конфликта
      const conflictPeripheryFunctions = activeFunctions.filter((func) => {
        // Проверяем тип периферии
        if (func.functionType !== conflict.periphery) return false;
        return true;
      });

      // Проверяем, действительно ли периферия использует пины из конфликта
      const conflictPinsInUse = conflict.pins.filter((reservedPinId: string) => {
        return conflictPeripheryFunctions.some((func) => {
          const pin = pins.find(
            (p: PinConfig) => (p.id || p.pin) === func.pinName
          );
          const pinId = pin ? pin.id || pin.pin : "";
          return pinId === reservedPinId;
        });
      });

      // Если периферия не использует пины из конфликта, пропускаем проверку
      if (conflictPinsInUse.length === 0) return;

      // Если конфликт активен, проверяем, есть ли конфликтующие периферии на зарезервированных пинах
      conflictPinsInUse.forEach((reservedPinId: string) => {
        // Находим функции на этом пине
        const functionsOnPin = activeFunctions.filter((func) => {
          const pin = pins.find(
            (p: PinConfig) => (p.id || p.pin) === func.pinName
          );
          const pinId = pin ? pin.id || pin.pin : "";
          return pinId === reservedPinId;
        });

        // Проверяем, есть ли на этом пине функции из списка конфликтующих периферий
        const conflictingFunctions = functionsOnPin.filter((func) => {
          // Если указан список периферий, проверяем только их
          if (conflict.peripherals && conflict.peripherals.length > 0) {
            return conflict.peripherals.includes(func.functionType);
          }
          // Если список не указан, проверяем любую другую функцию
          return func.functionType !== conflict.periphery;
        });

        if (conflictingFunctions.length > 0) {
          detectedConflicts.push(
            `${conflict.description}: пин ${reservedPinId}`
          );
        }
      });
    });

    setConflicts(detectedConflicts);
  }, [peripherals, currentBoardConfig]);

  //================
  // Вывод в консоль данных по выбранным пинам, периферии и т.д.
  useEffect(() => {
    console.log("Конфигурация проекта:", {
      selectedBoard,
      selectedFrequency,
      selectedPin,
      selectedPeripheral,
      peripherals,
      conflicts,
    });
  }, [
    selectedBoard,
    selectedFrequency,
    selectedPin,
    selectedPeripheral,
    peripherals,
    conflicts,
  ]);
  //================

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

      // Подготавливаем конфигурацию для передачи
      // Новая структура уже в нужном формате
      // Добавляем суффикс "L" к частоте, если его нет (формат для компилятора)
      const fCpuValue = selectedFrequency.endsWith("L") 
        ? selectedFrequency 
        : `${selectedFrequency}L`;
      
      const pinConfig = {
        boardId: selectedBoard,
        fCpu: fCpuValue,
        peripherals: peripherals,
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
    // Ищем первую периферию с этим пином
    for (const [peripheralName, peripheral] of Object.entries(peripherals)) {
      if ("pins" in peripheral && peripheral.pins?.[pinName]) {
        selectPinAndPeripheral(pinName, peripheralName);
        return;
      }
    }
    // Если функций нет, просто выбираем пин
    selectPin(pinName);
  };

  const handleFunctionSelect = (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => {
    // Проверяем, существует ли уже функция для этого пина
    const peripheral = peripherals[functionType];
    const functionExists =
      peripheral && "pins" in peripheral && peripheral.pins?.[pinName];

    if (functionExists) {
      // Если функция уже существует, обновляем её настройки
      addOrUpdatePinFunction(pinName, functionType, settings);
      // Обновляем выбор пина и периферии для визуального выделения
      selectPinAndPeripheral(pinName, functionType);
    } else {
      // Если функции нет, добавляем её с автоматическим выбором связанных пинов
      addPinFunctionWithAutoSelect(
        pinName,
        functionType,
        settings,
        showWarning
      );
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
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", mb: 1 }}
                  >
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
                setActiveTab(newValue as 0 | 1 | 2);
              }}
              sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
            >
              <Tab label="Проект" />
              <Tab label="Периферии" disabled={!isProjectInfoComplete} />
              <Tab
                label="Системные периферии"
                disabled={!isProjectInfoComplete}
              />
            </Tabs>

            {/* Контент вкладок */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minHeight: 0,
              }}
            >
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
                        // Используем defaultFcpu из конфига как значение по умолчанию
                        setSelectedFrequency(boardConfig.defaultFcpu);
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
                  peripherals={peripherals}
                  boardConfig={currentBoardConfig ?? null}
                  selectedPin={selectedPin}
                  selectedPeripheral={selectedPeripheral}
                  onPinSelect={selectPin}
                  onPeripheralSelect={selectPeripheral}
                  onPinFunctionAdd={(pinName, functionType, settings) => {
                    // Проверяем, существует ли уже функция для этого пина
                    const peripheral = peripherals[functionType];
                    const functionExists =
                      peripheral &&
                      "pins" in peripheral &&
                      peripheral.pins?.[pinName];

                    if (functionExists) {
                      // Если функция уже существует, обновляем её настройки
                      addOrUpdatePinFunction(pinName, functionType, settings);
                    } else {
                      // Если функции нет, добавляем её с автоматическим выбором связанных пинов
                      addPinFunctionWithAutoSelect(
                        pinName,
                        functionType,
                        settings,
                        showWarning
                      );
                    }
                  }}
                  onPinFunctionRemove={removePinFunctionWithAutoSelect}
                  onPinFunctionRemoveSimple={removePinFunction}
                  getSystemPeripherals={getSystemPeripherals}
                  isPeripheralUsedInPins={isPeripheralUsedInPins}
                />
              ) : (
                <SystemPeripheralsTab
                  peripherals={peripherals}
                  selectedPeripheral={selectedPeripheral}
                  onPeripheralSelect={selectPeripheral}
                  onSystemPeripheralAdd={addOrUpdateSystemPeripheral}
                  onSystemPeripheralRemove={removeSystemPeripheral}
                  getSystemPeripherals={getSystemPeripheralsList}
                  isSystemPeripheralUsed={(peripheralName) => {
                    return !!peripherals[peripheralName];
                  }}
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
              peripherals={peripherals || {}}
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
                : handleCreate
          }
          variant="contained"
          disabled={
            activeTab === 0
              ? !isProjectInfoComplete || !selectedBoard
              : !selectedBoard ||
                !parentPath ||
                !projectName ||
                !projectName.trim() ||
                isCreating
          }
        >
          {activeTab === 0 || activeTab === 1
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

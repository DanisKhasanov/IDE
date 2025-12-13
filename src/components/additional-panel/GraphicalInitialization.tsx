import { useState, useEffect } from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PinsListPanel } from "../common/PinsListPanel";
import type {
  BoardConfig,
  PinConfig,
  PinFunction,
  SelectedPinFunction,
} from "@/types/boardConfig";
import atmega328pConfigData from "@config/boards/atmega328p.json";

const atmega328pConfig = atmega328pConfigData as unknown as BoardConfig;

interface GraphicalInitializationProps {
  currentProjectPath?: string | null;
  onClose?: () => void;
}

const GraphicalInitialization: React.FC<GraphicalInitializationProps> = ({
  currentProjectPath,
  onClose,
}) => {
  const [boardConfig] = useState<BoardConfig>(atmega328pConfig);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [selectedPinFunctions] = useState<
    Record<string, SelectedPinFunction[]>
  >({});

  // Загрузка конфигурации пинов из проекта (если есть)
  useEffect(() => {
    // TODO: Загрузить конфигурацию пинов из проекта, если она сохранена
    // Пока используем пустую конфигурацию
  }, [currentProjectPath]);

  const handlePinClick = (pinName: string) => {
    setSelectedPin(pinName);
  };

  const handleFunctionSelect = () => {
    // В режиме просмотра не добавляем функции, только показываем информацию
    // Можно добавить логику для редактирования в будущем
  };

  const getPinFunctions = (pin: PinConfig): PinFunction[] => {
    // Исключаем PCINT из списка доступных функций
    return (pin.functions || []).filter((func) => func.type !== "PCINT");
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {onClose && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              opacity: 0.6,
              "&:hover": {
                opacity: 1,
                backgroundColor: "error.main",
                color: "error.contrastText",
              },
            }}
            title="Скрыть панель графической инициализации"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          "& > *": {
            width: "100%",
            maxWidth: "100%",
          },
        }}
      >
        <PinsListPanel
          boardConfig={boardConfig}
          selectedPin={selectedPin}
          selectedPinFunctions={selectedPinFunctions}
          onPinClick={handlePinClick}
          onFunctionSelect={handleFunctionSelect}
          getPinFunctions={getPinFunctions}
          size="small"
        />
      </Box>
    </Box>
  );
};

export default GraphicalInitialization;

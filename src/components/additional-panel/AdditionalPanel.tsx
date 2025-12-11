import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { PinsListPanel } from "../PinsListPanel";
import { GuiPanel } from "./GuiPanel";
import type {
  BoardConfig,
  PinConfig,
  PinFunction,
  SelectedPinFunction,
} from "@/types/boardConfig";
import atmega328pConfigData from "@config/boards/atmega328p.json";

const atmega328pConfig = atmega328pConfigData as unknown as BoardConfig;

interface AdditionalPanelProps {
  currentProjectPath?: string | null;
}

const AdditionalPanel: React.FC<AdditionalPanelProps> = ({
  currentProjectPath,
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
      }}
    >
      {/* Верхняя секция - GUI */}
      <Box
        sx={{
          height: "50%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <GuiPanel />
      </Box>

      {/* Нижняя секция - Контроллер */}
      <Box
        sx={{
          height: "50%",
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

export default AdditionalPanel;

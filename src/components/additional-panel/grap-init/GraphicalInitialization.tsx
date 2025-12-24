import { useState, useEffect } from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PinsListPanel } from "@/components/common/PinsListPanel";
import type {
  SelectedPinFunction,
} from "@/types/boardConfig";
import { getBoardInfo, getPins, getConflicts, peripheriesJson } from "@/utils/config/boardConfigHelpers";

const boardConfig = {
  id: getBoardInfo().id,
  name: getBoardInfo().name,
  frequency: getBoardInfo().frequency,
  image: getBoardInfo().image,
  pins: getPins(),
  peripherals: peripheriesJson,
  conflicts: getConflicts(),
};

interface GraphicalInitializationProps {
  currentProjectPath?: string | null;
  onClose?: () => void;
}

const GraphicalInitialization: React.FC<GraphicalInitializationProps> = ({
  currentProjectPath,
  onClose,
}) => {
  const [boardConfigState] = useState(boardConfig);
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
          size="small"
        />
      </Box>
    </Box>
  );
};

export default GraphicalInitialization;

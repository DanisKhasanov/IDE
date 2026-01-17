import { useMemo, useState, useEffect, useRef } from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { PinsListPanel } from "@/components/common/PinsListPanel";
import InitProjectModal from "@/components/init-project/InitProjectModal";
import { getBoardInfo, getPins, getConflicts } from "@/utils/config/boardConfigHelpers";

interface GraphicalInitializationProps {
  currentProjectPath?: string | null;
  onClose?: () => void;
}

const GraphicalInitialization: React.FC<GraphicalInitializationProps> = ({
  currentProjectPath,
  onClose,
}) => {
  // Важно: не вычислять boardConfig на уровне модуля — UI-конфиг подгружается async.
  const boardConfig = useMemo(() => {
    const info = getBoardInfo();
    return {
      id: info.id,
      name: info.name,
      frequency: info.frequency,
      image: info.image,
      pins: getPins(),
      peripherals: {}, // Периферии теперь получаются динамически
      conflicts: getConflicts(),
    };
  }, []);

  const [boardConfigState] = useState(boardConfig);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectConfig, setProjectConfig] = useState<{
    boardId: string;
    fCpu: string;
    peripherals: Record<string, any>;
  } | null>(null);
  
  // Используем ref для отслеживания актуального пути проекта и предотвращения race condition
  const currentProjectPathRef = useRef<string | null | undefined>(currentProjectPath);

  // Загрузка конфигурации пинов из проекта (если есть)
  useEffect(() => {
    // Обновляем ref при изменении currentProjectPath
    currentProjectPathRef.current = currentProjectPath;
    
    // Сбрасываем конфигурацию при смене проекта
    setProjectConfig(null);
    
    const loadProjectConfig = async () => {
      const projectPathToLoad = currentProjectPathRef.current;
      
      if (projectPathToLoad && window.electronAPI?.getProjectConfiguration) {
        try {
          const config = await window.electronAPI.getProjectConfiguration(projectPathToLoad);
          
          // Проверяем, что путь проекта не изменился во время загрузки
          if (currentProjectPathRef.current === projectPathToLoad && config) {
            setProjectConfig(config);
          }
        } catch (error) {
          console.error("Ошибка загрузки конфигурации проекта:", error);
          // Если произошла ошибка, сбрасываем конфигурацию
          if (currentProjectPathRef.current === projectPathToLoad) {
            setProjectConfig(null);
          }
        }
      }
    };

    loadProjectConfig();
  }, [currentProjectPath]);

  const handlePinClick = (pinName: string) => {
    setSelectedPin(pinName);
  };

  const handleFunctionSelect = () => {
    // В режиме просмотра не добавляем функции, только показываем информацию
    // Можно добавить логику для редактирования в будущем
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
  };

  const handleEditProjectCreate = async (projectPath: string) => {
    // После сохранения конфигурации перезагружаем её
    if (currentProjectPath && window.electronAPI?.getProjectConfiguration) {
      try {
        const config = await window.electronAPI.getProjectConfiguration(currentProjectPath);
        if (config) {
          setProjectConfig(config);
        }
      } catch (error) {
        console.error("Ошибка загрузки конфигурации проекта:", error);
      }
    }
    setIsEditModalOpen(false);
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
      <Box
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          zIndex: 1,
          display: "flex",
          gap: 0.5,
        }}
      >
        {currentProjectPath && (
          <IconButton
            size="small"
            onClick={handleEditClick}
            title="Редактировать настройки проекта"
            sx={{ p: 0.5 }}
          >
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        )}
        {onClose && (
          <IconButton
            size="small"
            onClick={onClose}
            title="Скрыть панель графической инициализации"
            sx={{ p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
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
          boardConfig={boardConfigState}
          selectedPin={selectedPin}
          peripherals={projectConfig?.peripherals || {}}
          onPinClick={handlePinClick}
          onFunctionSelect={handleFunctionSelect}
          size="small"
          readOnly={true}
        />
      </Box>

      {/* Модальное окно редактирования настроек проекта */}
      {currentProjectPath && (
        <InitProjectModal
          open={isEditModalOpen}
          onClose={handleEditModalClose}
          onProjectCreate={handleEditProjectCreate}
          editMode={true}
          editProjectPath={currentProjectPath}
          initialConfig={projectConfig}
        />
      )}
    </Box>
  );
};

export default GraphicalInitialization;

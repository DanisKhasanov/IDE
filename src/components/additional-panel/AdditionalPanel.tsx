import { Box } from "@mui/material";
import { GuiPanel } from "./GuiPanel";
import GraphicalInitialization from "./GraphicalInitialization";

interface AdditionalPanelProps {
  currentProjectPath?: string | null;
  isGuiPanelVisible: boolean;
  isGraphicalInitVisible: boolean;
  hideGuiPanel: () => Promise<void>;
  hideGraphicalInit: () => Promise<void>;
}

const AdditionalPanel: React.FC<AdditionalPanelProps> = ({
  currentProjectPath,
  isGuiPanelVisible,
  isGraphicalInitVisible,
  hideGuiPanel,
  hideGraphicalInit,
}) => {

  // Если обе панели скрыты, не рендерим ничего
  if (!isGuiPanelVisible && !isGraphicalInitVisible) {
    return null;
  }

  // Вычисляем высоты панелей
  const getGuiPanelHeight = () => {
    if (!isGuiPanelVisible) return "0%";
    if (!isGraphicalInitVisible) return "100%";
    return "50%";
  };

  const getGraphicalInitHeight = () => {
    if (!isGraphicalInitVisible) return "0%";
    if (!isGuiPanelVisible) return "100%";
    return "50%";
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
      {isGuiPanelVisible && (
        <Box
          sx={{
            height: getGuiPanelHeight(),
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderBottom: isGraphicalInitVisible ? "1px solid" : "none",
            borderColor: "divider",
            transition: "height 0.2s ease-in-out",
          }}
        >
          <GuiPanel onClose={hideGuiPanel} />
        </Box>
      )}

      {/* Нижняя секция - Графическая инициализация */}
      {isGraphicalInitVisible && (
        <Box
          sx={{
            height: getGraphicalInitHeight(),
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            "& > *": {
              width: "100%",
              maxWidth: "100%",
            },
            transition: "height 0.2s ease-in-out",
          }}
        >
          <GraphicalInitialization
            currentProjectPath={currentProjectPath}
            onClose={hideGraphicalInit}
          />
        </Box>
      )}
    </Box>
  );
};

export default AdditionalPanel;

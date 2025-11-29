import { useState } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  IconButton,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@mui/material";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import CodeEditorPanel from "@components/CodeEditorPanel";
import InfoPanel from "@components/InfoPanel";
import ProjectTree from "@components/ProjectTree";
import ArduinoToolbar from "@components/ArduinoToolbar";
import NewProjectModal from "@src/components/InitProject/NewProjectModal";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import TerminalIcon from "@mui/icons-material/Terminal";
import {
  useTheme,
  useTerminal,
  useProjectMenu,
  useFileHandler,
  useNewProjectModal,
} from "@hooks/index";

const App = () => {
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(
    null
  );
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  //Выбор темы
  const { mode, theme, toggleMode } = useTheme();
  //Выбор видимости терминала
  const { isTerminalVisible, toggleTerminal } = useTerminal({
    currentProjectPath,
  });
  //Обработка открытия файлов
  const { handleFileOpen, setFileHandler } = useFileHandler();
  //Обработка открытия проекта
  useProjectMenu({ onProjectOpen: setCurrentProjectPath });
  //Обработка создания нового проекта
  const { isOpen, handleClose, handleProjectCreate } = useNewProjectModal({
    onProjectCreate: setCurrentProjectPath,
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        display="flex"
        flexDirection="column"
        height="100vh"
        bgcolor={theme.palette.background.default}
      >
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              IDE Prototype
            </Typography>
            <IconButton
              color="inherit"
              onClick={toggleTerminal}
              aria-label={
                isTerminalVisible ? "Скрыть терминал" : "Показать терминал"
              }
            >
              <TerminalIcon />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={toggleMode}
              aria-label={
                mode === "light"
                  ? "Включить тёмную тему"
                  : "Включить светлую тему"
              }
            >
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Toolbar>
          {/* Панель инструментов Arduino */}
          <ArduinoToolbar currentProjectPath={currentProjectPath} />
        </AppBar>
        <Box
          component="main"
          display="flex"
          flexGrow={1}
          overflow="hidden"
          bgcolor={theme.palette.background.paper}
        >
          <PanelGroup direction="horizontal">
            {/* Дерево проектов */}
            <Panel defaultSize={14} minSize={15} maxSize={40}>
              <Box display="flex" height="100%">
                <ProjectTree
                  onFileOpen={handleFileOpen}
                  onProjectPathChange={setCurrentProjectPath}
                  activeFilePath={activeFilePath}
                />
              </Box>
            </Panel>

            <PanelResizeHandle />

            {/* Редактор кода */}
            <Panel defaultSize={52} minSize={35}>
              <Box display="flex" height="100%">
                <CodeEditorPanel
                  onFileOpenRequest={setFileHandler}
                  currentProjectPath={currentProjectPath}
                  onActiveFileChange={setActiveFilePath}
                  isTerminalVisible={isTerminalVisible}
                  onTerminalClose={toggleTerminal}
                />
              </Box>
            </Panel>

            <PanelResizeHandle />

            {/* Информация о проекте */}
            <Panel defaultSize={24} minSize={15} maxSize={45}>
              <Box display="flex" height="100%">
                <InfoPanel />
              </Box>
            </Panel>
          </PanelGroup>
        </Box>
      </Box>
      
      {/* Модальное окно создания нового проекта */}
      <NewProjectModal
        open={isOpen}
        onClose={handleClose}
        onProjectCreate={handleProjectCreate}
      />
    </ThemeProvider>
  );
};

export default App;

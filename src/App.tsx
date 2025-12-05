import { useState, useEffect, useRef } from "react";
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
import NewProjectModal from "@/components/NewProjectModal";
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

import type { CompilationProblem } from "@components/ProblemsTab";
import { parseCompilationErrors } from "@utils/CompilationErrorParser";

const App = () => {
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(
    null
  );
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [compilationProblems, setCompilationProblems] = useState<
    CompilationProblem[]
  >([]);
  const [terminalActiveTab, setTerminalActiveTab] = useState<
    "terminal" | "problems"
  >("terminal");
  //Выбор темы
  const { mode, theme, toggleMode } = useTheme();
  //Выбор видимости терминала
  const { isTerminalVisible, toggleTerminal } = useTerminal({
    currentProjectPath,
  });
  //Обработка открытия файлов
  const { handleFileOpen, setFileHandler } = useFileHandler();
  //Обработка открытия проекта
  useProjectMenu({
    onProjectOpen: (path) => {
      setCurrentProjectPath(path);
      // Очищаем проблемы при смене проекта
      setCompilationProblems([]);
      setTerminalActiveTab("terminal");
    },
  });

  // Очищаем проблемы при закрытии проекта
  useEffect(() => {
    if (!currentProjectPath) {
      setCompilationProblems([]);
      setTerminalActiveTab("terminal");
    }
  }, [currentProjectPath]);

  // Отслеживание только что созданного проекта для открытия main.cpp
  const newlyCreatedProjectRef = useRef<string | null>(null);

  // Обработчик события открытия main.cpp после создания проекта
  useEffect(() => {
    const handleOpenMainCpp = async (event: CustomEvent<{ projectPath: string }>) => {
      newlyCreatedProjectRef.current = event.detail.projectPath;
    };

    window.addEventListener("open-main-cpp", handleOpenMainCpp as EventListener);
    return () => {
      window.removeEventListener("open-main-cpp", handleOpenMainCpp as EventListener);
    };
  }, []);

  // Автоматическое открытие main.cpp после установки проекта
  useEffect(() => {
    const openMainCpp = async () => {
      if (
        newlyCreatedProjectRef.current &&
        currentProjectPath === newlyCreatedProjectRef.current
      ) {
        const projectPath = newlyCreatedProjectRef.current;
        // Формируем путь к main.cpp (используем / для кроссплатформенности)
        const mainCppPath = `${projectPath}/src/main.cpp`;
        
        try {
          // Ждем обновления дерева проекта и готовности обработчика
          // Увеличиваем задержку для надежности
          await new Promise((resolve) => setTimeout(resolve, 800));
          
          // Пытаемся открыть файл несколько раз с интервалами
          let attempts = 0;
          const maxAttempts = 5;
          
          while (attempts < maxAttempts) {
            try {
              await handleFileOpen(mainCppPath);
              console.log("Файл main.cpp успешно открыт");
              newlyCreatedProjectRef.current = null;
              return;
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) {
                throw error;
              }
              // Ждем перед следующей попыткой
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        } catch (error) {
          console.error("Ошибка открытия файла main.cpp:", error);
          console.error("Путь к файлу:", mainCppPath);
          newlyCreatedProjectRef.current = null;
        }
      }
    };

    if (currentProjectPath) {
      openMainCpp();
    }
  }, [currentProjectPath, handleFileOpen]);

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
          <ArduinoToolbar
            currentProjectPath={currentProjectPath}
            onCompilationResult={(result) => {
              // Парсим ошибки компиляции
              if (!result.success) {
                // Используем stderr, если есть, иначе error
                const errorText = result.stderr || result.error || "";
                const problems = parseCompilationErrors(errorText);
                setCompilationProblems(problems);
                // Если есть ошибки, открываем терминал и переключаемся на вкладку "Проблемы"
                if (problems.length > 0 && !isTerminalVisible) {
                  toggleTerminal();
                  setTerminalActiveTab("problems");
                } else if (problems.length > 0) {
                  setTerminalActiveTab("problems");
                }
              } else {
                // Очищаем проблемы при успешной компиляции
                setCompilationProblems([]);
              }
            }}
          />
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
                  compilationProblems={compilationProblems}
                  terminalActiveTab={terminalActiveTab}
                  onTerminalTabChange={setTerminalActiveTab}
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

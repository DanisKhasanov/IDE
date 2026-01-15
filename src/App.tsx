import { useState, useEffect, useRef } from "react";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import CodeEditorPanel from "@/components/code-editor/CodeEditorPanel";
import AdditionalPanel from "@/components/additional-panel/AdditionalPanel";
import ProjectTree from "@/components/project-tree/ProjectTree";
import NewProjectModal from "@/components/new-project/NewProjectModal";
import ToolchainSetupModal from "@/components/common/ToolchainSetupModal";
import { GuiSettingsPage } from "@/components/additional-panel/gui/GuiSettingsPage";
import {
  useTheme,
  useTerminal,
  useProjectMenu,
  useFileHandler,
  useNewProjectModal,
} from "@hooks/index";
import { useAdditionalPanel } from "@/hooks/ui/useAdditionalPanel";
import { SnackbarProvider } from "@/contexts/SnackbarContext";
import { setBoardUiConfig } from "@/utils/config/boardConfigHelpers";

import type { CompilationProblem } from "@/components/terminal/ProblemsTab";
import { parseCompilationErrors } from "@utils/arduino/CompilationErrorParser";
import type { UploadResult } from "@/types/arduino";

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
  const [toolchainModalOpen, setToolchainModalOpen] = useState(false);
  const [guiSettingsPageOpen, setGuiSettingsPageOpen] = useState(false);
  //Выбор темы
  const { theme, toggleMode } = useTheme();
  //Выбор видимости терминала
  const { isTerminalVisible, toggleTerminal } = useTerminal({
    currentProjectPath,
  });
  //Видимость дополнительных панелей
  const {
    isGuiPanelVisible,
    isGraphicalInitVisible,
    hideGuiPanel,
    hideGraphicalInit,
  } = useAdditionalPanel();
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

  // Загружаем UI-конфиг платы один раз при старте приложения.
  // В dev он берётся из репозитория, в prod — из папки пользователя (с дефолтным фолбэком).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.electronAPI.getBoardUiConfig("uno");
        if (cancelled) return;
        setBoardUiConfig(result.config);
      } catch (e) {
        console.error("Не удалось загрузить UI-конфиг платы (uno):", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Отслеживание только что созданного проекта для открытия main.cpp
  const newlyCreatedProjectRef = useRef<string | null>(null);

  // Обработчик события открытия main.cpp после создания проекта
  useEffect(() => {
    const handleOpenMainCpp = async (
      event: CustomEvent<{ projectPath: string }>
    ) => {
      newlyCreatedProjectRef.current = event.detail.projectPath;
    };

    window.addEventListener(
      "open-main-cpp",
      handleOpenMainCpp as EventListener
    );
    return () => {
      window.removeEventListener(
        "open-main-cpp",
        handleOpenMainCpp as EventListener
      );
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

  // Подписка на событие смены темы из меню
  useEffect(() => {
    const unsubscribe = window.electronAPI.onToggleTheme(() => {
      toggleMode();
    });

    return () => {
      unsubscribe();
    };
  }, [toggleMode]);

  // Проверка toolchain при первом запуске
  useEffect(() => {
    const checkToolchainOnFirstLaunch = async () => {
      try {
        if (!window.electronAPI?.toolchainCheck) {
          return;
        }

        // Всегда выполняем реальную проверку toolchain при запуске
        const status = await window.electronAPI.toolchainCheck();

        // Если toolchain не установлен, показываем модальное окно
        if (!status.installed) {
          setToolchainModalOpen(true);
        }
      } catch (error) {
        console.error("Ошибка проверки toolchain:", error);
        // В случае ошибки тоже показываем модальное окно для проверки
        setToolchainModalOpen(true);
      }
    };

    checkToolchainOnFirstLaunch();
  }, []);

  // Если открыта страница настроек GUI, показываем её вместо основного интерфейса
  if (guiSettingsPageOpen) {
    return (
      <ThemeProvider theme={theme}>
        <SnackbarProvider>
          <CssBaseline />
          <GuiSettingsPage onClose={() => setGuiSettingsPageOpen(false)} />
        </SnackbarProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <CssBaseline />
        <Box
          display="flex"
          flexDirection="column"
          height="100vh"
          bgcolor={theme.palette.background.default}
        >
          <Box
            component="main"
            display="flex"
            flexGrow={1}
            overflow="hidden"
            bgcolor={theme.palette.background.paper}
          >
            <PanelGroup direction="horizontal">
              {/* Дерево проектов */}
              <Panel defaultSize={18} minSize={14} maxSize={40}>
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
              <Panel defaultSize={isGuiPanelVisible || isGraphicalInitVisible ? 57 : 82} minSize={35}>
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
                    onUploadResult={(result: UploadResult) => {
                      // Обрабатываем ошибки заливки
                      if (!result.success) {
                        // Создаем проблемы из ошибок заливки
                        const problems: CompilationProblem[] = [];
                        const errorText =
                          result.stderr || result.error || result.stdout || "";

                        if (errorText) {
                          // Разбиваем текст ошибки на строки и создаем проблемы
                          const lines = errorText
                            .split("\n")
                            .filter((line) => line.trim());
                          lines.forEach((line) => {
                            const trimmed = line.trim();
                            if (trimmed) {
                              problems.push({
                                type: "error",
                                message: trimmed,
                                raw: trimmed,
                              });
                            }
                          });
                        } else {
                          // Если нет текста ошибки, создаем общую проблему
                          problems.push({
                            type: "error",
                            message: result.error || "Ошибка заливки прошивки",
                          });
                        }

                        setCompilationProblems(problems);
                        // Если есть ошибки, открываем терминал и переключаемся на вкладку "Проблемы"
                        if (problems.length > 0 && !isTerminalVisible) {
                          toggleTerminal();
                          setTerminalActiveTab("problems");
                        } else if (problems.length > 0) {
                          setTerminalActiveTab("problems");
                        }
                      } else {
                        // Очищаем проблемы при успешной заливке
                        setCompilationProblems([]);
                      }
                    }}
                  />
                </Box>
              </Panel>

              {/* Информация о проекте - показываем только если хотя бы одна панель видна */}
              {(isGuiPanelVisible || isGraphicalInitVisible) && (
                <>
                  <PanelResizeHandle />
                  <Panel defaultSize={25} minSize={15} maxSize={45}>
                    <Box display="flex" height="100%">
                      <AdditionalPanel
                        currentProjectPath={currentProjectPath}
                        isGuiPanelVisible={isGuiPanelVisible}
                        isGraphicalInitVisible={isGraphicalInitVisible}
                        hideGuiPanel={hideGuiPanel}
                        hideGraphicalInit={hideGraphicalInit}
                        onOpenGuiSettings={() => setGuiSettingsPageOpen(true)}
                      />
                    </Box>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Box>
        </Box>

        {/* Модальное окно создания нового проекта */}
        <NewProjectModal
          open={isOpen}
          onClose={handleClose}
          onProjectCreate={handleProjectCreate}
        />

        {/* Модальное окно установки toolchain */}
        <ToolchainSetupModal
          open={toolchainModalOpen}
          onClose={() => setToolchainModalOpen(false)}
        />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;

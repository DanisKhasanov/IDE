import { useEffect, useRef, useState, SyntheticEvent } from "react";
import { Box, Typography, IconButton, Tabs, Tab } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { Panel, PanelResizeHandle } from "react-resizable-panels";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import ProblemsTab, { CompilationProblem } from "@components/ProblemsTab";

interface TerminalPanelProps {
  isVisible: boolean;
  onClose?: () => void;
  currentProjectPath?: string | null;
  problems?: CompilationProblem[];
  activeTab?: "terminal" | "problems";
  onTabChange?: (tab: "terminal" | "problems") => void;
}

const TerminalPanel = ({
  isVisible,
  onClose,
  currentProjectPath,
  problems = [],
  activeTab: externalActiveTab,
  onTabChange,
}: TerminalPanelProps) => {
  const theme = useTheme();
  const [internalActiveTab, setInternalActiveTab] = useState<
    "terminal" | "problems"
  >("terminal");
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const terminalIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const unsubscribeDataRef = useRef<(() => void) | null>(null);

  // Используем внешний activeTab, если он передан, иначе внутренний
  const activeTab = externalActiveTab ?? internalActiveTab;

  // Обработчик изменения таба
  const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
    const newTab = newValue as "terminal" | "problems";
    if (onTabChange) {
      onTabChange(newTab);
    } else {
      setInternalActiveTab(newTab);
    }
  };

  // Инициализация терминала
  useEffect(() => {
    if (!isVisible || !terminalRef.current || activeTab !== "terminal") {
      return;
    }

    // Если терминал уже создан, не создаем заново
    if (terminalInstanceRef.current) {
      return;
    }

    // Создаем экземпляр терминала
    const terminal = new Terminal({
      theme: {
        background: theme.palette.background.paper,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.primary.main,
      },
      fontSize: 12,
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: "block",
      allowTransparency: false,
    });

    terminal.open(terminalRef.current);
    terminalInstanceRef.current = terminal;

    // Функция для подгонки размера терминала
    const fitTerminal = () => {
      if (terminalRef.current && terminalInstanceRef.current) {
        const element = terminalRef.current;
        const terminal = terminalInstanceRef.current;
        // Вычисляем размеры на основе элемента
        const width = element.clientWidth;
        const height = element.clientHeight;
        const cols = Math.floor(width / 8.4); // Примерная ширина символа
        const rows = Math.floor(height / 17); // Примерная высота строки
        if (cols > 0 && rows > 0) {
          terminal.resize(cols, rows);
        }
      }
    };

    // Первоначальная подгонка размера
    setTimeout(fitTerminal, 0);

    // Создаем терминал через IPC
    const createTerminal = async () => {
      try {
        const id = await window.electronAPI.createTerminal(
          currentProjectPath || undefined
        );
        terminalIdRef.current = id;

        // Подписываемся на данные от терминала
        const unsubscribe = window.electronAPI.onTerminalData(
          id,
          (data: string) => {
            terminal.write(data);
          }
        );
        unsubscribeDataRef.current = unsubscribe;

        // Отправляем данные в терминал при вводе
        terminal.onData((data) => {
          window.electronAPI.writeTerminal(id, data);
        });

        // Обработка изменения размера
        const handleResize = () => {
          if (terminalInstanceRef.current && terminalRef.current) {
            const element = terminalRef.current;
            const terminal = terminalInstanceRef.current;
            const width = element.clientWidth;
            const height = element.clientHeight;
            const cols = Math.floor(width / 8.4); // Примерная ширина символа
            const rows = Math.floor(height / 17); // Примерная высота строки
            if (cols > 0 && rows > 0) {
              terminal.resize(cols, rows);
              if (id !== null) {
                window.electronAPI.resizeTerminal(id, cols, rows);
              }
            }
          }
        };

        // Наблюдатель за изменением размера
        resizeObserverRef.current = new ResizeObserver(handleResize);
        if (terminalRef.current?.parentElement) {
          resizeObserverRef.current.observe(terminalRef.current.parentElement);
        }

        // Обработка закрытия терминала
        terminal.onResize(({ cols, rows }) => {
          if (id !== null) {
            window.electronAPI.resizeTerminal(id, cols, rows);
          }
        });
      } catch (error) {
        console.error("Ошибка создания терминала:", error);
        terminal.write("\r\n\x1b[31mОшибка создания терминала\x1b[0m\r\n");
      }
    };

    createTerminal();

    return () => {
      // Очистка при размонтировании
      if (unsubscribeDataRef.current) {
        unsubscribeDataRef.current();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (terminalIdRef.current !== null) {
        window.electronAPI
          .destroyTerminal(terminalIdRef.current)
          .catch(console.error);
        terminalIdRef.current = null;
      }
      terminal.dispose();
      terminalInstanceRef.current = null;
      unsubscribeDataRef.current = null;
    };
  }, [isVisible, currentProjectPath, theme, activeTab]);

  // Обновление темы терминала
  useEffect(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.options.theme = {
        background: theme.palette.background.paper,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.primary.main,
      };
    }
  }, [theme]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <PanelResizeHandle/>
      <Panel defaultSize={30} minSize={15} maxSize={70}>
        <Box
          display="flex"
          flexDirection="column"
          height="100%"
          borderTop={1}
          borderColor="divider"
        >
          {/* Заголовок с табами и кнопкой закрытия */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: 1,
              borderColor: "divider",
              backgroundColor: "transparent",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{ flex: 1, minHeight: "auto" }}
            >
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2">Проблемы</Typography>
                    {problems.length > 0 && (
                      <Box
                        sx={{
                          backgroundColor: theme.palette.error.main,
                          color: theme.palette.error.contrastText,
                          borderRadius: "50%",
                          width: 17,
                          height: 17,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        {problems.filter((p) => p.type === "error").length}
                      </Box>
                    )}
                  </Box>
                }
                value="problems"
                sx={{ minHeight: "auto", py: 1 }}
              />
              <Tab
                label="Терминал"
                value="terminal"
                sx={{ minHeight: "auto", py: 1 }}
              />
            </Tabs>
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Закрыть терминал"
                sx={{ mr: 1 }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )}
          </Box>

          
          {/* Контент табов */}
          <Box
            sx={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeTab === "problems" ? (
              <ProblemsTab problems={problems} />
            ) : (
              <Box
                ref={terminalRef}
                sx={{
                  flex: 1,
                  width: "100%",
                  padding: "8px",
                  overflow: "hidden",
                  backgroundColor: theme.palette.background.paper,
                }}
              />
            )}
          </Box>
        </Box>
      </Panel>
    </>
  );
};

export default TerminalPanel;

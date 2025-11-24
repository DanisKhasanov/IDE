import { useEffect, useRef } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { Panel, PanelResizeHandle } from "react-resizable-panels";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  isVisible: boolean;
  onClose?: () => void;
  currentProjectPath?: string | null;
}

const TerminalPanel = ({
  isVisible,
  onClose,
  currentProjectPath,
}: TerminalPanelProps) => {
  const theme = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const terminalIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const unsubscribeDataRef = useRef<(() => void) | null>(null);

  // Инициализация терминала
  useEffect(() => {
    if (!isVisible || !terminalRef.current) {
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
  }, [isVisible, currentProjectPath, theme]);

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
          {/* Заголовок с кнопкой закрытия */}
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
            <Typography
              variant="body2"
              sx={{ px: 2, color: theme.palette.text.secondary }}
            >
              Терминал
            </Typography>
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Закрыть терминал"
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )}
          </Box>
          {/* Контент терминала */}
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
        </Box>
      </Panel>
    </>
  );
};

export default TerminalPanel;

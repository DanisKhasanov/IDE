import { useState, useEffect, useCallback } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
import type {
  CompileResult,
  SerialPortInfo,
  UploadResult,
} from "@/types/arduino";
import type { ProjectTreeNode } from "@/types/project";

interface ArduinoToolbarProps {
  currentProjectPath: string | null;
  onCompilationResult?: (result: CompileResult) => void;
  onUploadResult?: (result: UploadResult) => void;
}

const ArduinoToolbar = ({
  currentProjectPath,
  onCompilationResult,
  onUploadResult,
}: ArduinoToolbarProps) => {
  const [isArduinoProject, setIsArduinoProject] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [lastCompileResult, setLastCompileResult] =
    useState<CompileResult | null>(null);

  // Фиксированная плата - Arduino UNO
  const BOARD = "uno";

  // Загрузка списка портов
  const loadPorts = useCallback(async () => {
    try {
      const detectedPorts = await window.electronAPI.arduinoDetectPorts();
      setPorts(detectedPorts);

      // Автоматически выбираем первый порт, если он есть и текущий порт не выбран
      if (detectedPorts.length > 0) {
        // Если текущий выбранный порт все еще доступен, оставляем его
        const currentPortStillAvailable = detectedPorts.some(
          (p) => p.path === selectedPort
        );
        if (!currentPortStillAvailable) {
          setSelectedPort(detectedPorts[0].path);
        }
      } else {
        setSelectedPort("");
      }
    } catch (error) {
      console.error("Ошибка загрузки портов:", error);
      setPorts([]);
      setSelectedPort("");
    }
  }, [selectedPort]);

  // Проверка, является ли проект Arduino проектом
  useEffect(() => {
    const checkArduinoProject = async () => {
      if (!currentProjectPath) {
        setIsArduinoProject(false);
        setLastCompileResult(null);
        return;
      }

      try {
        const info =
          await window.electronAPI.arduinoDetectProject(currentProjectPath);
        setIsArduinoProject(info.isArduino);

        // Загружаем порты при обнаружении Arduino проекта
        if (info.isArduino) {
          await loadPorts();

          // Проверяем существование hex файла в папке build
          // Используем getProjectTree для проверки существования файла
          try {
            const projectTree = await window.electronAPI.getProjectTree();
            if (projectTree && projectTree.path === currentProjectPath) {
              // Ищем файл build/firmware.hex в дереве проекта
              const findHexFile = (node: ProjectTreeNode): string | null => {
                if (node.type === "file" && node.name === "firmware.hex") {
                  // Проверяем, что файл находится в папке build
                  if (
                    node.path.includes("build") &&
                    node.path.endsWith("firmware.hex")
                  ) {
                    return node.path;
                  }
                }
                if (node.type === "directory" && node.children) {
                  for (const child of node.children) {
                    const found = findHexFile(child);
                    if (found) return found;
                  }
                }
                return null;
              };

              const hexFilePath = findHexFile(projectTree.tree);
              if (hexFilePath) {
                // Если файл существует, устанавливаем успешный результат компиляции
                setLastCompileResult({
                  success: true,
                  hexFile: hexFilePath,
                  message: "Найден существующий HEX файл",
                });
              } else {
                // Файл не найден, очищаем результат компиляции
                setLastCompileResult(null);
              }
            } else {
              setLastCompileResult(null);
            }
          } catch (error) {
            // Если не удалось проверить, очищаем результат компиляции
            console.error("Ошибка проверки hex файла:", error);
            setLastCompileResult(null);
          }
        } else {
          setLastCompileResult(null);
        }
      } catch (error) {
        console.error("Ошибка проверки Arduino проекта:", error);
        setIsArduinoProject(false);
        setLastCompileResult(null);
      }
    };

    checkArduinoProject();
  }, [currentProjectPath]);

  // Автоматическое обновление списка портов для Arduino проектов
  useEffect(() => {
    if (!isArduinoProject || !currentProjectPath) {
      return;
    }

    // Загружаем порты сразу
    loadPorts();

    // Обновляем список портов каждые 3 секунды
    const intervalId = setInterval(() => {
      loadPorts();
    }, 3000);

    // Обновляем при фокусе окна
    const handleFocus = () => {
      loadPorts();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isArduinoProject, currentProjectPath, loadPorts]);

  // Обработка компиляции
  const handleCompile = async () => {
    if (!currentProjectPath || !isArduinoProject) {
      return;
    }

    setIsCompiling(true);
    setResult(null);

    try {
      const compileResult = await window.electronAPI.arduinoCompile(
        currentProjectPath,
        BOARD
      );

      // Сохраняем результат компиляции для последующей заливки
      setLastCompileResult(compileResult);

      // Передаем результат компиляции в родительский компонент
      if (onCompilationResult) {
        onCompilationResult(compileResult);
      }

      // Показываем уведомление при успехе или ошибке
      if (compileResult.success) {
        setResult({
          success: true,
          message: "Компиляция завершена успешно",
        });
        setSnackbarOpen(true);
      } else {
        // Показываем уведомление об ошибке (без полного текста ошибки)
        setResult({
          success: false,
        });
        setSnackbarOpen(true);
      }

      // Если успешно, обновляем дерево проекта для отображения build/firmware.hex
      if (compileResult.success && currentProjectPath) {
        try {
          // Увеличиваем задержку для обеспечения создания всех файлов в build/
          // Особенно важно для новых проектов, где файловая система может быть медленнее
          await new Promise((resolve) => setTimeout(resolve, 500));
          const updatedProject =
            await window.electronAPI.refreshProjectTree(currentProjectPath);

          // Отправляем кастомное событие с обновленным деревом проекта
          if (updatedProject) {
            window.dispatchEvent(
              new CustomEvent("project-tree-updated", {
                detail: updatedProject,
              })
            );
          }
        } catch (error) {
          console.error("Ошибка обновления дерева проекта:", error);
        }
      }
    } catch (error) {
      const errorResult: CompileResult = {
        success: false,
        error: error instanceof Error ? error.message : "Ошибка компиляции",
        stderr: error instanceof Error ? error.message : String(error),
      };
      // Передаем результат ошибки в родительский компонент
      if (onCompilationResult) {
        onCompilationResult(errorResult);
      }
      // Показываем уведомление об ошибке (без полного текста ошибки)
      setResult({
        success: false,
      });
      setSnackbarOpen(true);
    } finally {
      setIsCompiling(false);
    }
  };

  // Обработка заливки прошивки
  const handleUpload = async () => {
    if (!currentProjectPath || !isArduinoProject || !selectedPort) {
      return;
    }

    // Проверяем, что есть успешный результат компиляции
    if (!lastCompileResult?.success || !lastCompileResult.hexFile) {
      setResult({
        success: false,
        error: "Сначала необходимо скомпилировать проект",
      });
      setSnackbarOpen(true);
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const uploadResult: UploadResult =
        await window.electronAPI.arduinoUploadFirmware(
          lastCompileResult.hexFile,
          selectedPort,
          BOARD
        );

      // Передаем результат заливки в родительский компонент
      if (onUploadResult) {
        onUploadResult(uploadResult);
      }

      // Показываем уведомление при успехе или ошибке
      if (uploadResult.success) {
        setResult({
          success: true,
          message: uploadResult.message || "Прошивка успешно залита",
        });
        setSnackbarOpen(true);
      } else {
        setResult({
          success: false,
          error: uploadResult.error || "Ошибка заливки прошивки",
        });
        setSnackbarOpen(true);
      }
    } catch (error) {
      const errorResult: UploadResult = {
        success: false,
        error:
          error instanceof Error ? error.message : "Ошибка заливки прошивки",
        stderr: error instanceof Error ? error.message : String(error),
      };

      // Передаем результат ошибки в родительский компонент
      if (onUploadResult) {
        onUploadResult(errorResult);
      }

      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Ошибка заливки прошивки",
      });
      setSnackbarOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  // Скрываем панель, если проект не Arduino

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1,
          padding: 0.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {/* Выбор COM-порта */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="port-select-label">Порт</InputLabel>
          <Select
            labelId="port-select-label"
            value={selectedPort}
            label="Порт"
            onChange={(e) => setSelectedPort(e.target.value)}
            disabled={isCompiling || isUploading}
          >
            {ports.length === 0 ? (
              <MenuItem value="" disabled>
                Порты не найдены
              </MenuItem>
            ) : (
              ports.map((port) => (
                <MenuItem key={port.path} value={port.path}>
                  {port.friendlyName || port.path}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Кнопка компиляции */}
        <Tooltip title={isCompiling ? "Компиляция..." : "Скомпилировать"}>
          <IconButton
            onClick={handleCompile}
            disabled={isCompiling || isUploading}
            size="small"
            sx={{
              padding: 1,
              color: "success.main",
              "&:hover": {
                backgroundColor: "action.hover",
                color: "success.dark",
              },
              "&:disabled": {
                color: "action.disabled",
              },
            }}
          >
            {isCompiling ? (
              <CircularProgress size={30} color="inherit" />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 30 }} />
            )}
          </IconButton>
        </Tooltip>

        {/* Кнопка заливки прошивки */}
        <Tooltip
          title={
            isUploading
              ? "Заливка прошивки..."
              : !lastCompileResult?.success
                ? "Сначала скомпилируйте проект"
                : !selectedPort
                  ? "Выберите COM-порт"
                  : "Залить прошивку"
          }
        >
          <span>
            <IconButton
              onClick={handleUpload}
              disabled={
                isCompiling ||
                isUploading ||
                !lastCompileResult?.success ||
                !selectedPort
              }
              size="small"
              sx={{
                padding: 1,
                color: "primary.main",
                "&:hover": {
                  backgroundColor: "action.hover",
                  color: "primary.dark",
                },
                "&:disabled": {
                  color: "action.disabled",
                },
              }}
            >
              {isUploading ? (
                <CircularProgress size={30} color="inherit" />
              ) : (
                <CloudUploadIcon sx={{ fontSize: 30 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Уведомление о результате компиляции */}
      <Snackbar
        open={snackbarOpen && result !== null}
        autoHideDuration={result?.success ? 3000 : 5000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={result?.success ? "success" : "error"}
          icon={result?.success ? <CheckCircleIcon /> : <ErrorIcon />}
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: "100%" }}
        >
          {result?.success
            ? "Компиляция завершена успешно"
            : "Произошла ошибка компиляции"}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ArduinoToolbar;

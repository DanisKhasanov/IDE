import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import type { CompileResult } from "@/types/arduino";

interface ArduinoToolbarProps {
  currentProjectPath: string | null;
  onCompilationResult?: (result: CompileResult) => void;
}

const ArduinoToolbar = ({
  currentProjectPath,
  onCompilationResult,
}: ArduinoToolbarProps) => {
  const [isArduinoProject, setIsArduinoProject] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  // Фиксированная плата - Arduino UNO
  const BOARD = "uno";

  // Проверка, является ли проект Arduino проектом
  useEffect(() => {
    const checkArduinoProject = async () => {
      if (!currentProjectPath) {
        setIsArduinoProject(false);
        return;
      }

      try {
        const info =
          await window.electronAPI.arduinoDetectProject(currentProjectPath);
        setIsArduinoProject(info.isArduino);
      } catch (error) {
        console.error("Ошибка проверки Arduino проекта:", error);
        setIsArduinoProject(false);
      }
    };

    checkArduinoProject();
  }, [currentProjectPath]);

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
          await new Promise(resolve => setTimeout(resolve, 500));
          const updatedProject = await window.electronAPI.refreshProjectTree(currentProjectPath);
          
          // Отправляем кастомное событие с обновленным деревом проекта
          if (updatedProject) {
            window.dispatchEvent(new CustomEvent("project-tree-updated", {
              detail: updatedProject
            }));
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

  // Скрываем панель, если проект не Arduino
  if (!isArduinoProject || !currentProjectPath) {
    return null;
  }

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
        <Tooltip title={isCompiling ? "Компиляция..." : "Скомпилировать"}>
          <IconButton
            onClick={handleCompile}
            disabled={isCompiling}
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

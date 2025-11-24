import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

interface ArduinoToolbarProps {
  currentProjectPath: string | null;
}

const ArduinoToolbar = ({ currentProjectPath }: ArduinoToolbarProps) => {
  const [isArduinoProject, setIsArduinoProject] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [boards, setBoards] = useState<string[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("uno");
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Проверка, является ли проект Arduino проектом
  useEffect(() => {
    const checkArduinoProject = async () => {
      if (!currentProjectPath) {
        setIsArduinoProject(false);
        return;
      }

      try {
        const info = await window.electronAPI.arduinoDetectProject(
          currentProjectPath
        );
        setIsArduinoProject(info.isArduino);
      } catch (error) {
        console.error("Ошибка проверки Arduino проекта:", error);
        setIsArduinoProject(false);
      }
    };

    checkArduinoProject();
  }, [currentProjectPath]);

  // Загрузка списка плат
  useEffect(() => {
    const loadBoards = async () => {
      try {
        const boardList = await window.electronAPI.arduinoGetBoards();
        setBoards(boardList);
        // Устанавливаем первую плату по умолчанию
        if (boardList.length > 0 && !selectedBoard) {
          setSelectedBoard(boardList[0]);
        }
      } catch (error) {
        console.error("Ошибка загрузки списка плат:", error);
        setBoards(["uno", "nano", "mega", "leonardo"]);
      }
    };

    if (isArduinoProject) {
      loadBoards();
    }
  }, [isArduinoProject]);

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
        selectedBoard
      );

      setResult({
        success: compileResult.success,
        message: compileResult.message || "Компиляция завершена успешно!",
        error: compileResult.error,
      });

      setSnackbarOpen(true);

      // Если успешно, обновляем дерево проекта (можно добавить callback)
      if (compileResult.success) {
        // TODO: Обновить дерево проекта для отображения build/firmware.hex
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "Ошибка компиляции",
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
          gap: 2,
          padding: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="board-select-label">Плата</InputLabel>
          <Select
            labelId="board-select-label"
            value={selectedBoard}
            label="Плата"
            onChange={(e) => setSelectedBoard(e.target.value)}
            disabled={isCompiling}
          >
            {boards.map((board) => (
              <MenuItem key={board} value={board}>
                {board.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          startIcon={
            isCompiling ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <BuildIcon />
            )
          }
          onClick={handleCompile}
          disabled={isCompiling}
          sx={{ minWidth: 150 }}
        >
          {isCompiling ? "Компиляция..." : "Скомпилировать"}
        </Button>

        {result && result.success && (
          <Typography variant="body2" color="success.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CheckCircleIcon fontSize="small" />
            {result.message}
          </Typography>
        )}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={result?.success ? "success" : "error"}
          sx={{ width: "100%" }}
          icon={result?.success ? <CheckCircleIcon /> : <ErrorIcon />}
        >
          {result?.success ? result.message : result?.error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ArduinoToolbar;


import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import type {
  CompileResult,
  SerialPortInfo,
  UploadResult,
  SerialPortPermissionStatus,
} from "@/types/arduino";
import type { ProjectTreeNode } from "@/types/project";
import { useSnackbar } from "@/contexts/SnackbarContext";

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
  const { showSuccess, showError } = useSnackbar();
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [lastCompileResult, setLastCompileResult] =
    useState<CompileResult | null>(null);
  const [portPermissions, setPortPermissions] = useState<SerialPortPermissionStatus | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [previousPermissionsHasAccess, setPreviousPermissionsHasAccess] = useState<boolean | null>(null);
  const [permissionDialogDismissed, setPermissionDialogDismissed] = useState(false);
  // Используем ref для синхронного отслеживания состояния диалога
  const permissionDialogDismissedRef = useRef(false);
  const permissionDialogOpenRef = useRef(false);

  // Фиксированная плата - Arduino UNO
  const BOARD = "uno";

  // Проверка прав доступа к COM-портам (вызывается только при попытке заливки)
  const checkPermissions = useCallback(async () => {
    try {
      const status = await window.electronAPI.arduinoCheckPortPermissions();
      setPortPermissions(status);
      return status;
    } catch (error) {
      console.error("Ошибка проверки прав доступа:", error);
      return null;
    }
  }, []);

  // Обновление списка портов из события (event-driven)
  const handlePortsChanged = useCallback((detectedPorts: SerialPortInfo[]) => {
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
  }, [selectedPort]);

  // Обновление прав доступа из события (event-driven)
  // Только обновляем состояние, диалог открывается только при попытке заливки
  const handlePermissionsChanged = useCallback((permissions: SerialPortPermissionStatus) => {
    const previousHasAccess = previousPermissionsHasAccess;
    
    setPortPermissions(permissions);
    
    // Если права улучшились (стали доступны), сбрасываем флаг закрытия диалога
    if (permissions.hasAccess && previousHasAccess === false) {
      setPermissionDialogDismissed(false);
      permissionDialogDismissedRef.current = false;
    }
    
    setPreviousPermissionsHasAccess(permissions.hasAccess);
  }, [previousPermissionsHasAccess]);

  // Синхронизация ref с состоянием диалога
  useEffect(() => {
    permissionDialogOpenRef.current = permissionDialogOpen;
  }, [permissionDialogOpen]);

  // Подписка на события изменения портов и прав доступа
  // Event-driven подход: полагаемся только на события от SerialPortWatcher
  useEffect(() => {
    if (!isArduinoProject) {
      return;
    }

    // Подписываемся на события портов
    const unsubscribePorts = window.electronAPI.arduinoOnPortsChanged(handlePortsChanged);
    
    // Подписываемся на события прав доступа
    const unsubscribePermissions = window.electronAPI.arduinoOnPermissionsChanged(handlePermissionsChanged);

    // Получаем начальные данные из кеша SerialPortWatcher (синхронно, быстро)
    // Это нужно только для первоначальной загрузки UI
    window.electronAPI.arduinoDetectPorts()
      .then(handlePortsChanged)
      .catch(() => {
        handlePortsChanged([]);
      });
    
    // Получаем начальный статус прав из кеша (без открытия диалога)
    checkPermissions().then((status) => {
      if (status) {
        setPreviousPermissionsHasAccess(status.hasAccess);
      }
    });

    return () => {
      unsubscribePorts();
      unsubscribePermissions();
    };
  }, [isArduinoProject, handlePortsChanged, handlePermissionsChanged, checkPermissions]);

  // Проверка, является ли проект Arduino проектом
  useEffect(() => {
    const checkArduinoProject = async () => {
      if (!currentProjectPath) {
        setIsArduinoProject(false);
        setLastCompileResult(null);
        // Сбрасываем флаги при закрытии проекта
        setPermissionDialogDismissed(false);
        setPreviousPermissionsHasAccess(null);
        permissionDialogDismissedRef.current = false;
        permissionDialogOpenRef.current = false;
        return;
      }

      try {
        const info =
          await window.electronAPI.arduinoDetectProject(currentProjectPath);
        setIsArduinoProject(info.isArduino);
        
        // Сбрасываем флаги при смене проекта
        if (info.isArduino) {
          setPermissionDialogDismissed(false);
          setPreviousPermissionsHasAccess(null);
          permissionDialogDismissedRef.current = false;
          permissionDialogOpenRef.current = false;
        }

        // При обнаружении Arduino проекта порты будут загружены через события
        if (info.isArduino) {
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

  // Обработка компиляции
  const handleCompile = async () => {
    if (!currentProjectPath || !isArduinoProject) {
      return;
    }

    setIsCompiling(true);

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
        showSuccess("Компиляция завершена успешно");
      } else {
        // Показываем уведомление об ошибке (без полного текста ошибки)
        showError("Произошла ошибка компиляции", { autoHideDuration: 5000 });
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
      showError("Произошла ошибка компиляции", { autoHideDuration: 5000 });
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
      showError("Сначала необходимо скомпилировать проект");
      return;
    }

    // Проверяем права доступа к COM-портам перед заливкой
    const permissions = await checkPermissions();
    if (permissions && !permissions.hasAccess && permissions.needsSetup) {
      // Показываем диалог с инструкциями по настройке прав
      setPermissionDialogOpen(true);
      setPermissionDialogDismissed(false);
      permissionDialogDismissedRef.current = false;
      permissionDialogOpenRef.current = true;
      setPortPermissions(permissions);
      return; // Прерываем заливку
    }

    setIsUploading(true);

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
        showSuccess(uploadResult.message || "Прошивка успешно залита");
      } else {
        // Проверяем, не связана ли ошибка с правами доступа
        const errorOutput = uploadResult.stderr || uploadResult.error || "";
        if (errorOutput.includes('permission denied') || errorOutput.includes('Permission denied')) {
          // Показываем диалог с инструкциями
          const currentPermissions = await checkPermissions();
          if (currentPermissions && currentPermissions.needsSetup) {
            setPermissionDialogOpen(true);
            setPermissionDialogDismissed(false);
            permissionDialogDismissedRef.current = false;
            permissionDialogOpenRef.current = true;
            setPortPermissions(currentPermissions);
          }
        }
        
        showError(uploadResult.error || "Ошибка заливки прошивки", { autoHideDuration: 5000 });
      }
    } catch (error) {
      const err = error as Error & { stderr?: string };
      const errorOutput = err.stderr || err.message || String(error);
      
      // Проверяем, не связана ли ошибка с правами доступа
      if (errorOutput.includes('permission denied') || errorOutput.includes('Permission denied')) {
        // Показываем диалог с инструкциями
        const currentPermissions = await checkPermissions();
        if (currentPermissions && currentPermissions.needsSetup) {
          setPermissionDialogOpen(true);
          setPermissionDialogDismissed(false);
          permissionDialogDismissedRef.current = false;
          permissionDialogOpenRef.current = true;
          setPortPermissions(currentPermissions);
        }
      }

      const errorResult: UploadResult = {
        success: false,
        error:
          error instanceof Error ? error.message : "Ошибка заливки прошивки",
        stderr: errorOutput,
      };

      // Передаем результат ошибки в родительский компонент
      if (onUploadResult) {
        onUploadResult(errorResult);
      }

      showError(
        error instanceof Error ? error.message : "Ошибка заливки прошивки",
        { autoHideDuration: 5000 }
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Обработчик закрытия диалога прав доступа
  // Устанавливает флаг, чтобы диалог не показывался повторно, пока статус не улучшится
  const handleClosePermissionDialog = useCallback(() => {
    setPermissionDialogOpen(false);
    setPermissionDialogDismissed(true);
    permissionDialogDismissedRef.current = true;
    permissionDialogOpenRef.current = false;
  }, []);

  // Обработчик автоматической настройки прав доступа
  // После настройки SerialPortWatcher автоматически обновит статус через события
  const handleSetupPermissions = useCallback(async () => {
    try {
      const result = await window.electronAPI.arduinoSetupPortPermissions();
      if (result.success) {
        // Показываем сообщение об успехе
        showSuccess(result.message);
        
        // SerialPortWatcher автоматически обновит статус прав через события
        // Не нужно вручную вызывать проверку - события придут автоматически
        handleClosePermissionDialog();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error("Ошибка настройки прав:", error);
      showError(
        error instanceof Error ? error.message : "Ошибка настройки прав доступа"
      );
    }
  }, [handleClosePermissionDialog]);

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

      {/* Диалог проверки прав доступа к COM-портам */}
      {permissionDialogOpen && portPermissions && (
        <Dialog 
          open={permissionDialogOpen} 
          onClose={handleClosePermissionDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Требуется настройка прав доступа к COM-портам</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>{portPermissions.message}</Typography>
            {portPermissions.instructions && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Инструкции:
                </Typography>
                {portPermissions.instructions.map((instruction, index) => (
                  <Typography 
                    key={index} 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      mb: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    {instruction}
                  </Typography>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {portPermissions.canAutoFix && (
              <Button 
                onClick={handleSetupPermissions} 
                variant="contained"
                color="primary"
              >
                Настроить автоматически
              </Button>
            )}
            <Button onClick={handleClosePermissionDialog}>
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default ArduinoToolbar;

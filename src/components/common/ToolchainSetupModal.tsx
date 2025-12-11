import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import type {
  ToolchainStatus,
  InstallCommands,
  InstallProgress,
} from "@/types/toolchain";
import { useSnackbar } from "@/contexts/SnackbarContext";

type ToolchainSetupModalProps = {
  open: boolean;
  onClose: () => void;
};

const ToolchainSetupModal: React.FC<ToolchainSetupModalProps> = ({
  open,
  onClose,
}) => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<ToolchainStatus | null>(null);
  const [installCommands, setInstallCommands] =
    useState<InstallCommands | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress[]>([]);
  const [installError, setInstallError] = useState<string | null>(null);
  const { showSuccess, showError } = useSnackbar();

  // Проверка toolchain при открытии модального окна
  useEffect(() => {
    if (open) {
      checkToolchain();
      loadInstallInfo();
      // Сбрасываем состояние установки при открытии
      setInstalling(false);
      setInstallProgress([]);
      setInstallError(null);
    }
  }, [open]);

  const checkToolchain = async () => {
    setChecking(true);
    try {
      if (!window.electronAPI?.toolchainCheck) {
        console.error("toolchainCheck не доступен");
        return;
      }
      const result = await window.electronAPI.toolchainCheck();
      setStatus(result);

      // Если toolchain установлен, сохраняем статус
      if (result.installed) {
        await window.electronAPI.toolchainSetInstalled(true);
      }
    } catch (error) {
      console.error("Ошибка проверки toolchain:", error);
      setStatus({
        installed: false,
        tools: {
          avrGcc: false,
          avrObjcopy: false,
          avrdude: false,
        },
        versions: {},
        errors: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      setChecking(false);
    }
  };

  const loadInstallInfo = async () => {
    try {
      if (!window.electronAPI?.toolchainGetInstallCommands) {
        return;
      }
      const commands = await window.electronAPI.toolchainGetInstallCommands();
      setInstallCommands(commands);
    } catch (error) {
      console.error("Ошибка загрузки информации об установке:", error);
    }
  };

  const handleClose = () => {
    setStatus(null);
    setChecking(false);
    setInstalling(false);
    setInstallProgress([]);
    setInstallError(null);
    onClose();
  };

  const handleInstall = async () => {
    if (!window.electronAPI?.toolchainInstall) {
      console.error("toolchainInstall не доступен");
      return;
    }

    setInstalling(true);
    setInstallProgress([]);
    setInstallError(null);

    // Подписка на прогресс установки
    const unsubscribe = window.electronAPI.onToolchainInstallProgress?.(
      (progress: InstallProgress) => {
        setInstallProgress((prev) => [...prev, progress]);
      }
    );

    try {
      const result = await window.electronAPI.toolchainInstall();

      if (result.success) {
        // Перепроверяем toolchain после установки
        await checkToolchain();
        showSuccess("AVR Toolchain успешно установлен");
      } else {
        const errorMsg = result.error || "Неизвестная ошибка установки";
        setInstallError(errorMsg);
        showError(errorMsg);
      }
    } catch (error) {
      console.error("Ошибка установки:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setInstallError(errorMsg);
      showError(errorMsg);
    } finally {
      setInstalling(false);
      unsubscribe?.();
    }
  };

  const getToolStatus = (installed: boolean) => {
    return installed ? (
      <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
    ) : (
      <ErrorIcon color="error" sx={{ fontSize: 20 }} />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxWidth: "800px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6">Установка AVR Toolchain</Typography>
        <IconButton aria-label="close" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Статус проверки */}
          {checking && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>Проверка наличия toolchain...</Typography>
            </Box>
          )}

          {/* Результаты проверки */}
          {!checking && status && (
            <>
              {status.installed ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <Typography variant="body1" fontWeight="bold">
                    AVR Toolchain установлен и готов к использованию!
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning" icon={<WarningIcon />}>
                  <Typography variant="body1" fontWeight="bold">
                    AVR Toolchain не найден в системе
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Для компиляции Arduino проектов необходимо установить
                    инструменты разработки.
                  </Typography>
                </Alert>
              )}

              {/* Детали по инструментам */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Статус инструментов:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getToolStatus(status.tools.avrGcc)}
                    <Typography variant="body2">
                      avr-gcc{" "}
                      {status.tools.avrGcc
                        ? `(${status.versions.avrGcc || "установлен"})`
                        : "(не найден)"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getToolStatus(status.tools.avrObjcopy)}
                    <Typography variant="body2">
                      avr-objcopy{" "}
                      {status.tools.avrObjcopy
                        ? `(${status.versions.avrObjcopy || "установлен"})`
                        : "(не найден)"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getToolStatus(status.tools.avrdude)}
                    <Typography variant="body2">
                      avrdude{" "}
                      {status.tools.avrdude
                        ? `(${status.versions.avrdude || "установлен"})`
                        : "(не найден)"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Прогресс установки */}
              {installing && (
                <>
                  <Divider />
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "background.default" }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <CircularProgress size={24} />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Установка toolchain...
                      </Typography>
                    </Box>
                    {installProgress.length > 0 && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          bgcolor: "grey.900",
                          color: "grey.100",
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {installProgress.map((progress, index) => (
                          <Box key={index} sx={{ mb: 0.5 }}>
                            {progress.error ? (
                              <Typography sx={{ color: "error.light" }}>
                                {progress.output}
                              </Typography>
                            ) : (
                              <Typography>{progress.output}</Typography>
                            )}
                          </Box>
                        ))}
                      </Paper>
                    )}
                  </Paper>
                </>
              )}

              {/* Ошибка установки */}
              {installError && (
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Ошибка установки:</strong> {installError}
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!checking && status && !status.installed && !installing && (
          <>
            {installCommands && installCommands.platform !== "windows" && (
              <Button
                onClick={handleInstall}
                variant="contained"
                color="primary"
                disabled={installing}
              >
                Установить
              </Button>
            )}
          </>
        )}
        <Button
          onClick={handleClose}
          variant={status?.installed ? "contained" : "outlined"}
          disabled={installing}
        >
          {installing
            ? "Установка..."
            : status?.installed
              ? "Закрыть"
              : "Продолжить без установки"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ToolchainSetupModal;

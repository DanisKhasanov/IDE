import { createContext, useContext, useState, useCallback, ReactElement } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";

interface SnackbarOptions {
  message?: string;
  severity?: AlertColor;
  autoHideDuration?: number;
  anchorOrigin?: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
  autoHideDuration: number;
  anchorOrigin: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };
}

interface SnackbarContextType {
  showSnackbar: (message: string, options?: Omit<SnackbarOptions, "message">) => void;
  showSuccess: (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => void;
  showError: (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => void;
  showWarning: (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => void;
  showInfo: (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => void;
  closeSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

const getSeverityIcon = (severity: AlertColor): ReactElement => {
  switch (severity) {
    case "success":
      return <CheckCircleIcon />;
    case "error":
      return <ErrorIcon />;
    case "warning":
      return <WarningIcon />;
    case "info":
      return <InfoIcon />;
    default:
      return <CheckCircleIcon />;
  }
};

export const SnackbarProvider = ({ children }: { children: React.ReactNode }) => {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
    autoHideDuration: 3000,
    anchorOrigin: {
      vertical: "bottom",
      horizontal: "right",
    },
  });

  const showSnackbar = useCallback(
    (message: string, options?: Omit<SnackbarOptions, "message">) => {
      setSnackbarState({
        open: true,
        message,
        severity: options?.severity || "success",
        autoHideDuration: options?.autoHideDuration || 3000,
        anchorOrigin: options?.anchorOrigin || {
          vertical: "bottom",
          horizontal: "right",
        },
      });
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => {
      showSnackbar(message, { ...options, severity: "success" });
    },
    [showSnackbar]
  );

  const showError = useCallback(
    (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => {
      showSnackbar(message, { ...options, severity: "error" });
    },
    [showSnackbar]
  );

  const showWarning = useCallback(
    (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => {
      showSnackbar(message, { ...options, severity: "warning" });
    },
    [showSnackbar]
  );

  const showInfo = useCallback(
    (message: string, options?: Omit<SnackbarOptions, "message" | "severity">) => {
      showSnackbar(message, { ...options, severity: "info" });
    },
    [showSnackbar]
  );

  const closeSnackbar = useCallback(() => {
    setSnackbarState((prev) => ({ ...prev, open: false }));
  }, []);

  const SnackbarComponent = (): ReactElement => (
    <Snackbar
      open={snackbarState.open}
      autoHideDuration={snackbarState.autoHideDuration}
      onClose={closeSnackbar}
      anchorOrigin={snackbarState.anchorOrigin}
    >
      <Alert
        severity={snackbarState.severity}
        icon={getSeverityIcon(snackbarState.severity)}
        onClose={closeSnackbar}
        sx={{ width: "100%" }}
      >
        {snackbarState.message}
      </Alert>
    </Snackbar>
  );

  return (
    <SnackbarContext.Provider
      value={{
        showSnackbar,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        closeSnackbar,
      }}
    >
      {children}
      <SnackbarComponent />
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
};


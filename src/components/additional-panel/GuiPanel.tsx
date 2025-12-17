import React, { useState, useEffect, useRef } from "react";
import { 
  Box, 
  Typography, 
  IconButton, 
  Card, 
  CardContent,
  Alert,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import { GuiSettingsDialog } from "./GuiSettingsDialog";
import type { SensorData } from "@/utils/serial/SerialDataReader";

interface GuiPanelProps {
  onClose?: () => void;
}

// Компонент цифрового табло для отображения значения
const DigitalDisplay: React.FC<{ 
  label: string; 
  value: string | number; 
  unit?: string;
  color?: string;
}> = ({ label, value, unit = "", color = "primary" }) => {
  return (
    <Card 
      sx={{ 
        height: "100%",
        background: `linear-gradient(135deg, ${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}15 0%, ${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}05 100%)`,
        border: `1px solid ${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}30`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2, 
            textTransform: "uppercase",
            letterSpacing: 1,
            fontWeight: 500,
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 0.5,
          }}
        >
          <Typography
            variant="h2"
            component="div"
            sx={{
              fontFamily: "'Roboto Mono', monospace",
              fontWeight: 700,
              color: `${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}`,
              textShadow: `0 0 20px ${color === "primary" ? "#1976d240" : color === "success" ? "#2e7d3240" : "#d32f2f40"}`,
              lineHeight: 1.2,
            }}
          >
            {typeof value === "number" ? value.toFixed(1) : value}
          </Typography>
          {unit && (
            <Typography
              variant="h5"
              component="span"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
                ml: 0.5,
              }}
            >
              {unit}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Функция для определения типа данных и форматирования
const parseField = (key: string, value: unknown) => {
  const keyLower = key.toLowerCase();
  
  // Преобразуем value в число, если возможно
  const numValue = typeof value === 'number' ? value : 
                   typeof value === 'string' ? parseFloat(value) : 
                   typeof value === 'boolean' ? (value ? 1 : 0) : 0;
  const isNumber = !isNaN(numValue) && (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''));
  
  // Определяем тип по названию поля
  if (keyLower.includes('temp')) {
    const tempValue = isNumber ? numValue : 0;
    return {
      label: 'Температура',
      value: tempValue,
      unit: '°C',
      color: tempValue > 30 ? 'error' : tempValue > 20 ? 'warning' : 'success'
    };
  }
  
  if (keyLower.includes('hum')) {
    return {
      label: 'Влажность',
      value: isNumber ? numValue : 0,
      unit: '%',
      color: 'primary'
    };
  }
  
  if (keyLower.includes('led') || keyLower.includes('light')) {
    const isOn = value === 'ON' || value === true || value === 1 || value === '1' || 
                 (typeof value === 'string' && value.toUpperCase() === 'ON');
    return {
      label: 'LED',
      value: isOn ? 'ON' : 'OFF',
      unit: '',
      color: isOn ? 'warning' : 'default'
    };
  }
  
  if (keyLower.includes('pressure')) {
    return {
      label: 'Давление',
      value: isNumber ? numValue : 0,
      unit: 'hPa',
      color: 'primary'
    };
  }
  
  // По умолчанию
  return {
    label: key,
    value: isNumber ? numValue : String(value),
    unit: '',
    color: 'primary'
  };
};

export const GuiPanel: React.FC<GuiPanelProps> = ({ onClose }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portPath, setPortPath] = useState<string | null>(null);
  const unsubscribeDataRef = useRef<(() => void) | null>(null);
  const unsubscribeErrorRef = useRef<(() => void) | null>(null);
  const unsubscribeCloseRef = useRef<(() => void) | null>(null);

  // Подключение к Arduino при монтировании компонента
  useEffect(() => {
    const connectToArduino = async () => {
      try {
        // Получаем список портов
        const ports = await window.electronAPI.arduinoDetectPorts();
        
        if (ports.length === 0) {
          setError("Arduino не найден. Подключите устройство.");
          return;
        }

        const selectedPort = ports[0].path;
        setPortPath(selectedPort);

        // Открываем порт для чтения данных
        const result = await window.electronAPI.serialDataOpen(selectedPort, 9600);
        
        if (result.success) {
          setIsConnected(true);
          setError(null);
        } else {
          setError(result.error || "Ошибка подключения");
        }
      } catch (err) {
        setError(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    connectToArduino();

    // Очистка при размонтировании
    return () => {
      if (portPath) {
        window.electronAPI.serialDataClose(portPath);
      }
      if (unsubscribeDataRef.current) {
        unsubscribeDataRef.current();
      }
      if (unsubscribeErrorRef.current) {
        unsubscribeErrorRef.current();
      }
      if (unsubscribeCloseRef.current) {
        unsubscribeCloseRef.current();
      }
    };
  }, []);

  // Подписка на данные от контроллера
  useEffect(() => {
    if (!isConnected || !portPath) return;

    // Подписываемся на события данных
    const unsubscribeData = window.electronAPI.serialDataOnData(
      (receivedPortPath: string, data: SensorData) => {
        if (receivedPortPath === portPath) {
          // Логируем полученные данные от контроллера
          console.log('[GuiPanel] Получены данные от контроллера:', data);
          
          // Накапливаем данные, объединяя новые с предыдущими
          // Это нужно, так как каждое поле приходит отдельным событием
          setSensorData(prev => {
            const merged = { ...(prev || {}), ...data };
            console.log('[GuiPanel] Объединенные данные:', merged);
            return merged;
          });
          setError(null);
        }
      }
    );

    // Подписываемся на ошибки
    const unsubscribeError = window.electronAPI.serialDataOnError(
      (receivedPortPath: string, errorMsg: string) => {
        if (receivedPortPath === portPath) {
          setError(errorMsg);
        }
      }
    );

    // Подписываемся на закрытие порта
    const unsubscribeClose = window.electronAPI.serialDataOnClose(
      (receivedPortPath: string) => {
        if (receivedPortPath === portPath) {
          setIsConnected(false);
          setError("Порт закрыт (возможно, для заливки прошивки)");
          
          // Пытаемся переподключиться через 2 секунды
          setTimeout(async () => {
            try {
              const result = await window.electronAPI.serialDataOpen(portPath, 9600);
              if (result.success) {
                setIsConnected(true);
                setError(null);
              }
            } catch (err) {
              // Игнорируем ошибки переподключения
            }
          }, 2000);
        }
      }
    );

    unsubscribeDataRef.current = unsubscribeData;
    unsubscribeErrorRef.current = unsubscribeError;
    unsubscribeCloseRef.current = unsubscribeClose;

    return () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeError) unsubscribeError();
      if (unsubscribeClose) unsubscribeClose();
    };
  }, [isConnected, portPath]);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        p: 2,
        overflow: "hidden",
      }}
    >
      {/* Кнопки управления */}
      {onClose && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 1,
            display: "flex",
            gap: 0.5,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            title="Настройки GUI"
          >
            <TuneIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={onClose} 
            title="Скрыть панель GUI"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Статус подключения */}
      <Box sx={{ mb: 2 }}>
        {isConnected ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Подключено: {portPath}
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Ожидание подключения...
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Отображение данных в виде цифрового табло */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: sensorData ? "flex-start" : "center",
          justifyContent: sensorData ? "flex-start" : "center",
        }}
      >
        {!sensorData ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Ожидание данных от контроллера...
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
              width: "100%",
            }}
          >
            {/* Автоматически создаем цифровое табло для каждого поля в JSON */}
            {Object.entries(sensorData).map(([key, value]) => {
              const parsed = parseField(key, value);
              
              return (
                <DigitalDisplay
                  key={key}
                  label={parsed.label}
                  value={parsed.value}
                  unit={parsed.unit}
                  color={parsed.color}
                />
              );
            })}
          </Box>
        )}
      </Box>

      <GuiSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={() => {
          // Логика сохранения настроек
        }}
      />
    </Box>
  );
};

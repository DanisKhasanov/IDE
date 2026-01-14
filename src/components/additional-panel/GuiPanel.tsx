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
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import type { SensorData } from "@/utils/serial/SerialDataReader";
import { loadGuiPanelSettings } from "@/utils/ui/GuiPanelSettings";

interface GuiPanelProps {
  onClose?: () => void;
  onOpenSettings?: () => void;
}

// Компонент компактного цифрового табло для мини-панели
const CompactDisplay: React.FC<{ 
  label: string; 
  value: string | number; 
  unit?: string;
  color?: string;
}> = ({ label, value, unit = "", color = "primary" }) => {
  return (
    <Card 
      sx={{ 
        background: `linear-gradient(135deg, ${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}15 0%, ${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}05 100%)`,
        border: `1px solid ${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}30`,
      }}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontWeight: 500,
            fontSize: 9,
            display: "block",
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 0.5,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontFamily: "'Roboto Mono', monospace",
              fontWeight: 700,
              color: `${color === "primary" ? "#1976d2" : color === "success" ? "#2e7d32" : "#d32f2f"}`,
              lineHeight: 1.2,
            }}
          >
            {typeof value === "number" ? value.toFixed(1) : value}
          </Typography>
          {unit && (
            <Typography
              variant="caption"
              component="span"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
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

export const GuiPanel: React.FC<GuiPanelProps> = ({ onClose, onOpenSettings }) => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portPath, setPortPath] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const unsubscribeDataRef = useRef<(() => void) | null>(null);
  const unsubscribeErrorRef = useRef<(() => void) | null>(null);
  const unsubscribeCloseRef = useRef<(() => void) | null>(null);

  // Загружаем настройки при монтировании
  useEffect(() => {
    const settings = loadGuiPanelSettings();
    setVisibleFields(settings.visibleFields);
  }, []);

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
          // Накапливаем данные, объединяя новые с предыдущими
          setSensorData(prev => {
            const merged = { ...(prev || {}), ...data };
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

  // Обновляем видимые поля при изменении настроек
  useEffect(() => {
    // Проверяем периодически (для обновления в той же вкладке)
    const interval = setInterval(() => {
      const settings = loadGuiPanelSettings();
      if (JSON.stringify(settings.visibleFields) !== JSON.stringify(visibleFields)) {
        setVisibleFields(settings.visibleFields);
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [visibleFields]);

  // Фильтруем данные по видимым полям
  // Если нет выбранных полей, не показываем ничего
  const displayData = sensorData && visibleFields.length > 0
    ? Object.entries(sensorData).filter(([key]) => visibleFields.includes(key))
    : [];

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        p: 1.5,
        overflow: "hidden",
      }}
    >
      {/* Кнопки управления */}
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
        {onOpenSettings && (
          <IconButton
            size="small"
            onClick={onOpenSettings}
            title="Открыть полноразмерный вид"
            sx={{ p: 0.5 }}
          >
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        )}
        {onClose && (
          <IconButton 
            size="small" 
            onClick={onClose} 
            title="Скрыть панель GUI"
            sx={{ p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Статус подключения - компактный */}
      {isConnected ? (
        <Alert severity="success" sx={{ py: 0.5, my: 0.5, fontSize: '0.7rem' }}>
          Подключен
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ py: 0.5, my: 0.5, fontSize: '0.7rem' }}>
          Ожидание...
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ py: 0.5, my: 0.5, fontSize: '0.7rem' }}>
          {error}
        </Alert>
      )}

      {/* Отображение данных - компактная сетка */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: displayData.length > 0 ? "flex-start" : "center",
          justifyContent: displayData.length > 0 ? "flex-start" : "center",
        }}
      >
        {!sensorData ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="caption" color="text.secondary">
              Ожидание данных...
            </Typography>
          </Box>
        ) : displayData.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              p: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Нет выбранных полей для отображения
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Откройте полноразмерный вид, чтобы выбрать поля для мини-панели
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
              },
              gap: 1,
              width: "100%",
            }}
          >
            {displayData.map(([key, value]) => {
              const parsed = parseField(key, value);
              
              return (
                <CompactDisplay
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
    </Box>
  );
};

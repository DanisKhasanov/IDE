import React, { useState, useRef, useEffect, useMemo } from "react";
import { Box, Typography, Chip, Menu, MenuItem, Divider } from "@mui/material";
import type {
  PinConfig,
  SelectedPinFunction,
  PinSignal,
} from "@/types/boardConfig";
import { getBoardInfo, getPins, getPeripheryDefaultSettings } from "@/utils/config/boardConfigHelpers";
import type { ProjectConfiguration } from "@/hooks/project/useProjectConfiguration";


// Размер области пина (в процентах)
const PIN_AREA_WIDTH = 4;
const PIN_AREA_HEIGHT = 3;

// Определяет сторону платы на основе координаты x
const getPinSide = (x: number): "left" | "right" => {
  return x < 50 ? "left" : "right";
};

interface PinFunctionMenuProps {
  pin: PinConfig;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onFunctionClick: (signal: PinSignal) => void;
  onFunctionRemove?: (pinName: string, functionType: string) => void;
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  pinSide?: "left" | "right";
}

const PinFunctionMenu = ({
  pin,
  anchorEl,
  open,
  onClose,
  onFunctionClick,
  onFunctionRemove,
  selectedPinFunctions,
  pinSide = "right",
}: PinFunctionMenuProps) => {
  // Показываем все сигналы как есть из конфига, без группировки
  const signals = pin.signals || [];

  const selectedFunctions = selectedPinFunctions[pin.id] || [];
  
  // Периферии, которые используют несколько пинов одновременно
  // Для них mode в signal - это роль пина (SS, MOSI, RX, TX, SDA, SCL),
  // а mode в settings - это режим работы периферии (Master, Slave)
  const multiPinPeripherals = ["SPI", "UART", "I2C"];
  
  // Таймеры с пинами (ШИМ) - для них mode в signal это канал (OC0A, OC1A и т.д.)
  const timerPWMTypes = ["TIMER0_PWM", "TIMER1_PWM", "TIMER2_PWM"];
  
  // Формируем ключи для проверки выбора
  // Для периферий с несколькими пинами проверяем только type
  // Для таймеров ШИМ - type:mode из signal (канал)
  // Для остальных - type:mode из settings
  const selectedFunctionKeys = selectedFunctions.map((f) => {
    if (multiPinPeripherals.includes(f.functionType)) {
      // Для SPI/UART/I2C проверяем только тип, так как они применяются ко всем пинам
      return f.functionType;
    }
    if (timerPWMTypes.includes(f.functionType)) {
      // Для таймеров ШИМ используем type:mode из settings (канал передается через mode)
      return `${f.functionType}:${f.settings?.mode || ""}`;
    }
    // Для других функций используем type:mode из settings
    return `${f.functionType}:${f.settings?.mode || ""}`;
  });

  // Для левой стороны меню открывается справа, для правой - слева
  const horizontalAnchor = pinSide === "left" ? "right" : "left";
  const horizontalTransform = pinSide === "left" ? "right" : "left";

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: horizontalAnchor,
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: horizontalTransform,
      }}
    >
      <Box sx={{ p: 1, minWidth: 200 }}>
        <Typography
          variant="body2"
          sx={{ mb: 1, fontWeight: "bold", fontSize: "0.75rem" }}
        >
          {pin.pin}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {signals.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Нет доступных функций
          </Typography>
        ) : (
          signals.map((signal, idx) => {
            // Формируем ключ для проверки выбора
            // Для периферий с несколькими пинами проверяем только type
            // Для таймеров ШИМ - type:mode из signal (канал)
            // Для остальных - type:mode из signal
            const signalKey = multiPinPeripherals.includes(signal.type)
              ? signal.type
              : `${signal.type}:${signal.mode}`;
            const isSelected = selectedFunctionKeys.includes(signalKey);

            const displayName = signal.metadata?.role
              ? `${signal.type} (${signal.metadata.role})`
              : signal.mode
                ? `${signal.type} (${signal.mode})`
                : signal.type;

            return (
              <MenuItem
                key={idx}
                onClick={() => {
                  if (isSelected && onFunctionRemove) {
                    // Если функция уже выбрана, удаляем её при повторном клике
                    const pinId = pin.id || pin.pin || "";
                    onFunctionRemove(pinId, signal.type);
                  } else {
                    // Если функция не выбрана, добавляем её
                    onFunctionClick(signal);
                  }
                }}
                selected={isSelected}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    width: "100%",
                  }}
                >
                  <Typography>{displayName}</Typography>
                  {isSelected && (
                    <Chip label="Активна" size="small" color="primary" />
                  )}
                </Box>
              </MenuItem>
            );
          })
        )}
      </Box>
    </Menu>
  );
};

// Функция для получения дефолтных настроек функции из сигнала
const getDefaultSettings = (signal: PinSignal): Record<string, unknown> => {
  // Таймеры ШИМ - для них mode в signal это канал (OC0A, OC1A и т.д.)
  const timerPWMTypes = ["TIMER0_PWM", "TIMER1_PWM", "TIMER2_PWM"];
  const isTimerPWM = timerPWMTypes.includes(signal.type);

  // Базовые настройки из сигнала
  let signalSettings: Record<string, unknown> = {
    ...signal.metadata,
  };

  if (isTimerPWM) {
    // Для таймеров ШИМ сохраняем канал отдельно, не в mode
    signalSettings.channel = signal.mode;
  } else {
    // Для остальных периферий mode из сигнала - это режим работы
    signalSettings.mode = signal.mode;
  }

  // Получаем настройки по умолчанию из конфига периферии с учетом текущих настроек
  // Передаем signalSettings для проверки условных настроек (например, initialState только для OUTPUT)
  const defaultSettings = getPeripheryDefaultSettings(signal.type, signalSettings);

  // Объединяем: сначала дефолты из конфига, затем перезаписываем значениями из сигнала
  const settings = {
    ...defaultSettings,
    ...signalSettings,
  };

  // Специфичные настройки для некоторых типов (для обратной совместимости)
  if (signal.type === "SPI") {
    return { speed: "fosc/16", cpol: 0, cpha: 0, ...settings };
  }
  if (signal.type === "I2C") {
    return { speed: 100000, ...settings };
  }

  return settings;
};

interface PinsListPanelProps {
  boardConfig?: any; // Оставляем для обратной совместимости, но не используем напрямую
  selectedPin: string | null;
  peripherals: ProjectConfiguration["peripherals"];
  onPinClick: (pinName: string) => void;
  onFunctionSelect: (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  onFunctionRemove?: (
    pinName: string,
    functionType?: string
  ) => void;
  size?: "small" | "medium";
}

/**
 * Преобразует новую структуру peripherals в старый формат для совместимости
 */
const convertPeripheralsToSelectedPinFunctions = (
  peripherals: ProjectConfiguration["peripherals"]
): Record<string, SelectedPinFunction[]> => {
  const result: Record<string, SelectedPinFunction[]> = {};
  
  // Проверяем, что peripherals существует и является объектом
  if (!peripherals || typeof peripherals !== 'object') {
    return result;
  }
  
  Object.entries(peripherals).forEach(([peripheralName, peripheral]) => {
    if (!peripheral || typeof peripheral !== 'object') {
      return;
    }
    
    if ('pins' in peripheral && peripheral.pins && typeof peripheral.pins === 'object') {
      Object.entries(peripheral.pins).forEach(([pinName, settings]) => {
        if (!result[pinName]) {
          result[pinName] = [];
        }
        // Находим оригинальное имя периферии (обратное преобразование)
        // Пока используем normalizedName, так как обратное преобразование сложнее
        result[pinName].push({
          pinName,
          functionType: peripheralName,
          settings: settings || {},
        });
      });
    }
  });
  
  return result;
};

export const PinsListPanel: React.FC<PinsListPanelProps> = ({
  boardConfig,
  selectedPin,
  peripherals,
  onPinClick,
  onFunctionSelect,
  onFunctionRemove,
  size = "medium",
}) => {
  // Преобразуем новую структуру в старый формат для совместимости
  const selectedPinFunctions = convertPeripheralsToSelectedPinFunctions(peripherals);
  const imageRef = useRef<HTMLImageElement>(null);
  const pinRefs = useRef<Record<string, HTMLElement | null>>({});
  const [imageLoaded, setImageLoaded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    pin: PinConfig;
    side: "left" | "right";
  } | null>(null);

  // Получаем путь к изображению из конфига
  const boardInfo = getBoardInfo();
  const pins = getPins();
  
  const boardImage = useMemo(() => {
    if (!boardInfo.image) return null;

    const imagePath = boardInfo.image;
    
    if (!imagePath.startsWith("/src/config/")) {
      return `/src/config/${imagePath}`;
    }

    return imagePath;
  }, [boardInfo.image]);

  useEffect(() => {
    if (!boardImage) {
      setImageLoaded(true);
    } else if (imageRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [boardImage]);

  const handlePinClick = (
    event: React.MouseEvent<HTMLDivElement>,
    pin: PinConfig
  ) => {
    event.stopPropagation();
    const pinId = pin.id || pin.pin || "";
    const anchorEl = pinRefs.current[pinId] || event.currentTarget;
    setMenuAnchor({
      el: anchorEl as HTMLElement,
      pin,
      side: getPinSide(pin.position.x),
    });
    onPinClick(pinId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleFunctionClick = (signal: PinSignal) => {
    if (!menuAnchor) return;
    const pinId = menuAnchor.pin.id || menuAnchor.pin.pin || "";
    onFunctionSelect(pinId, signal.type, getDefaultSettings(signal));
    setMenuAnchor(null);
  };

  return (
    <Box
      sx={{
        width: size === "small" ? "100%" : "30%",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "auto",
        }}
      >
        <Box
          sx={{
            position: "relative",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          {boardImage ? (
            <img
              ref={imageRef}
              src={boardImage}
              alt={boardInfo.name || "Board"}
              style={{
                width: size === "small" ? "15vw" : "23vw",
                opacity: 0.8,
              }}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                // Скрываем изображение при ошибке загрузки
                const target = e.currentTarget;
                target.style.display = "none";
                console.error(`Ошибка загрузки изображения для платы ${boardInfo.id}`);
              }}
            />
          ) : (
            <Box
              sx={{
                width: size === "small" ? "15vw" : "23vw",
                height: size === "small" ? "15vw" : "23vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                Изображение платы
                <br />
                не найдено
              </Typography>
            </Box>
          )}

          {/* Точки для визуализации координат пинов */}
          {pins.map((pin) => {
            if (!pin.position || !imageLoaded) return null;

            const pinId = pin.id || pin.pin || "";
            const hasFunction = Boolean(selectedPinFunctions[pinId]?.length);
            const dotColor = hasFunction
              ? "#00ff00"
              : selectedPin === pinId
                ? "#1976d2"
                : "#ff0000";

            return (
              <Box
                key={`dot-${pinId}`}
                ref={(el: HTMLElement | null) => {
                  if (el) {
                    pinRefs.current[pinId] = el;
                  } else {
                    delete pinRefs.current[pinId];
                  }
                }}
                onClick={(e) => handlePinClick(e, pin)}
                sx={{
                  position: "absolute",
                  left: `${pin.position.x + PIN_AREA_WIDTH / 2}%`,
                  top: `${pin.position.y + PIN_AREA_HEIGHT / 2}%`,
                  transform: "translate(-80%, -50%)",
                  zIndex: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  flexDirection: getPinSide(pin.position.x) === "left" ? "row-reverse" : "row",
                  cursor: "pointer",
                  padding: "2px",
                  "&:hover": {
                    transform: "translate(-80%, -50%) scale(1.1)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "30%",
                    backgroundColor: dotColor,
                    ...(selectedPin === pinId && !hasFunction && {
                      animation: "blink-red-blue 2s ease-in-out infinite",
                      "@keyframes blink-red-blue": {
                        "0%, 100%": {
                          backgroundColor: "#1976d2",
                          boxShadow: "0 0 5px #1976d2, 0 0 10px #1976d2",
                        },
                        "50%": {
                          backgroundColor: "#ff0000",
                          boxShadow: "0 0 5px #ff0000, 0 0 10px #ff0000",
                        },
                      },
                    }),
                    ...(selectedPin === pinId && hasFunction && {
                      animation: "blink-red-green 2s ease-in-out infinite",
                      "@keyframes blink-red-green": {
                        "0%, 100%": {
                          backgroundColor: "#00ff00",
                          boxShadow: "0 0 5px #00ff00, 0 0 10px #00ff00",
                        },
                        "50%": {
                          backgroundColor: "#ff0000",
                          boxShadow: "0 0 5px #ff0000, 0 0 10px #ff0000",
                        },
                      },
                    }),
                  }}
                  title={`${pinId}: x=${pin.position.x}%, y=${pin.position.y}%`}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pinId}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Меню выбора функции */}
      {menuAnchor && (
        <PinFunctionMenu
          pin={menuAnchor.pin}
          anchorEl={menuAnchor.el}
          open={true}
          onClose={handleMenuClose}
          onFunctionClick={handleFunctionClick}
          onFunctionRemove={onFunctionRemove}
          selectedPinFunctions={selectedPinFunctions}
          pinSide={menuAnchor.side}
        />
      )}
    </Box>
  );
};

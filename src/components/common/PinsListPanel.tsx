import React, { useState, useRef, useEffect, useMemo } from "react";
import { Box, Typography, Chip, Menu, MenuItem, Divider } from "@mui/material";
import type {
  BoardConfig,
  PinConfig,
  PinFunction,
  SelectedPinFunction,
  PinSignal,
} from "@/types/boardConfig";


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
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  pinSide?: "left" | "right";
}

const PinFunctionMenu: React.FC<PinFunctionMenuProps> = ({
  pin,
  anchorEl,
  open,
  onClose,
  onFunctionClick,
  selectedPinFunctions,
  pinSide = "right",
}) => {
  // Показываем все сигналы как есть из конфига, без группировки
  const signals = pin.signals || [];

  const selectedFunctions = selectedPinFunctions[pin.id] || [];
  const selectedFunctionKeys = selectedFunctions.map(
    (f) => `${f.functionType}:${f.settings?.mode || ""}`
  );

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
            // Формируем ключ для проверки выбора: type:mode
            const signalKey = `${signal.type}:${signal.mode}`;
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
                  onFunctionClick(signal);
                }}
                selected={isSelected}
                disabled={isSelected}
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
  const settings = {
    mode: signal.mode,
    ...signal.metadata,
  };

  if (signal.type === "SPI") {
    return { speed: "fosc/16", cpol: 0, cpha: 0, ...settings };
  }
  if (signal.type === "I2C") {
    return { speed: 100000, ...settings };
  }

  return settings;
};

interface PinsListPanelProps {
  boardConfig: BoardConfig | null;
  selectedPin: string | null;
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  onPinClick: (pinName: string) => void;
  onFunctionSelect: (
    pinName: string,
    functionType: string,
    settings: Record<string, unknown>
  ) => void;
  size?: "small" | "medium";
}

export const PinsListPanel: React.FC<PinsListPanelProps> = ({
  boardConfig,
  selectedPin,
  selectedPinFunctions,
  onPinClick,
  onFunctionSelect,
  size = "medium",
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const pinRefs = useRef<Record<string, HTMLElement | null>>({});
  const [imageLoaded, setImageLoaded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    pin: PinConfig;
    side: "left" | "right";
  } | null>(null);

  // Получаем путь к изображению из конфига
  const boardImage = useMemo(() => {
    if (!boardConfig?.image) return null;

    const imagePath = boardConfig.image;
    
    if (!imagePath.startsWith("/src/config/")) {
      return `/src/config/${imagePath}`;
    }

    return imagePath;
  }, [boardConfig?.image]);

  useEffect(() => {
    if (!boardImage) {
      setImageLoaded(true);
    } else if (imageRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [boardImage]);

  if (!boardConfig) {
    return null;
  }

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
              alt={boardConfig.name || "Board"}
              style={{
                width: size === "small" ? "15vw" : "23vw",
                opacity: 0.8,
              }}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                // Скрываем изображение при ошибке загрузки
                const target = e.currentTarget;
                target.style.display = "none";
                console.error(`Ошибка загрузки изображения для платы ${boardConfig.id}`);
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
          {boardConfig.pins.map((pin) => {
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
          selectedPinFunctions={selectedPinFunctions}
          pinSide={menuAnchor.side}
        />
      )}
    </Box>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, Chip, Menu, MenuItem, Divider } from "@mui/material";
import type {
  BoardConfig,
  PinConfig,
  PinFunction,
  SelectedPinFunction,
} from "@/types/boardConfig";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - изображение импортируется через Vite, типы определены в global.d.ts
import arduinoUnoImage from "@assets/arduino-uno.png";

// Интерфейс для координат пина на изображении
interface PinCoordinates {
  x: number; // процент от ширины изображения
  y: number; // процент от высоты изображения
  width: number; // процент от ширины изображения
  height: number; // процент от высоты изображения
  side: "left" | "right"; // сторона платы
}

// Координаты в процентах от размеров изображения
const PIN_COORDINATES: Record<string, PinCoordinates> = {
  // Левая сторона - POWER и ANALOG IN
  // A0-A5 (сверху вниз)
  PC0: { x: 3.6, y: 74, width: 4, height: 3, side: "left" }, // A0
  PC1: { x: 3.6, y: 77, width: 4, height: 3, side: "left" }, // A1
  PC2: { x: 3.6, y: 80.5, width: 4, height: 3, side: "left" }, // A2
  PC3: { x: 3.6, y: 83.7, width: 4, height: 3, side: "left" }, // A3
  PC4: { x: 3.6, y: 87, width: 4, height: 3, side: "left" }, // A4
  PC5: { x: 3.6, y: 90, width: 4, height: 3, side: "left" }, // A5

  // Правая сторона - DIGITAL
  // D13-D0 (сверху вниз)
  PB5: { x: 99.2, y: 46.2, width: 4, height: 3, side: "right" }, // D13
  PB4: { x: 99.2, y: 49.2, width: 4, height: 3, side: "right" }, // D12
  PB3: { x: 99.2, y: 52.3, width: 4, height: 3, side: "right" }, // D11
  PB2: { x: 99.2, y: 55.5, width: 4, height: 3, side: "right" }, // D10
  PB1: { x: 99.2, y: 58.8, width: 4, height: 3, side: "right" }, // D9
  PB0: { x: 99.2, y: 62.2, width: 4, height: 3, side: "right" }, // D8
  PD7: { x: 99.2, y: 67, width: 4, height: 3, side: "right" }, // D7
  PD6: { x: 99.2, y: 70.2, width: 4, height: 3, side: "right" }, // D6
  PD5: { x: 99.2, y: 73.4, width: 4, height: 3, side: "right" }, // D5
  PD4: { x: 99.2, y: 76.8, width: 4, height: 3, side: "right" }, // D4
  PD3: { x: 99.2, y: 80, width: 4, height: 3, side: "right" }, // D3
  PD2: { x: 99.2, y: 83.2, width: 4, height: 3, side: "right" }, // D2
  PD1: { x: 99.2, y: 86.6, width: 4, height: 3, side: "right" }, // D1 (TX)
  PD0: { x: 99.2, y: 90, width: 4, height: 3, side: "right" }, // D0 (RX)
};

interface PinFunctionMenuProps {
  pin: PinConfig;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onFunctionClick: (func: PinFunction) => void;
  getPinFunctions: (pin: PinConfig) => PinFunction[];
  selectedPinFunctions: Record<string, SelectedPinFunction[]>;
  pinSide?: "left" | "right";
}

const PinFunctionMenu: React.FC<PinFunctionMenuProps> = ({
  pin,
  anchorEl,
  open,
  onClose,
  onFunctionClick,
  getPinFunctions,
  selectedPinFunctions,
  pinSide = "right",
}) => {
  const functions = getPinFunctions(pin);
  const selectedFunctions = selectedPinFunctions[pin.pin] || [];
  const selectedFunctionTypes = selectedFunctions.map((f) => f.functionType);

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
        {functions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Нет доступных функций
          </Typography>
        ) : (
          functions.map((func, idx) => {
            const isSelected = selectedFunctionTypes.includes(func.type);
            return (
              <MenuItem
                key={idx}
                onClick={() => {
                  onFunctionClick(func);
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
                  <Typography>
                    {func.type}
                    {func.role && ` (${func.role})`}
                  </Typography>
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

// Функция для получения дефолтных настроек функции
const getDefaultSettings = (funcType: string): Record<string, unknown> => {
  if (funcType === "GPIO") return { mode: "INPUT" };
  if (funcType === "PCINT") return {};
  if (funcType === "ANALOG_COMPARATOR") return { mode: "Interrupt" };
  if (funcType === "SPI")
    return { mode: "Master", speed: "fosc/16", cpol: 0, cpha: 0 };
  if (funcType === "I2C") return { mode: "Master", speed: 100000 };
  return {};
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
  getPinFunctions: (pin: PinConfig) => PinFunction[];
  size?: "small" | "medium";
}

export const PinsListPanel: React.FC<PinsListPanelProps> = ({
  boardConfig,
  selectedPin,
  selectedPinFunctions,
  onPinClick,
  onFunctionSelect,
  getPinFunctions,
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

  // Проверяем, загружено ли изображение (включая кэшированные изображения)
  useEffect(() => {
    if (imageRef.current?.complete) {
      setImageLoaded(true);
    }
  }, []);

  if (!boardConfig) {
    return null;
  }

  const handlePinClick = (
    event: React.MouseEvent<HTMLDivElement>,
    pin: PinConfig
  ) => {
    event.stopPropagation();
    const coords = PIN_COORDINATES[pin.pin];
    const pinSide = coords?.side || "right";
    // Всегда используем интерактивную область как anchor, чтобы меню позиционировалось одинаково
    const interactiveArea = pinRefs.current[pin.pin];
    if (interactiveArea) {
      setMenuAnchor({ el: interactiveArea, pin, side: pinSide });
    } else {
      setMenuAnchor({ el: event.currentTarget, pin, side: pinSide });
    }
    onPinClick(pin.pin);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleFunctionClick = (func: PinFunction) => {
    if (!menuAnchor) return;
    // Сразу выбираем функцию с дефолтными настройками
    const defaultSettings = getDefaultSettings(func.type);
    onFunctionSelect(menuAnchor.pin.pin, func.type, defaultSettings);
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
          <img
            ref={imageRef}
            src={arduinoUnoImage}
            alt="Arduino Uno"
            style={{
              width: size === "small" ? "15vw" : "23vw",
              opacity: 0.8,
            }}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Точки для визуализации координат пинов */}
          {boardConfig.pins.map((pin) => {
            const coords = PIN_COORDINATES[pin.pin];
            if (!coords || !imageLoaded) return null;

            // Центр области пина
            const centerX = coords.x + coords.width / 2;
            const centerY = coords.y + coords.height / 2;
            const isSelected = selectedPin === pin.pin;
            const hasFunction =
              selectedPinFunctions[pin.pin] &&
              selectedPinFunctions[pin.pin].length > 0;

            // Определяем цвет точки: зеленый если есть в настройках (приоритет), синий если выбран, красный если нет
            const dotColor = hasFunction
              ? "#00ff00"
              : isSelected
                ? "#1976d2"
                : "#ff0000";

            return (
              <Box
                key={`dot-${pin.pin}`}
                ref={(el: HTMLElement | null) => {
                  if (el) {
                    pinRefs.current[pin.pin] = el;
                  } else {
                    delete pinRefs.current[pin.pin];
                  }
                }}
                onClick={(e) => handlePinClick(e, pin)}
                sx={{
                  position: "absolute",
                  left: `${centerX}%`,
                  top: `${centerY}%`,
                  transform: "translate(-80%, -50%)",
                  zIndex: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  flexDirection: coords.side === "left" ? "row-reverse" : "row",
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
                  title={`${pin.pin}: x=${coords.x}%, y=${coords.y}%`}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pin.pin}
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
          getPinFunctions={getPinFunctions}
          selectedPinFunctions={selectedPinFunctions}
          pinSide={menuAnchor.side}
        />
      )}
    </Box>
  );
};

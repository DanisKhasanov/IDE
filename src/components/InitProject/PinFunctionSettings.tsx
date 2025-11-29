import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  Button,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { PinConfig, PinFunction, SelectedPinFunction } from "../../types/boardConfig";
import { RenderSettings } from "../../utils/init-project/RenderSettings";

interface PinFunctionSettingsProps {
  pin: PinConfig;
  func: PinFunction;
  onSelect: (settings: Record<string, any>) => void;
  onRemove: () => void;
  isSelected: boolean;
  currentSettings: Record<string, any> | null;
  selectedFunction: SelectedPinFunction | null;
  boardConfig: any;
}

export const PinFunctionSettings: React.FC<PinFunctionSettingsProps> = ({
  func,
  onSelect,
  onRemove,
  isSelected,
  currentSettings,
  selectedFunction,
  boardConfig,
}) => {
  const hasOtherFunction = selectedFunction && selectedFunction.functionType !== func.type;

  // Инициализация настроек по умолчанию
  const getDefaultSettings = (): Record<string, any> => {
    if (currentSettings) return currentSettings;
    if (func.type === "PCINT") return {};
    if (func.type === "ANALOG_COMPARATOR") return { interruptMode: "Both" };
    return {};
  };

  const [settings, setSettings] = useState<Record<string, any>>(getDefaultSettings);

  // Обновляем настройки при изменении currentSettings
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    } else {
      // Сбрасываем на настройки по умолчанию
      if (func.type === "PCINT") {
        setSettings({});
      } else if (func.type === "ANALOG_COMPARATOR") {
        setSettings({ interruptMode: "Both" });
      } else {
        setSettings({});
      }
    }
  }, [currentSettings, func.type]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSelect(newSettings);
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
          <Typography>{func.type}</Typography>
          {isSelected && <Chip label="Активна" size="small" color="primary" />}
          {hasOtherFunction && !isSelected && (
            <Chip label="Заменит текущую" size="small" color="warning" />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {hasOtherFunction && !isSelected && (
          <Alert severity="info" sx={{ mb: 2 }}>
            На этом пине уже выбрана функция {selectedFunction?.functionType}. Выбор этой
            функции заменит текущую.
          </Alert>
        )}
        <RenderSettings
          func={func}
          settings={settings}
          onSettingChange={handleSettingChange}
          boardConfig={boardConfig}
        />
        {isSelected ? (
          <Button
            variant="outlined"
            color="error"
            size="small"
            fullWidth
            sx={{ mt: 2 }}
            onClick={onRemove}
          >
            Удалить функцию
          </Button>
        ) : (
          <Button
            variant="contained"
            size="small"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => onSelect(settings)}
          >
            {hasOtherFunction ? "Заменить функцию" : "Выбрать функцию"}
          </Button>
        )}
      </AccordionDetails>
    </Accordion>
  );
};


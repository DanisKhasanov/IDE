import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
} from "@mui/material";

import {
  getPeripheryFieldUIConfig,
  getPeripheryFieldConfig,
  configKeyToSettingsKey,
  getPeripheryMetadata,
  shouldShowConfigField,
} from "@/utils/config/boardConfigHelpers";
import type { PinSignal } from "@/types/boardConfig";

interface FieldRendererProps {
  peripheryName: string;
  configKey: string;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  sx?: any;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  peripheryName,
  configKey,
  settings,
  onSettingChange,
  sx,
}) => {
  const fieldConfig = getPeripheryFieldConfig(peripheryName, configKey);
  const uiConfig = getPeripheryFieldUIConfig(peripheryName, configKey);

  if (!fieldConfig) return null;

  // Проверяем, нужно ли показывать поле
  if (!shouldShowConfigField(peripheryName, configKey, settings)) {
    return null;
  }

  const settingsKey = configKeyToSettingsKey(configKey);
  const componentType = uiConfig?.component || "Select";
  const valueType = uiConfig?.valueType || "string";
  const defaultValue = fieldConfig.defaultValue;
  const currentValue = settings[settingsKey] ?? defaultValue;

  // Получаем значения из конфигурации периферии
  const fieldValues = fieldConfig.values || [];

  const handleChange = (value: any) => {
    // Преобразуем значение в нужный тип
    let processedValue = value;
    if (valueType === "number") {
      processedValue = value === "" ? undefined : parseInt(value, 10);
    } else if (valueType === "boolean") {
      processedValue = Boolean(value);
    }
    onSettingChange(settingsKey, processedValue);
  };

  // Рендерим поле в зависимости от типа компонента
  switch (componentType) {
    case "Select": {
      return (
        <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0, ...sx }}>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>{fieldConfig.name}</InputLabel>
            <Select
              value={currentValue ?? ""}
              label={fieldConfig.name}
              onChange={(e) => handleChange(e.target.value)}
            >
              {fieldValues.map((val) => (
                <MenuItem key={String(val)} value={val}>
                  {String(val)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      );
    }

    case "TextField": {
      const metadata = getPeripheryMetadata(peripheryName);
      const inputProps = uiConfig?.inputProps || {};

      // Если есть метаданные для вычисления max значения (например, maxOCRValue)
      if (fieldConfig.metadata?.useMaxFromPeriphery && metadata) {
        const maxKey = fieldConfig.metadata.useMaxFromPeriphery;
        if (metadata[maxKey] !== undefined) {
          inputProps.max = metadata[maxKey];
        }
      }

      return (
        <Box sx={{ flex: "1 1 calc(50% - 8px)", minWidth: 0, ...sx }}>
          <TextField
            fullWidth
            size="small"
            type={valueType === "number" ? "number" : "text"}
            label={fieldConfig.name}
            value={currentValue ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            inputProps={inputProps}
            helperText={
              uiConfig?.helperText ||
              (inputProps.max ? `0-${inputProps.max}` : undefined)
            }
            sx={{ mt: 1 }}
          />
        </Box>
      );
    }

    case "Checkbox": {
      return (
        <Box sx={{ width: "100%", ...sx }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(currentValue)}
                onChange={(e) => handleChange(e.target.checked)}
              />
            }
            label={<Typography variant="body2">{fieldConfig.name}</Typography>}
          />
        </Box>
      );
    }

    default:
      return null;
  }
};

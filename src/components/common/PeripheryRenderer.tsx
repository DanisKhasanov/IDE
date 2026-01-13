import { Box, Alert, Typography } from "@mui/material";
import { FieldRenderer } from "./FieldRenderer";
import {
  getPeriphery,
  getPeripheryInterrupts,
  shouldShowConfigField,
} from "@/utils/config/boardConfigHelpers";
import { FormControlLabel, Checkbox } from "@mui/material";

interface PeripheryRendererProps {
  peripheryName: string;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

export const PeripheryRenderer = ({
  peripheryName,
  settings,
  onSettingChange,
}: PeripheryRendererProps) => {
  const periphery = getPeriphery(peripheryName);
  const config = periphery?.ui?.config;
  if (!config) return null;

  const interrupts = getPeripheryInterrupts(peripheryName);
  // enableInterrupt определяется наличием одного прерывания в ui.interrupts
  const enableInterrupt = interrupts && Object.keys(interrupts).length === 1;

  // Получаем все поля конфигурации
  const configFields = Object.keys(config);

  // Рендерим информационные сообщения
  const alerts = periphery?.ui?.alerts;

  return (
    <>
      {/* Информационные сообщения */}
      {alerts?.map((alert, index) => {
        if (alert.showWhen === "always" || !alert.showWhen) {
          return (
            <Alert
              key={index}
              severity={alert.severity || "info"}
              sx={{ mt: 1, mb: 1 }}
            >
              <Typography variant="body2">{alert.message}</Typography>
            </Alert>
          );
        }
        return null;
      })}

      {/* Рендерим все поля конфигурации */}
      <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
        {configFields.map((configKey) => (
          <FieldRenderer
            key={configKey}
            peripheryName={peripheryName}
            configKey={configKey}
            settings={settings}
            onSettingChange={onSettingChange}
          />
        ))}
      </Box>

      {/* Рендерим прерывания для периферий с enableInterrupt флагом, потому что имеют одно прерывание */}
      {enableInterrupt && interrupts && (
        <>
          <Typography variant="body2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
            Прерывания:
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Object.entries(interrupts).map(([key, info]) => {
              const interruptAppliesTo = (info as any).appliesTo;

              // Проверяем, нужно ли показывать прерывание
              if (interruptAppliesTo) {
                const shouldShow = shouldShowConfigField(
                  peripheryName,
                  `interrupt_${key}`,
                  settings
                );
                if (!shouldShow) return null;
              }

              const settingKey = `enable${key}Interrupt`;
              // В новом формате может быть defaultEnabled
              const defaultEnabled = (info as any).defaultEnabled || false;
              return (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={settings[settingKey] ?? defaultEnabled}
                      onChange={(e) =>
                        onSettingChange(settingKey, e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {info.name} - {info.description}
                    </Typography>
                  }
                />
              );
            })}
          </Box>
        </>
      )}

      {/* Для периферий без enableInterrupt флага, но с прерываниями (например, UART, потому что имеют независимые прерывания) */}
      {!enableInterrupt && interrupts && (
        <>
          <Typography variant="body2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
            Прерывания:
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Object.entries(interrupts).map(([key, info]) => {
              const interruptAppliesTo = (info as any).appliesTo;

              // Проверяем, нужно ли показывать прерывание
              if (interruptAppliesTo) {
                const shouldShow = shouldShowConfigField(
                  peripheryName,
                  `interrupt_${key}`,
                  settings
                );
                if (!shouldShow) return null;
              }

              const settingKey = `enable${key}Interrupt`;
              // В новом формате может быть defaultEnabled
              const defaultEnabled = (info as any).defaultEnabled || false;
              return (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={settings[settingKey] ?? defaultEnabled}
                      onChange={(e) =>
                        onSettingChange(settingKey, e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {info.name} - {info.description}
                    </Typography>
                  }
                />
              );
            })}
          </Box>
        </>
      )}
    </>
  );
};

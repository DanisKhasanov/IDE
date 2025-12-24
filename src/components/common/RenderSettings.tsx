import React from "react";
import type { PinFunction } from "@/types/boardConfig";
import {
  getDependentFieldsToClean,
  settingsKeyToConfigKey,
} from "@/utils/config/boardConfigHelpers";
import { PeripheryRenderer } from "./PeripheryRenderer";

interface RenderSettingsProps {
  func: PinFunction | { type: string; modes?: string[] };
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

export const RenderSettings: React.FC<RenderSettingsProps> = ({
  func,
  settings,
  onSettingChange,
}) => {
  const handleSettingChange = (key: string, value: any) => {
    // Определяем, какие зависимые поля нужно очистить на основе конфига
    const configKey = settingsKeyToConfigKey(key);
    const dependentFields = getDependentFieldsToClean(
      func.type,
      configKey,
      value,
      settings
    );

    // Очищаем зависимые поля перед обновлением текущего поля
    dependentFields.forEach((fieldKey) => {
      onSettingChange(fieldKey, undefined);
    });

    // Обновляем текущее поле
    onSettingChange(key, value);
  };

  // Определяем, какие периферии можно рендерить универсально
  const universalPeripheries = [
    "GPIO",
    "UART",
    "SPI",
    "I2C",
    "ADC",
    "WATCHDOG",
    "EXTERNAL_INTERRUPT",
    "PCINT",
    "ANALOG_COMPARATOR",
    "TIMER0_PWM",
    "TIMER1_PWM",
    "TIMER2_PWM",
  ];

  // Для универсальных периферий используем универсальный рендерер
  if (universalPeripheries.includes(func.type)) {
    return (
      <PeripheryRenderer
        peripheryName={func.type}
        settings={settings}
        onSettingChange={handleSettingChange}
      />
    );
  }

  return null;
};

# Конфигурация пинов микроконтроллера (pins.json)

## Описание

Файл `pins.json` содержит конфигурацию всех пинов микроконтроллера с указанием доступных функций и сигналов для каждого пина. Структура разработана для поддержки различных архитектур микроконтроллеров (ATmega, STM32 и других).

## Структура пина

### Основные поля

```json
{
  "id": "PB0",           // Уникальный идентификатор пина (PB0, PA5, etc.)
  "port": "B",           // Буква порта (A, B, C, D...)
  "number": 0,           // Номер пина в порту (0-15)
  "position": {          // Координаты для визуализации на схеме платы
    "x": 99.2,           // X координата в процентах (0-100)
    "y": 62.2,           // Y координата в процентах (0-100)
  },
  "signals": [...]       // Массив доступных сигналов/функций пина
}
```

## Структура сигнала

### Поля сигнала

```json
{
  "type": "GPIO", // Тип периферии
  "mode": "INPUT", // Режим/роль сигнала
  "metadata": {} // Дополнительные метаданные
}
```

### Метаданные (metadata)

Пример объектов с дополнительными данными о сигнале:

```json
{
  "channel": "OC1A", // Канал таймера (OC1A, OC2B, IC1, CH1, etc.)
  "role": "TX", // Роль сигнала:
  // - "TX" | "RX" | "MOSI" | "MISO" | "SCK" | "SS"
  // - "SDA" | "SCL"
  // - "OUTPUT_COMPARE" | "INPUT_CAPTURE" | "PWM"
  // - "ANALOG_INPUT" | "EXTERNAL_INTERRUPT"
  "number": 0, // Номер прерывания/канала:
  // - Для PCINT: номер прерывания (0-23)
  // - Для ADC: номер канала (0-5 или 0-15)
  // - Для EXTI (STM32): номер линии EXTI (0-15)
  "group": "PCINT0-7", // Группа прерываний (для ATmega):
  // - "PCINT0-7" (PORTB: PB0-PB5)
  // - "PCINT8-14" (PORTC: PC0-PC5)
  // - "PCINT16-23" (PORTD: PD0-PD7)
  "interrupt": "INT0", // Тип прерывания (INT0, INT1)
  "input": "AIN0", // Вход аналогового компаратора (AIN0, AIN1)
  "alternateFunction": null // Номер Alternate Function:
  // - null для ATmega (функции пинов фиксированы)
  // - 0-15 для STM32 (номер AF функции)
}
```

## Примеры использования

### Пример 1: ATmega пин

```json
{
  "id": "PB1",
  "port": "B",
  "number": 1,
  "position": {
    "x": 99.2,
    "y": 58.8,
    "side": "right"
  },
  "signals": [
    {
      "type": "GPIO",
      "mode": "INPUT",
      "metadata": {}
    },
    {
      "type": "GPIO",
      "mode": "OUTPUT",
      "metadata": {}
    },
    {
      "type": "TIMER1",
      "mode": "OC1A",
      "metadata": {
        "channel": "OC1A",
        "role": "OUTPUT_COMPARE"
      }
    },
    {
      "type": "PCINT",
      "mode": "INTERRUPT",
      "metadata": {
        "number": 1,
        "group": "PCINT0-7"
      }
    }
  ]
}
```

### Пример 2: STM32 пин

```json
{
  "id": "PA5",
  "port": "A",
  "number": 5,
  "position": {
    "x": 50,
    "y": 50,
    "side": "left"
  },
  "signals": [
    {
      "type": "GPIO",
      "mode": "INPUT",
      "metadata": {
        "exti": 5
      }
    },
    {
      "type": "GPIO",
      "mode": "OUTPUT",
      "metadata": {}
    },
    {
      "type": "SPI1",
      "mode": "SCK",
      "metadata": {
        "alternateFunction": 5,
        "role": "SCK"
      }
    },
    {
      "type": "TIM2",
      "mode": "CH1",
      "metadata": {
        "alternateFunction": 1,
        "channel": "CH1",
        "role": "PWM"
      }
    }
  ]
}
```

# Ограничения и конфликты (constraints.json)

## Описание

Файл `constraints.json` содержит правила ограничений и конфликтов при использовании периферийных устройств. Эти правила используются для валидации конфигурации и предотвращения конфликтов между периферией и пинами.

## Структура ограничения

### Основные поля

```json
{
  "id": "CONSTRAINT_ID",       // Уникальный идентификатор ограничения
  "description": "...",        // Описание ограничения
  "when": {...},               // Условие активации ограничения
  "conflicts": [...]           // Массив конфликтов
}
```

## Структура условия (when)

### Поля условия

```json
{
  "periphery": "UART",         // Идентификатор периферии
  "enabled": true,             // Периферия включена (опционально)
  "mode": "Master"             // Режим работы периферии (опционально)
}
```

Условие активируется, когда:
- Периферия с указанным `id` включена (`enabled: true`)
- Или периферия работает в указанном режиме (`mode: "..."`)

## Структура конфликта (conflicts)

### Типы конфликтов

#### 1. Резервирование пинов (reservePins)

```json
{
  "type": "reservePins",
  "pins": ["PD0", "PD1"],      // Массив пинов для резервирования
  "reason": "UART TX/RX signals" // Причина резервирования
}
```

Этот тип конфликта указывает, что указанные пины должны быть зарезервированы для периферии и не могут использоваться для других целей.

## Примеры использования

### Пример 1: UART резервирует пины

```json
{
  "id": "UART_PIN_CONFLICT",
  "description": "UART использует фиксированные пины PD0 (RX) и PD1 (TX)",
  "when": {
    "periphery": "UART",
    "enabled": true
  },
  "conflicts": [
    {
      "type": "reservePins",
      "pins": ["PD0", "PD1"],
      "reason": "UART TX/RX signals"
    }
  ]
}
```

**Интерпретация:** Когда UART включен, пины PD0 и PD1 автоматически резервируются и не могут быть использованы для других периферий или GPIO.

### Пример 2: SPI Master режим

```json
{
  "id": "SPI_MASTER_PIN_CONFLICT",
  "description": "SPI Master использует фиксированные пины",
  "when": {
    "periphery": "SPI",
    "mode": "Master"
  },
  "conflicts": [
    {
      "type": "reservePins",
      "pins": ["PB2", "PB3", "PB5"],
      "reason": "SPI Master signals (SS, MOSI, SCK)"
    }
  ]
}
```

**Интерпретация:** Когда SPI работает в режиме Master, резервируются пины SS (PB2), MOSI (PB3) и SCK (PB5). Пин MISO (PB4) не резервируется, так как в режиме Master он используется как вход.

### Пример 3: SPI Slave режим

```json
{
  "id": "SPI_SLAVE_PIN_CONFLICT",
  "description": "SPI Slave использует все пины SPI",
  "when": {
    "periphery": "SPI",
    "mode": "Slave"
  },
  "conflicts": [
    {
      "type": "reservePins",
      "pins": ["PB2", "PB3", "PB4", "PB5"],
      "reason": "SPI Slave signals (SS, MOSI, MISO, SCK)"
    }
  ]
}
```

**Интерпретация:** В режиме Slave все пины SPI резервируются, включая MISO (PB4), который используется как выход.

### Пример 4: I2C резервирует пины

```json
{
  "id": "I2C_PIN_CONFLICT",
  "description": "I2C использует фиксированные пины PC4 (SDA) и PC5 (SCL)",
  "when": {
    "periphery": "I2C",
    "enabled": true
  },
  "conflicts": [
    {
      "type": "reservePins",
      "pins": ["PC4", "PC5"],
      "reason": "I2C SDA/SCL signals"
    }
  ]
}
```

**Интерпретация:** При включении I2C резервируются пины SDA (PC4) и SCL (PC5).

## Полный пример файла

```json
[
  {
    "id": "UART_PIN_CONFLICT",
    "description": "UART использует фиксированные пины PD0 (RX) и PD1 (TX)",
    "when": {
      "periphery": "UART",
      "enabled": true
    },
    "conflicts": [
      {
        "type": "reservePins",
        "pins": ["PD0", "PD1"],
        "reason": "UART TX/RX signals"
      }
    ]
  },
  {
    "id": "SPI_MASTER_PIN_CONFLICT",
    "description": "SPI Master использует фиксированные пины",
    "when": {
      "periphery": "SPI",
      "mode": "Master"
    },
    "conflicts": [
      {
        "type": "reservePins",
        "pins": ["PB2", "PB3", "PB5"],
        "reason": "SPI Master signals (SS, MOSI, SCK)"
      }
    ]
  },
  {
    "id": "SPI_SLAVE_PIN_CONFLICT",
    "description": "SPI Slave использует все пины SPI",
    "when": {
      "periphery": "SPI",
      "mode": "Slave"
    },
    "conflicts": [
      {
        "type": "reservePins",
        "pins": ["PB2", "PB3", "PB4", "PB5"],
        "reason": "SPI Slave signals (SS, MOSI, MISO, SCK)"
      }
    ]
  },
  {
    "id": "I2C_PIN_CONFLICT",
    "description": "I2C использует фиксированные пины PC4 (SDA) и PC5 (SCL)",
    "when": {
      "periphery": "I2C",
      "enabled": true
    },
    "conflicts": [
      {
        "type": "reservePins",
        "pins": ["PC4", "PC5"],
        "reason": "I2C SDA/SCL signals"
      }
    ]
  }
]
```

## Примечания

- Файл содержит массив ограничений, каждое из которых проверяется независимо.
- Ограничения применяются автоматически при включении соответствующей периферии.
- Идентификатор периферии в поле `when.periphery` должен соответствовать идентификатору из `peripheries.json`.
- Режим работы (`mode`) должен соответствовать одному из значений из конфигурации периферии.
- Зарезервированные пины не могут быть использованы для других периферий или настроены как GPIO в других режимах.
- Система валидации должна проверять все активные ограничения перед генерацией кода.


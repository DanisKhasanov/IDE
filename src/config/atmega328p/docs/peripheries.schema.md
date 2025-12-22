# Конфигурация периферийных устройств (peripheries.json)

## Описание

Файл `peripheries.json` содержит описание всех доступных периферийных устройств микроконтроллера, их конфигурационных параметров, доступных прерываний и привязки к пинам. Этот файл используется для генерации пользовательского интерфейса настройки периферий и валидации конфигурации.

## Структура периферии

### Основные поля

```json
{
  "id": "UART",                // Уникальный идентификатор периферии
  "name": "Universal Asynchronous Receiver/Transmitter", // Полное название
  "config": {...},             // Конфигурационные параметры
  "interrupts": {...},         // Доступные прерывания (опционально)
  "pinMapping": {...},         // Привязка сигналов к пинам
  "enableInterrupt": true,     // Флаг поддержки прерываний (опционально)
  "channels": [...]            // Каналы периферии (для таймеров, опционально)
}
```

## Структура конфигурации (config)

### Поля конфигурации

Каждый параметр конфигурации имеет следующую структуру:

```json
{
  "parameterName": {
    "name": "Название параметра",  // Отображаемое название
    "values": [...]                // Массив допустимых значений
  }
}
```

### Типы параметров

- **modes** - режимы работы периферии (например, "Master"/"Slave" для SPI)
- **baudRates** - скорости передачи для UART
- **dataBits** - количество бит данных
- **stopBits** - количество стоп-битов
- **parity** - тип проверки чётности
- **speeds** - скорости работы (для SPI, I2C)
- **prescalers** - делители частоты (для таймеров, ADC)
- **channels** - номера каналов (для ADC)
- **reference** - опорное напряжение (для ADC)
- **triggers** - типы триггеров (для прерываний)
- **timeouts** - таймауты (для Watchdog)

## Структура прерываний (interrupts)

### Поля прерывания

```json
{
  "INTERRUPT_ID": {
    "name": "INTERRUPT_vect",      // Имя вектора прерывания
    "description": "Описание..."   // Описание назначения прерывания
  }
}
```

## Структура привязки пинов (pinMapping)

### Формат pinMapping

Привязка может быть представлена в двух форматах:

1. **По сигналам** (для периферий с несколькими сигналами):
```json
{
  "TX": ["PD1"],
  "RX": ["PD0"]
}
```

2. **По каналам** (для периферий с каналами):
```json
{
  "OC1A": ["PB1"],
  "OC1B": ["PB2"],
  "IC1": ["PD0"]
}
```

3. **Общий массив** (для GPIO):
```json
{
  "pins": ["PB0", "PB1", "PB2", ...]
}
```

## Примеры использования

### Пример 1: GPIO

```json
{
  "GPIO": {
    "id": "GPIO",
    "name": "General Purpose Input/Output",
    "config": {
      "modes": {
        "name": "Режим",
        "values": ["INPUT", "OUTPUT", "INPUT_PULLUP"]
      },
      "defaultMode": "INPUT"
    },
    "pinMapping": {
      "pins": [
        "PB0", "PB1", "PB2", "PB3", "PB4", "PB5",
        "PC0", "PC1", "PC2", "PC3", "PC4", "PC5",
        "PD0", "PD1", "PD2", "PD3", "PD4", "PD5", "PD6", "PD7"
      ]
    }
  }
}
```

### Пример 2: UART

```json
{
  "UART": {
    "id": "UART",
    "name": "Universal Asynchronous Receiver/Transmitter",
    "config": {
      "baudRates": {
        "name": "Скорость передачи",
        "values": [9600, 19200, 38400, 57600, 115200]
      },
      "dataBits": {
        "name": "Биты данных",
        "values": [5, 6, 7, 8, 9]
      },
      "stopBits": {
        "name": "Стоп-биты",
        "values": [1, 2]
      },
      "parity": {
        "name": "Чётность",
        "values": ["None", "Even", "Odd"]
      },
      "modes": {
        "name": "Режим",
        "values": ["Asynchronous", "Synchronous"]
      }
    },
    "interrupts": {
      "RX": {
        "name": "USART_RX",
        "description": "Прерывание при приёме данных"
      },
      "TX": {
        "name": "USART_TX",
        "description": "Прерывание при завершении передачи"
      },
      "UDRE": {
        "name": "USART_UDRE",
        "description": "Прерывание при пустом регистре данных"
      }
    },
    "pinMapping": {
      "TX": ["PD1"],
      "RX": ["PD0"]
    }
  }
}
```

### Пример 3: Таймер с каналами

```json
{
  "TIMER1": {
    "id": "TIMER1",
    "name": "Timer/Counter 1",
    "config": {
      "modes": {
        "name": "Режим",
        "values": [
          "Normal",
          "CTC",
          "FastPWM",
          "PhaseCorrectPWM",
          "PhaseFrequencyCorrectPWM",
          "InputCapture"
        ]
      },
      "prescalers": {
        "name": "Делитель частоты",
        "values": [1, 8, 64, 256, 1024]
      }
    },
    "channels": ["OC1A", "OC1B", "IC1"],
    "interrupts": {
      "OVF": {
        "name": "TIMER1_OVF_vect",
        "description": "Переполнение таймера 1"
      },
      "COMPA": {
        "name": "TIMER1_COMPA_vect",
        "description": "Совпадение канала A таймера 1"
      },
      "COMPB": {
        "name": "TIMER1_COMPB_vect",
        "description": "Совпадение канала B таймера 1"
      },
      "CAPT": {
        "name": "TIMER1_CAPT_vect",
        "description": "Захват таймера 1"
      }
    },
    "pinMapping": {
      "OC1A": ["PB1"],
      "OC1B": ["PB2"],
      "IC1": ["PD0"]
    }
  }
}
```

### Пример 4: Периферия с флагом прерываний

```json
{
  "SPI": {
    "id": "SPI",
    "name": "Serial Peripheral Interface",
    "config": {
      "modes": {
        "name": "Режим",
        "values": ["Master", "Slave"]
      },
      "cpol": {
        "name": "CPOL (Полярность тактового сигнала)",
        "values": [0, 1]
      },
      "cpha": {
        "name": "CPHA (Фаза тактового сигнала)",
        "values": [0, 1]
      },
      "speeds": {
        "name": "Скорость",
        "values": ["fosc/4", "fosc/16", "fosc/64", "fosc/128"]
      }
    },
    "enableInterrupt": true,
    "interrupts": {
      "SPI_STC": {
        "name": "SPI_STC_vect",
        "description": "Прерывание при завершении передачи SPI"
      }
    },
    "pinMapping": {
      "MOSI": ["PB3"],
      "MISO": ["PB4"],
      "SCK": ["PB5"],
      "SS": ["PB2"]
    }
  }
}
```

## Примечания

- Идентификаторы периферий должны быть уникальными и соответствовать ключам в `codegen.json`.
- Значения в массивах `values` должны соответствовать значениям, используемым в шаблонах генерации кода.
- Привязка пинов в `pinMapping` должна соответствовать сигналам, определённым в `pins.json`.
- Поле `channels` используется для таймеров и указывает доступные каналы вывода сравнения и захвата.
- Поле `enableInterrupt` является опциональным и указывает, поддерживает ли периферия прерывания в целом.


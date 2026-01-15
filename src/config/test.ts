const configJson = {
  meta: {
    mcu: "ATmega328P",
    board: "arduino_uno",
    defaultFcpu: 16000000,
  },

  GPIO: {
    id: "gpio",
    kind: "pin",
    pinMapping: {
      pins: [
        "PB0",
        "PB1",
        "PB2",
        "PB3",
        "PB4",
        "PB5",
        "PC0",
        "PC1",
        "PC2",
        "PC3",
        "PC4",
        "PC5",
        "PD0",
        "PD1",
        "PD2",
        "PD3",
        "PD4",
        "PD5",
        "PD6",
        "PD7",
      ],
    },
    ui: {
      name: "General Purpose Input/Output",
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["INPUT", "OUTPUT", "INPUT_PULLUP"],
          defaultValue: "INPUT",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        initialState: {
          name: "Начальное состояние",
          type: "select",
          values: ["LOW", "HIGH"],
          defaultValue: "LOW",
          appliesTo: {
            mode: ["OUTPUT"],
          },
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
      },
      interrupts: {
        name: "PCINT",
        description: "Прерывание при изменении состояния пина",
        defaultEnabled: false,
        appliesTo: {
          mode: ["INPUT", "INPUT_PULLUP"],
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      modeKey: "mode",
      modeMapping: {
        INPUT: "input",
        OUTPUT: "output",
        INPUT_PULLUP: "input_pullup",
      },
      ports: [
        {
          id: "B",
          name: "PORTB",
          pins: [0, 1, 2, 3, 4, 5],
          registers: {
            ddr: "DDRB",
            port: "PORTB",
            pin: "PINB",
          },
        },
        {
          id: "C",
          name: "PORTC",
          pins: [0, 1, 2, 3, 4, 5],
          registers: {
            ddr: "DDRC",
            port: "PORTC",
            pin: "PINC",
          },
        },
        {
          id: "D",
          name: "PORTD",
          pins: [0, 1, 2, 3, 4, 5, 6, 7],
          registers: {
            ddr: "DDRD",
            port: "PORTD",
            pin: "PIND",
          },
        },
      ],
      init: {
        $mode: {
          input: [
            "{{ddr}} &= ~(1 << {{ddrBit}});",
            "{{portReg}} &= ~(1 << {{portBit}});"
          ],
          output: [
            "{{ddr}} |= (1 << {{ddrBit}});",
            "{{portReg}} &= ~(1 << {{portBit}});"
          ],
          input_pullup: [
            "{{ddr}} &= ~(1 << {{ddrBit}});",
            "{{portReg}} |= (1 << {{portBit}});"
          ]
        },
      },
      interrupts: {
        PCINT: {
          code: {
            enable: ["PCICR |= (1 << PCIE{{pcicr}});"],
            isr: [
              "ISR(PCINT{{pcicr}}_vect) {",
             "     if ({{pinReg}} & (1 << {{pinBit}})) {",
              "        // {{port}}{{pin}} HIGH",
              "    } else {",
              "        // {{port}}{{pin}} LOW",
              "    }",
              "}",
            ],
          },
        },
      },
    },
    conflicts: [
      {
        pins: ["PB3", "PB4", "PB5"],
        peripherals: ["SPI"],
        message:
          "PB3/PB4/PB5 используются для SPI — настройка как GPIO вызовет конфликт.",
      },
      {
        pins: ["PD0", "PD1"],
        peripherals: ["UART0"],
        message:
          "PD0/PD1 используются UART0 — настройка как GPIO вызовет конфликт.",
      },
      {
        pins: ["PC4", "PC5"],
        peripherals: ["I2C"],
        message:
          "PC4/PC5 используются I2C — настройка как GPIO вызовет конфликт.",
      },
      {
        pins: ["PD2", "PD3"],
        peripherals: ["EXTERNAL_INTERRUPT"],
        message:
          "PD2/PD3 используются внешними прерываниями — настройка как GPIO вызовет конфликт.",
      },
      {
        pins: ["PD6", "PD7"],
        peripherals: ["ANALOG_COMPARATOR"],
        message:
          "PD6/PD7 используются компаратором — настройка как GPIO вызовет конфликт.",
      },
    ],
  },

  UART: {
    id: "uart0",
    kind: "pin",
    pinMapping: { TX: ["PD1"], RX: ["PD0"] },
    ui: {
      name: "Universal Asynchronous Receiver/Transmitter",
      requiresAllPins: true,
      alerts: [
        {
          severity: "info",
          message:
            "Настройки UART применяются к обоим пинам (RX и TX), так как они используют один модуль UART0.",
          showWhen: "always",
        },
      ],
      config: {
        baudRate: {
          name: "Скорость передачи",
          type: "select",
          values: [9600, 19200, 38400, 57600, 115200],
          defaultValue: 9600,
          ui: { component: "Select", valueType: "number" },
        },
        dataBits: {
          name: "Биты данных",
          type: "select",
          values: [5, 6, 7, 8, 9],
          defaultValue: 8,
          ui: { component: "Select", valueType: "number" },
        },
        stopBits: {
          name: "Стоп-биты",
          type: "select",
          values: [1, 2],
          defaultValue: 1,
          ui: { component: "Select", valueType: "number" },
        },
        parity: {
          name: "Чётность",
          type: "select",
          values: ["None", "Even", "Odd"],
          defaultValue: "None",
          ui: { component: "Select", valueType: "string" },
        },
        mode: {
          name: "Режим работы",
          type: "select",
          values: ["Asynchronous", "Synchronous"],
          defaultValue: "Asynchronous",
          ui: { component: "Select", valueType: "string" },
        },
      },
      interrupts: {
        RX: {
          name: "USART_RX",
          description: "Прерывание при приёме данных",
          defaultEnabled: true,
        },
        TX: {
          name: "USART_TX",
          description: "Прерывание при завершении передачи",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      modeKey: "mode",
      modeMapping: {
        Asynchronous: "async",
        Synchronous: "sync",
      },
      valueMapping: {
        parity: { None: 0, Even: 2, Odd: 3 },
        stopBits: { "1": 0, "2": 1 },
        dataBits: { "5": 0, "6": 1, "7": 2, "8": 3 },
      },
      init: {
        $mode: {
          async: [
            "UBRR0H = (F_CPU/16/{{baudRate}}-1)>>8;",
            "UBRR0L = (F_CPU/16/{{baudRate}}-1);",
            "UCSR0B = (1<<RXEN0)|(1<<TXEN0);",
            "UCSR0C = ({{parity}}<<UPM00)|({{stopBits}}<<USBS0)|({{dataBits}}<<UCSZ00);",
          ],
          sync: [
            "UBRR0H = (F_CPU/2/{{baudRate}}-1)>>8;",
            "UBRR0L = (F_CPU/2/{{baudRate}}-1);",
            "UCSR0B = (1<<RXEN0)|(1<<TXEN0);",
            "UCSR0C = (1<<UMSEL00)|({{parity}}<<UPM00)|({{stopBits}}<<USBS0)|({{dataBits}}<<UCSZ00);",
          ],
        },
      },
      interrupts: {
        RX: {
          code: {
            enable: ["UCSR0B |= (1<<RXCIE0);"],
            isr: ["ISR(USART_RX_vect){  }"],
          },
        },
        TX: {
          code: {
            enable: ["UCSR0B |= (1<<TXCIE0);"],
            isr: ["ISR(USART_TX_vect){  }"],
          },
        },
      },
    },
    conflicts: [
      {
        pins: ["PD0", "PD1"],
        peripherals: ["GPIO"],
        message: "PD0/PD1 уже назначены как GPIO — конфликт с UART0.",
      },
    ],
  },

  SPI: {
    id: "spi",
    kind: "pin",
    pinMapping: {
      MOSI: ["PB3"],
      MISO: ["PB4"],
      SCK: ["PB5"],
      SS: ["PB2"],
    },
    ui: {
      name: "Serial Peripheral Interface",
      requiresAllPins: true,
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["Master", "Slave"],
          defaultValue: "Master",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        cpol: {
          name: "CPOL (Полярность тактового сигнала)",
          type: "select",
          values: [0, 1],
          defaultValue: 0,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        cpha: {
          name: "CPHA (Фаза тактового сигнала)",
          type: "select",
          values: [0, 1],
          defaultValue: 0,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        speed: {
          name: "Скорость",
          type: "select",
          values: ["fosc/4", "fosc/16", "fosc/64", "fosc/128"],
          defaultValue: "fosc/4",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
      },
      interrupts: {
        SPI_STC: {
          name: "SPI_STC_vect",
          description: "Прерывание при завершении передачи SPI",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      modeKey: "mode",
      modeMapping: {
        Master: "master",
        Slave: "slave",
      },
      valueMapping: {
        speed: {
          "fosc/4": 0,
          "fosc/16": 1,
          "fosc/64": 2,
          "fosc/128": 3,
        },
      },
      init: {
        $mode: {
          master: [
            "SPCR = (1 << SPE) | (1 << MSTR) | ({{cpol}} << CPOL) | ({{cpha}} << CPHA) | ({{speed}} << SPR0);",
            "SPSR = (1 << SPI2X);",
          ],
          slave: [
            "SPCR = (1 << SPE) | ({{cpol}} << CPOL) | ({{cpha}} << CPHA);",
          ],
        },
      },
      interrupts: {
        SPI_STC: {
          code: {
            enable: ["SPCR |= (1 << SPIE);"],
            isr: ["ISR(SPI_STC_vect) {", "    uint8_t data = SPDR;", "}"],
          },
        },
      },
    },
    conflicts: [
      {
        pins: ["PB3", "PB4", "PB5"],
        peripherals: ["GPIO"],
        message: "PB3/PB4/PB5 уже как GPIO — конфликт с SPI.",
      },
      {
        pins: ["PB2"],
        peripherals: ["TIMER1_PWM"],
        message: "PB2 используется для OC1B (Timer1 PWM) — конфликт со SPI SS.",
      },
    ],
  },

  I2C: {
    id: "i2c",
    kind: "pin",
    pinMapping: {
      SDA: ["PC4"],
      SCL: ["PC5"],
    },
    ui: {
      name: "Two Wire Interface",
      requiresAllPins: true,
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["Master", "Slave"],
          defaultValue: "Master",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        speed: {
          name: "Скорость",
          type: "select",
          values: [100000, 400000],
          defaultValue: 100000,
          appliesTo: {
            mode: ["Master"],
          },
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        slaveAddress: {
          name: "Адрес устройства",
          type: "number",
          defaultValue: 8,
          appliesTo: {
            mode: ["Slave"],
          },
          ui: {
            component: "TextField",
            valueType: "number",
            inputProps: {
              min: 8,
              max: 119,
            },
            helperText: "8-119",
          },
        },
      },
      interrupts: {
        TWI: {
          name: "TWI_vect",
          description: "Прерывание при событии на шине I2C",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>", "<util/twi.h>"],
      modeKey: "mode",
      modeMapping: {
        Master: "master",
        Slave: "slave",
      },
      init: {
        $mode: {
          master: [
            "TWSR = 0;",
            "TWBR = (F_CPU / {{speed}} - 16) / 2;",
            "TWCR = (1 << TWEN);",
          ],
          slave: [
            "TWAR = ({{slaveAddress}} << 1);",
            "TWCR = (1 << TWEN) | (1 << TWIE) | (1 << TWEA);",
          ],
        },
      },
      interrupts: {
        TWI: {
          code: {
            enable: ["TWCR |= (1 << TWIE);"],
            isr: ["ISR(TWI_vect) {", "}"],
          },
        },
      },
    },
    conflicts: [
      {
        pins: ["PC4", "PC5"],
        peripherals: ["GPIO"],
        message: "PC4/PC5 уже заняты GPIO — конфликт с I2C.",
      },
    ],
  },

  TIMER0_PWM: {
    id: "timer0_pwm",
    kind: "pin",
    pinMapping: {
      OC0A: ["PD6"],
      OC0B: ["PD5"],
    },
    ui: {
      name: "Timer/Counter 0 (ШИМ)",
      alerts: [
        {
          severity: "info",
          message:
            'Timer0 используется для генерации ШИМ-сигналов на пинах PD6 (OC0A) и PD5 (OC0B). Для системных задач (прерывания, задержки) используйте Timer0 в разделе "Системные периферии".',
          showWhen: "always",
        },
      ],
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["FastPWM", "PhaseCorrectPWM", "PhaseFrequencyCorrectPWM"],
          defaultValue: "FastPWM",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        prescaler: {
          name: "Делитель частоты",
          type: "select",
          values: [1, 8, 64, 256, 1024],
          defaultValue: 64,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        dutyCycle: {
          name: "Duty Cycle / OCR",
          type: "number",
          defaultValue: 128,
          ui: {
            component: "TextField",
            valueType: "number",
            inputProps: {
              min: 0,
              max: 255,
            },
            helperText: "0-255",
          },
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>"],
      modeKey: "mode",
      modeMapping: {
        FastPWM: "fast_pwm",
        PhaseCorrectPWM: "phase_correct_pwm",
        PhaseFrequencyCorrectPWM: "phase_frequency_correct_pwm",
      },
      valueMapping: {
        prescaler: {
          "1": 1,
          "8": 2,
          "64": 3,
          "256": 4,
          "1024": 5,
        },
      },
      init: {
        $mode: {
          fast_pwm: [
            "TCCR0A = (1 << COM0A1) | (1 << COM0B1) | (1 << WGM01) | (1 << WGM00);",
            "TCCR0B = ({{prescaler}} << CS00);",
            "OCR0A = {{dutyCycle}};",
            "OCR0B = {{dutyCycle}};",
          ],
          phase_correct_pwm: [
            "TCCR0A = (1 << COM0A1) | (1 << COM0B1) | (1 << WGM00);",
            "TCCR0B = ({{prescaler}} << CS00);",
            "OCR0A = {{dutyCycle}};",
            "OCR0B = {{dutyCycle}};",
          ],
          phase_frequency_correct_pwm: [
            "TCCR0A = (1 << COM0A1) | (1 << COM0B1) | (1 << WGM00);",
            "TCCR0B = ({{prescaler}} << CS00);",
            "OCR0A = {{dutyCycle}};",
            "OCR0B = {{dutyCycle}};",
          ],
        },
      },
    },
    conflicts: [
      {
        pins: ["PD5", "PD6"],
        peripherals: ["GPIO", "ANALOG_COMPARATOR"],
        message:
          "PD5/PD6 используются PWM или компаратором — конфликт с GPIO/Comparator.",
      },
    ],
  },

  TIMER1_PWM: {
    id: "timer1_pwm",
    kind: "pin",
    pinMapping: {
      OC1A: ["PB1"],
      OC1B: ["PB2"],
    },
    ui: {
      name: "Timer/Counter 1 (ШИМ)",
      alerts: [
        {
          severity: "info",
          message:
            'Timer1 используется для генерации ШИМ-сигналов на пинах PB1 (OC1A) и PB2 (OC1B). Для системных задач (прерывания, задержки, Input Capture) используйте Timer1 в разделе "Системные периферии".',
          showWhen: "always",
        },
      ],
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["FastPWM", "PhaseCorrectPWM", "PhaseFrequencyCorrectPWM"],
          defaultValue: "FastPWM",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        prescaler: {
          name: "Делитель частоты",
          type: "select",
          values: [1, 8, 64, 256, 1024],
          defaultValue: 64,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        dutyCycle: {
          name: "Duty Cycle / OCR",
          type: "number",
          defaultValue: 32768,
          ui: {
            component: "TextField",
            valueType: "number",
            inputProps: {
              min: 0,
              max: 65535,
            },
            helperText: "0-65535",
          },
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>"],
      modeKey: "mode",
      modeMapping: {
        FastPWM: "fast_pwm",
        PhaseCorrectPWM: "phase_correct_pwm",
        PhaseFrequencyCorrectPWM: "phase_frequency_correct_pwm",
      },
      valueMapping: {
        prescaler: {
          "1": 1,
          "8": 2,
          "64": 3,
          "256": 4,
          "1024": 5,
        },
      },
      init: {
        $mode: {
          fast_pwm: [
            "TCCR1A = (1 << COM1A1) | (1 << COM1B1) | (1 << WGM11) | (1 << WGM10);",
            "TCCR1B = (1 << WGM13) | (1 << WGM12) | ({{prescaler}} << CS10);",
            "OCR1A = {{dutyCycle}};",
            "OCR1B = {{dutyCycle}};",
          ],
          phase_correct_pwm: [
            "TCCR1A = (1 << COM1A1) | (1 << COM1B1) | (1 << WGM11);",
            "TCCR1B = (1 << WGM13) | ({{prescaler}} << CS10);",
            "OCR1A = {{dutyCycle}};",
            "OCR1B = {{dutyCycle}};",
          ],
          phase_frequency_correct_pwm: [
            "TCCR1A = (1 << COM1A1) | (1 << COM1B1) | (1 << WGM11);",
            "TCCR1B = (1 << WGM13) | ({{prescaler}} << CS10);",
            "ICR1 = {{dutyCycle}};",
            "OCR1A = {{dutyCycle}} / 2;",
            "OCR1B = {{dutyCycle}} / 2;",
          ],
        },
      },
    },
    conflicts: [
      {
        pins: ["PB1", "PB2"],
        peripherals: ["GPIO", "SPI"],
        message: "PB1/PB2 используются PWM или SPI — конфликт.",
      },
    ],
  },

  TIMER2_PWM: {
    id: "timer2_pwm",
    kind: "pin",
    pinMapping: {
      OC2A: ["PB3"],
      OC2B: ["PD3"],
    },
    ui: {
      name: "Timer/Counter 2 (ШИМ)",
      alerts: [
        {
          severity: "info",
          message:
            'Timer2 используется для генерации ШИМ-сигналов на пинах PB3 (OC2A) и PD3 (OC2B). Для системных задач (прерывания, задержки) используйте Timer2 в разделе "Системные периферии".',
          showWhen: "always",
        },
      ],
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["FastPWM", "PhaseCorrectPWM", "PhaseFrequencyCorrectPWM"],
          defaultValue: "FastPWM",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        prescaler: {
          name: "Делитель частоты",
          type: "select",
          values: [1, 8, 32, 64, 128, 256, 1024],
          defaultValue: 64,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        dutyCycle: {
          name: "Duty Cycle / OCR",
          type: "number",
          defaultValue: 128,
          ui: {
            component: "TextField",
            valueType: "number",
            inputProps: {
              min: 0,
              max: 255,
            },
            helperText: "0-255",
          },
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>"],
      modeKey: "mode",
      modeMapping: {
        FastPWM: "fast_pwm",
        PhaseCorrectPWM: "phase_correct_pwm",
        PhaseFrequencyCorrectPWM: "phase_frequency_correct_pwm",
      },
      valueMapping: {
        prescaler: {
          "1": 1,
          "8": 2,
          "32": 3,
          "64": 4,
          "128": 5,
          "256": 6,
          "1024": 7,
        },
      },
      init: {
        $mode: {
          fast_pwm: [
            "TCCR2A = (1 << COM2A1) | (1 << COM2B1) | (1 << WGM21) | (1 << WGM20);",
            "TCCR2B = ({{prescaler}} << CS20);",
            "OCR2A = {{dutyCycle}};",
            "OCR2B = {{dutyCycle}};",
          ],
          phase_correct_pwm: [
            "TCCR2A = (1 << COM2A1) | (1 << COM2B1) | (1 << WGM20);",
            "TCCR2B = ({{prescaler}} << CS20);",
            "OCR2A = {{dutyCycle}};",
            "OCR2B = {{dutyCycle}};",
          ],
          phase_frequency_correct_pwm: [
            "TCCR2A = (1 << COM2A1) | (1 << COM2B1) | (1 << WGM20);",
            "TCCR2B = ({{prescaler}} << CS20);",
            "OCR2A = {{dutyCycle}};",
            "OCR2B = {{dutyCycle}};",
          ],
        },
      },
    },
    conflicts: [
      {
        pins: ["PB3", "PD3"],
        peripherals: ["GPIO", "SPI", "EXTERNAL_INTERRUPT"],
        message: "PB3/PD3 заняты PWM или SPI/INT — конфликт.",
      },
    ],
  },

  ADC: {
    id: "adc",
    kind: "pin",
    pinMapping: {
      ADC0: ["PC0"],
      ADC1: ["PC1"],
      ADC2: ["PC2"],
      ADC3: ["PC3"],
      ADC4: ["PC4"],
      ADC5: ["PC5"],
    },
    ui: {
      name: "Analog to Digital Converter",
      config: {
        channel: {
          name: "Каналы",
          type: "select",
          values: [0, 1, 2, 3, 4, 5],
          defaultValue: 0,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        reference: {
          name: "Опорное напряжение",
          type: "select",
          values: ["AVcc", "AREF", "Internal1.1V"],
          defaultValue: "AVcc",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        prescaler: {
          name: "Делитель частоты",
          type: "select",
          values: [2, 4, 8, 16, 32, 64, 128],
          defaultValue: 128,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
        mode: {
          name: "Режим",
          type: "select",
          values: ["Single", "FreeRunning"],
          defaultValue: "Single",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
      },
      interrupts: {
        ADC: {
          name: "ADC_vect",
          description: "Прерывание при завершении преобразования ADC",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      modeKey: "mode",
      modeMapping: {
        Single: "single",
        FreeRunning: "free_running",
      },
      valueMapping: {
        reference: {
          AREF: 0,
          AVcc: 1,
          "Internal1.1V": 3,
        },
        prescaler: {
          "2": 1,
          "4": 2,
          "8": 3,
          "16": 4,
          "32": 5,
          "64": 6,
          "128": 7,
        },
      },
      init: {
        $mode: {
          single: [
            "ADMUX = ({{reference}} << REFS0) | {{channel}};",
            "ADCSRA = (1 << ADEN) | ({{prescaler}} << ADPS0);",
          ],
          free_running: [
            "ADMUX = ({{reference}} << REFS0) | {{channel}};",
            "ADCSRA = (1 << ADEN) | (1 << ADATE) | ({{prescaler}} << ADPS0);",
            "ADCSRA |= (1 << ADSC);",
          ],
        },
      },
      interrupts: {
        ADC: {
          code: {
            enable: ["ADCSRA |= (1 << ADIE);"],
            isr: ["ISR(ADC_vect) {", "    uint16_t value = ADC;", "    ", "}"],
          },
        },
      },
    },
    conflicts: [
      {
        pins: ["PC0", "PC1", "PC2", "PC3", "PC4", "PC5"],
        peripherals: ["GPIO", "I2C"],
        message: "ADC каналы конфликтуют с GPIO/I2C.",
      },
    ],
  },

  EXTERNAL_INTERRUPT: {
    id: "external_interrupt",
    kind: "pin",
    pinMapping: {
      INT0: ["PD2"],
      INT1: ["PD3"],
    },
    ui: {
      name: "External Interrupt",
      config: {
        interrupt: {
          name: "Прерывания",
          type: "select",
          values: ["INT0", "INT1"],
          defaultValue: "INT0",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        trigger: {
          name: "Триггеры",
          type: "select",
          values: ["LOW", "CHANGE", "RISING", "FALLING"],
          defaultValue: "RISING",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
      },
      interrupts: {
        INT0: {
          name: "INT0_vect",
          description: "Внешнее прерывание INT0",
          defaultEnabled: false,
        },
        INT1: {
          name: "INT1_vect",
          description: "Внешнее прерывание INT1",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      valueMapping: {
        trigger: {
          LOW: 0,
          CHANGE: 1,
          FALLING: 2,
          RISING: 3,
        },
      },
      init: {
        INT0: ["EICRA = ({{trigger}} << ISC00);", "EIMSK |= (1 << INT0);"],
        INT1: ["EICRA = ({{trigger}} << ISC10);", "EIMSK |= (1 << INT1);"],
      },
      interrupts: {
        INT0: {
          code: {
            isr: ["ISR(INT0_vect) {", "}"],
          },
        },
        INT1: {
          code: {
            isr: ["ISR(INT1_vect) {", "}"],
          },
        },
      },
    },
    conflicts: [
      {
        pins: ["PD2", "PD3"],
        peripherals: ["GPIO", "TIMER2_PWM"],
        message: "PD2/PD3 уже заняты — конфликт.",
      },
    ],
  },

  ANALOG_COMPARATOR: {
    id: "analog_comparator",
    kind: "pin",
    pinMapping: {
      AIN0: ["PD6"],
      AIN1: ["PD7"],
    },
    ui: {
      name: "Analog Comparator",
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["Interrupt", "Timer1Capture"],
          defaultValue: "Interrupt",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
      },
      interrupts: {
        ACI: {
          name: "ANALOG_COMP_vect",
          description: "Прерывание аналогового компаратора",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      modeKey: "mode",
      modeMapping: {
        Interrupt: "interrupt",
        Timer1Capture: "timer1_capture",
      },
      init: {
        $mode: {
          interrupt: ["ACSR = (1 << ACIE);", "sei();"],
          timer1_capture: ["ACSR = (1 << ACIC);"],
        },
      },
      interrupts: {
        ACI: {
          code: {
            enable: ["ACSR |= (1 << ACIE);"],
            isr: ["ISR(ANALOG_COMP_vect) {", "}"],
          },
        },
      },
    },
    conflicts: [
      {
        pins: ["PD6", "PD7"],
        peripherals: ["GPIO", "TIMER0_PWM"],
        message: "PD6/PD7 используются Comparator/PWM — конфликт.",
      },
    ],
  },

  WATCHDOG_TIMER: {
    id: "watchdog_timer",
    kind: "global",
    pinMapping: {},
    ui: {
      name: "Watchdog Timer",
      alerts: [
        {
          severity: "info",
          message:
            'Watchdog Timer используется для защиты от зависания программы. При срабатывании выполняется сброс микроконтроллера. При включении прерывания будет использоваться режим "Прерывание + сброс".',
          showWhen: "always",
        },
      ],
      config: {
        timeouts: {
          name: "Таймаут",
          type: "select",
          values: [16, 32, 64, 125, 250, 500, 1000, 2000, 4000, 8000],
          defaultValue: 1000,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
      },
      interrupts: {
        WDT: {
          name: "WDT_vect",
          description: "Прерывание watchdog таймера",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>", "<avr/wdt.h>"],
      valueMapping: {
        timeout: {
          "16": 0,
          "32": 1,
          "64": 2,
          "125": 3,
          "250": 4,
          "500": 5,
          "1000": 6,
          "2000": 7,
          "4000": 8,
          "8000": 9,
        },
      },
      init: {
        WDT: [
          "WDTCSR = (1 << WDCE) | (1 << WDE);",
          "WDTCSR = ({{timeout}} << WDP0) | (1 << WDE);",
        ],
      },
      interrupts: {
        WDT: {
          code: {
            enable: ["WDTCSR |= (1 << WDIE);"],
            isr: ["ISR(WDT_vect) {", "wdt_reset();", "}"],
          },
        },
      },
    },
    conflicts: [
      {
        peripherals: ["TIMER0", "TIMER1", "TIMER2"],
        message: "Watchdog может конфликтовать с системными таймерами.",
      },
    ],
  },

  TIMER0: {
    id: "timer0",
    kind: "global",
    pinMapping: {},
    ui: {
      name: "Timer/Counter 0",
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["Normal", "CTC"],
          defaultValue: "Normal",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        prescaler: {
          name: "Делитель частоты",
          type: "select",
          values: [1, 8, 32, 64, 128, 256, 1024],
          defaultValue: 64,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
      },
      interrupts: {
        OVF: {
          name: "TIMER0_OVF_vect",
          description: "Прерывание переполнения таймера 0",
          defaultEnabled: false,
        },
        COMPA: {
          name: "TIMER0_COMPA_vect",
          description: "Прерывание совпадения канала A таймера 0",
          defaultEnabled: false,
        },
        COMPB: {
          name: "TIMER0_COMPB_vect",
          description: "Прерывание совпадения канала B таймера 0",
          defaultEnabled: false,
        },
      },
      codeGenerator: {
        globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
        modeKey: "mode",
        modeMapping: {
          Normal: "normal",
          CTC: "ctc",
        },
        valueMapping: {
          prescaler: {
            "1": 1,
            "8": 2,
            "32": 3,
            "64": 4,
            "128": 5,
            "256": 6,
            "1024": 7,
          },
        },
        init: {
          $mode: {
            normal: [
              "TCCR0A = 0;",
              "TCCR0B = ({{prescaler}} << CS00);",
              "TCNT0 = 0;",
            ],
            ctc: [
              "TCCR0A = (1 << WGM01);",
              "TCCR0B = ({{prescaler}} << CS00);",
              "OCR0A = {{compareValue}};",
              "TCNT0 = 0;",
            ],
          },
        },
        interrupts: {
          OVF: {
            code: {
              enable: ["TIMSK0 |= (1 << TOIE0);"],
              isr: ["ISR(TIMER0_OVF_vect) {", "}"],
            },
          },
          COMPA: {
            code: {
              enable: ["TIMSK0 |= (1 << OCIE0A);"],
              isr: ["ISR(TIMER0_COMPA_vect) {", "}"],
            },
          },
          COMPB: {
            code: {
              enable: ["TIMSK0 |= (1 << OCIE0B);"],
              isr: ["ISR(TIMER0_COMPB_vect) {", "}"],
            },
          },
        },
      },
    },
  },

  TIMER1: {
    id: "timer1",
    kind: "global",
    pinMapping: {},
    ui: {
      name: "Timer/Counter 1",
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["Normal", "CTC"],
          defaultValue: "Normal",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        prescaler: {
          name: "Делитель частоты",
          type: "select",
          values: [1, 8, 32, 64, 128, 256, 1024],
          defaultValue: 64,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
      },
      interrupts: {
        OVF: {
          name: "TIMER1_OVF_vect",
          description: "Прерывание переполнения таймера 1",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      modeKey: "mode",
      modeMapping: {
        Normal: "normal",
        CTC: "ctc",
      },
      valueMapping: {
        prescaler: {
          "1": 1,
          "8": 2,
          "32": 3,
          "64": 4,
          "128": 5,
          "256": 6,
          "1024": 7,
        },
      },
      init: {
        $mode: {
          normal: [
            "TCCR1A = 0;",
            "TCCR1B = ({{prescaler}} << CS10);",
            "TCNT1 = 0;",
          ],
          ctc: [
            "TCCR1A = 0;",
            "TCCR1B = (1 << WGM12) | ({{prescaler}} << CS10);",
          ],
        },
      },
      interrupts: {
        OVF: {
          code: {
            enable: ["TIMSK1 |= (1 << TOIE1);"],
            isr: ["ISR(TIMER1_OVF_vect) {", "}"],
          },
        },
      },
    },
  },

  TIMER2: {
    id: "timer2",
    kind: "global",
    pinMapping: {},
    ui: {
      name: "Timer/Counter 2",
      config: {
        mode: {
          name: "Режим",
          type: "select",
          values: ["Normal", "CTC"],
          defaultValue: "Normal",
          ui: {
            component: "Select",
            valueType: "string",
          },
        },
        prescaler: {
          name: "Делитель частоты",
          type: "select",
          values: [1, 8, 32, 64, 128, 256, 1024],
          defaultValue: 64,
          ui: {
            component: "Select",
            valueType: "number",
          },
        },
      },
      interrupts: {
        OVF: {
          name: "TIMER2_OVF_vect",
          description: "Прерывание переполнения таймера 2",
          defaultEnabled: false,
        },
        COMPA: {
          name: "TIMER2_COMPA_vect",
          description: "Прерывание совпадения канала A таймера 2",
          defaultEnabled: false,
        },
        COMPB: {
          name: "TIMER2_COMPB_vect",
          description: "Прерывание совпадения канала B таймера 2",
          defaultEnabled: false,
        },
      },
    },
    codeGenerator: {
      globalIncludes: ["<avr/io.h>", "<avr/interrupt.h>"],
      modeKey: "mode",
      modeMapping: {
        Normal: "normal",
        CTC: "ctc",
      },
      valueMapping: {
        prescaler: {
          "1": 1,
          "8": 2,
          "32": 3,
          "64": 4,
          "128": 5,
          "256": 6,
          "1024": 7,
        },
      },
      init: {
        $mode: {
          normal: [
            "TCCR2A = 0;",
            "TCCR2B = ({{prescaler}} << CS20);",
            "TCNT2 = 0;",
          ],
          ctc: ["TCCR2A = (1 << WGM21);", "TCCR2B = ({{prescaler}} << CS20);"],
        },
      },
      interrupts: {
        OVF: {
          code: {
            enable: ["TIMSK1 |= (1 << TOIE1);"],
            isr: ["ISR(TIMER1_OVF_vect) {", "}"],
          },
        },
      },
    },
  },
};

type PeripheralKind = "pin" | "global";

type PeripheralConfig = {
  id: string;

  kind: PeripheralKind;

  pinMapping?: Record<string, string[]>;

  codeGenerator: {
    globalIncludes?: string[];

    modeKey?: string;

    modeMapping?: Record<string, string>;

    valueMapping?: Record<string, Record<string | number, number>>;

    ports?: Array<{
      id: string;
      name: string;
      pins: number[];
      registers: {
        ddr: string;
        port: string;
        pin: string;
      };
    }>;

    init: Record<string, string[] | Record<string, string[]>>;

    interrupts?: Record<
      string,
      {
        code: {
          enable?: string[];
          isr?: string[];
        };
      }
    >;
  };
};

type JsonConfig = {
  meta?: {
    defaultFcpu?: number;
  };
  [peripheralName: string]: PeripheralConfig | any;
};

type UIState = {
  peripherals: {
    [id: string]: {
      enabled?: boolean;
      pins?: Record<string, Record<string, any>>;
      [key: string]: any;
    };
  };
};

function getPortFromPin(pin: string): string {
  return pin.substring(1, 2);
}

function getBitFromPin(pin: string): number {
  return parseInt(pin.substring(2), 10);
}

function applyTemplate(
  line: string,
  params: Record<string, string | number>
): string {
  return line.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in params)) {
      throw new Error(`Template param "${key}" not found`);
    }
    return String(params[key]);
  });
}

function applyValueMapping(
  state: Record<string, any>,
  valueMapping?: Record<string, Record<string | number, number>>
): Record<string, string | number> {
  const params: Record<string, string | number> = { ...state };

  if (valueMapping) {
    for (const field in valueMapping) {
      const map = valueMapping[field];
      const value = state[field];

      if (value === undefined || value === null) continue;

      const stringKey = String(value);
      if (stringKey in map) {
        params[field] = map[stringKey];
        continue;
      }

      if (typeof value === "number" && value in map) {
        params[field] = map[value];
        continue;
      }
    }
  }

  return params;
}

function resolveMode(
  state: Record<string, any>,
  modeKey?: string,
  modeMapping?: Record<string, string>
): string | null {
  if (!modeKey || !(modeKey in state)) {
    return null;
  }

  const modeValue = state[modeKey];
  if (!modeValue) {
    return null;
  }

  if (modeMapping && modeValue in modeMapping) {
    return modeMapping[modeValue];
  }

  return String(modeValue).toLowerCase().replace(/\s+/g, "_");
}

function getInitTemplates(
  initConfig: Record<string, string[] | Record<string, string[]>>,
  mode: string | null
): string[] | null {
  if (mode && "$mode" in initConfig) {
    const modeConfig = initConfig["$mode"];

    if (typeof modeConfig === "object" && !Array.isArray(modeConfig)) {
      if (mode in modeConfig) {
        const templates = modeConfig[mode];
        return Array.isArray(templates) ? templates : null;
      }
    }
  }

  if (!mode) {
    for (const key in initConfig) {
      const value = initConfig[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return null;
}

function getPinPortInfo(
  pinName: string,
  ports?: Array<{
    id: string;
    name: string;
    pins: number[];
    registers?: {
      ddr: string;
      port: string;
      pin: string;
    };
  }>
): { port: string; pin: number; registers?: { ddr: string; port: string; pin: string; } } | null {
  const portLetter = getPortFromPin(pinName);
  const bit = getBitFromPin(pinName);

  if (ports) {
    const portConfig = ports.find((p) => p.id === portLetter);
    if (portConfig) {
      return { port: portLetter, pin: bit, registers: portConfig.registers };
    }
  }

  return { port: portLetter, pin: bit };
}

function getPCINTParams(pinName: string): Record<string, string | number> {
  const portLetter = getPortFromPin(pinName);

  let pcicr = "0";
  if (portLetter === "B") pcicr = "0";
  else if (portLetter === "C") pcicr = "1";
  else if (portLetter === "D") pcicr = "2";

  return { pcicr };
}

function generatePinPeripheral(
  spec: PeripheralConfig,
  state: {
    pins?: Record<string, Record<string, any>>;
    [key: string]: any;
  },
  defaultFcpu?: number
): string[] {
  const lines: string[] = [];
  const codeGen = spec.codeGenerator;

  if (state.pins && Object.keys(state.pins).length > 0) {
    for (const pinName in state.pins) {
      const pinState = state.pins[pinName];

      const pinInfo = getPinPortInfo(pinName, codeGen.ports);
      if (!pinInfo) continue;

      const mode = resolveMode(pinState, codeGen.modeKey, codeGen.modeMapping);

      const templates = getInitTemplates(codeGen.init, mode);
      if (!templates) continue;

      let params = applyValueMapping(pinState, codeGen.valueMapping);
      params.port = pinInfo.port;
      params.pin = pinInfo.pin;

      if (spec.id === "gpio") {
        Object.assign(params, getPCINTParams(pinName));

        if (codeGen.ports) {
          const portConfig = codeGen.ports.find((p) => p.id === pinInfo.port);
          if (portConfig && portConfig.registers) {
            params.ddr = portConfig.registers.ddr;
            params.portReg = portConfig.registers.port;
            params.pinReg = portConfig.registers.pin;

            params.ddrBit = `DDD${pinInfo.pin}`;
            params.portBit = `PORT${pinInfo.port}${pinInfo.pin}`;
            params.pinBit = `PIN${pinInfo.port}${pinInfo.pin}`;
          }
        }
      }

      if (defaultFcpu && templates.some((t) => t.includes("F_CPU"))) {
        params.F_CPU = defaultFcpu;
      }

      lines.push(`// ${spec.id.toUpperCase()} ${pinName}`);
      for (const tpl of templates) {
        lines.push(applyTemplate(tpl, params));
      }
    }
  } else {
    let templates: string[] | null = null;

    if (state.interrupt && codeGen.init[state.interrupt]) {
      const value = codeGen.init[state.interrupt];
      if (Array.isArray(value)) {
        templates = value;
      }
    } else {
      const mode = resolveMode(state, codeGen.modeKey, codeGen.modeMapping);
      templates = getInitTemplates(codeGen.init, mode);
    }

    if (templates) {
      let params = applyValueMapping(state, codeGen.valueMapping);

      if (defaultFcpu && templates.some((t) => t.includes("F_CPU"))) {
        params.F_CPU = defaultFcpu;
      }

      lines.push(`// ${spec.id.toUpperCase()}`);
      for (const tpl of templates) {
        lines.push(applyTemplate(tpl, params));
      }
    }
  }

  return lines;
}

function generateGlobalPeripheral(
  spec: PeripheralConfig,
  state: Record<string, any>,
  defaultFcpu?: number
): string[] {
  if (state.enabled === false) return [];

  const codeGen = spec.codeGenerator;

  const mode = resolveMode(state, codeGen.modeKey, codeGen.modeMapping);

  let templates: string[] | null = null;

  if (state.interrupt && codeGen.init[state.interrupt]) {
    const value = codeGen.init[state.interrupt];
    if (Array.isArray(value)) {
      templates = value;
    }
  } else {
    templates = getInitTemplates(codeGen.init, mode);
  }

  if (!templates || templates.length === 0) {
    return [];
  }

  let params = applyValueMapping(state, codeGen.valueMapping);

  if (defaultFcpu && templates.some((t) => t.includes("F_CPU"))) {
    params.F_CPU = defaultFcpu;
  }

  const lines: string[] = [];
  lines.push(`// ${spec.id.toUpperCase()}`);
  for (const tpl of templates) {
    lines.push(applyTemplate(tpl, params));
  }

  return lines;
}

function generateInterrupts(
  spec: PeripheralConfig,
  state: {
    pins?: Record<string, Record<string, any>>;
    interrupts?: Record<string, { enabled?: boolean }>;
    [key: string]: any;
  }
): { enable: string[]; isr: string[] } {
  const enableLines: string[] = [];
  const isrLines: string[] = [];

  const codeGen = spec.codeGenerator;

  if (!codeGen.interrupts) {
    return { enable: enableLines, isr: isrLines };
  }

  // Поддержка двух форматов:
  // 1) state.interrupts: { RX: { enabled: true } }
  // 2) флаги в настройках: enableRXInterrupt: true (либо на уровне периферии, либо в настройках пинов)
  const resolveInterruptEnabled = (interruptName: string): boolean => {
    // Приоритет: новый формат state.interrupts
    if (state.interrupts && interruptName in state.interrupts) {
      return !!state.interrupts[interruptName]?.enabled;
    }

    const flagKey = `enable${interruptName}Interrupt`;

    // Для pin-периферий: считаем прерывание включенным, если оно включено хотя бы на одном пине
    if (spec.kind === "pin" && state.pins && Object.keys(state.pins).length > 0) {
      for (const pinName in state.pins) {
        const pinState = state.pins[pinName];
        if (pinState && pinState[flagKey] === true) return true;
      }
      return false;
    }

    // Для global-периферий или pin-периферий без pins: флаг хранится на уровне состояния периферии
    if (state[flagKey] === true) return true;

    // Доп. совместимость: если у периферии ровно одно прерывание, часто используют общий enableInterrupt
    const interruptKeys = Object.keys(codeGen.interrupts || {});
    if (interruptKeys.length === 1 && state.enableInterrupt === true) return true;

    return false;
  };

  for (const interruptName in codeGen.interrupts) {
    if (!resolveInterruptEnabled(interruptName)) continue;

    const interruptConfig = codeGen.interrupts[interruptName];
    if (!interruptConfig || !interruptConfig.code) continue;

    if (interruptConfig.code.enable) {
      for (const enableLine of interruptConfig.code.enable) {
        if (
          state.pins &&
          spec.kind === "pin" &&
          Object.keys(state.pins).length > 0
        ) {
          if (spec.id === "gpio" && interruptName === "PCINT") {
            for (const pinName in state.pins) {
              const pinInfo = getPinPortInfo(pinName, codeGen.ports);
              if (!pinInfo) continue;

              const params: Record<string, string | number> = {
                port: pinInfo.port,
                pin: pinInfo.pin,
                ...getPCINTParams(pinName),
              };

              if (codeGen.ports) {
                const portConfig = codeGen.ports.find(
                  (p) => p.id === pinInfo.port
                );
                if (portConfig && portConfig.registers) {
                  params.ddr = portConfig.registers.ddr;
                  params.portReg = portConfig.registers.port;
                  params.pinReg = portConfig.registers.pin;

                  params.ddrBit = `DDD${pinInfo.pin}`;
                  params.portBit = `PORT${pinInfo.port}${pinInfo.pin}`;
                  params.pinBit = `PIN${pinInfo.port}${pinInfo.pin}`;
                }
              }

              enableLines.push(applyTemplate(enableLine, params));
            }
          } else {
            const params = applyValueMapping(state, codeGen.valueMapping);
            enableLines.push(applyTemplate(enableLine, params));
          }
        } else {
          const params = applyValueMapping(state, codeGen.valueMapping);
          enableLines.push(applyTemplate(enableLine, params));
        }
      }
    }

    if (interruptConfig.code.isr) {
      if (
        state.pins &&
        spec.kind === "pin" &&
        Object.keys(state.pins).length > 0
      ) {
        if (spec.id === "gpio" && interruptName === "PCINT") {
          for (const pinName in state.pins) {
            const pinInfo = getPinPortInfo(pinName, codeGen.ports);
            if (!pinInfo) continue;

            const params: Record<string, string | number> = {
              port: pinInfo.port,
              pin: pinInfo.pin,
              ...getPCINTParams(pinName),
            };

            if (codeGen.ports) {
              const portConfig = codeGen.ports.find((p) => p.id === pinInfo.port);
              if (portConfig && portConfig.registers) {
                params.ddr = portConfig.registers.ddr;
                params.portReg = portConfig.registers.port;
                params.pinReg = portConfig.registers.pin;
              }
            }

            for (const isrLine of interruptConfig.code.isr) {
              isrLines.push(applyTemplate(isrLine, params));
            }
          }
        } else {
          const params = applyValueMapping(state, codeGen.valueMapping);
          for (const isrLine of interruptConfig.code.isr) {
            isrLines.push(applyTemplate(isrLine, params));
          }
        }
      } else {
        const params = applyValueMapping(state, codeGen.valueMapping);
        for (const isrLine of interruptConfig.code.isr) {
          isrLines.push(applyTemplate(isrLine, params));
        }
      }
    }
  }

  return { enable: enableLines, isr: isrLines };
}

export function generateCode(jsonConfig: JsonConfig, uiState: UIState): string {
  const initLines: string[] = [];
  const interruptEnableLines: string[] = [];
  const isrLines: string[] = [];
  const includes = new Set<string>();

  const defaultFcpu = jsonConfig.meta?.defaultFcpu;

  for (const peripheralName in jsonConfig) {
    if (peripheralName === "meta") continue;

    const peripheralConfig = jsonConfig[peripheralName] as PeripheralConfig;
    if (!peripheralConfig || !peripheralConfig.codeGenerator) continue;

    const state = uiState.peripherals[peripheralConfig.id];
    if (!state) continue;

    if (peripheralConfig.codeGenerator.globalIncludes) {
      for (const inc of peripheralConfig.codeGenerator.globalIncludes) {
        includes.add(inc);
      }
    }

    let peripheralInitLines: string[] = [];

    if (peripheralConfig.kind === "pin") {
      peripheralInitLines = generatePinPeripheral(
        peripheralConfig,
        state,
        defaultFcpu
      );
    } else if (peripheralConfig.kind === "global") {
      peripheralInitLines = generateGlobalPeripheral(
        peripheralConfig,
        state,
        defaultFcpu
      );
    }

    if (peripheralInitLines.length > 0) {
      initLines.push(...peripheralInitLines);
      initLines.push("");
    }

    const interruptCode = generateInterrupts(peripheralConfig, state);

    if (interruptCode.enable.length > 0) {
      interruptEnableLines.push(...interruptCode.enable);
    }

    if (interruptCode.isr.length > 0) {
      isrLines.push(...interruptCode.isr);
      includes.add("<avr/interrupt.h>");
    }
  }

  const headerLines: string[] = [];
  for (const inc of Array.from(includes).sort()) {
    headerLines.push(`#include ${inc}`);
  }

  const allLines: string[] = [
    ...headerLines,
    "",
    "void setup() {",
    ...initLines.map((line) => `    ${line}`),
    ...(interruptEnableLines.length > 0
      ? [
          "",
          ...interruptEnableLines.map((line) => `    ${line}`),
          "    sei(); // Enable global interrupts",
        ]
      : []),
    "}",
  ];

  if (isrLines.length > 0) {
    allLines.push("");
    allLines.push(...isrLines);
  }

  return allLines.join("\n");
}

const uiState = 

{
  peripherals: {
    gpio: {
      pins: {
        PD2: { mode: "OUTPUT", initialState: "LOW" },
        PB0: { mode: "INPUT" },
      },
      interrupts: {
        PCINT: { enabled: false },
      },
    },
    uart0: {
      enabled: true,
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "None",
      mode: "Asynchronous",
      interrupts: {
        RX: { enabled: true },
        TX: { enabled: false },
      },
    },
    watchdog_timer: {
      enabled: true,
      timeout: 2000,
      interrupts: {
        WDT: { enabled: false },
      },
    },
  },


  
};

const code = generateCode(configJson, uiState);
console.log(code);

import type { BoardConfig, PinConfig, SelectedPinFunction } from "@/types/boardConfig";
import { getPortFromPin, getBitFromPin } from "../arduino/PinUtils";

/**
 * Генератор кода инициализации для Arduino проектов
 */
export class CodeGenerator {
  private boardConfig: BoardConfig;
  private fCpu: number;

  constructor(boardConfig: BoardConfig, fCpu: string) {
    this.boardConfig = boardConfig;
    // Преобразуем строку типа "16000000L" в число
    this.fCpu = parseInt(fCpu.replace("L", ""), 10);
  }

  /**
   * Генерирует код инициализации на основе выбранных настроек пинов
   */
  generateInitCode(selectedPins: SelectedPinFunction[]): string {
    const includes = this.generateIncludes(selectedPins);
    const initFunctions: string[] = [];
    const isrFunctions: string[] = [];

    // Группируем функции по типам
    const functionsByType = this.groupFunctionsByType(selectedPins);

    // Генерируем функции инициализации
    if (functionsByType.GPIO && functionsByType.GPIO.length > 0) {
      initFunctions.push(this.generateGPIOInit(functionsByType.GPIO));
    }
    if (functionsByType.UART && functionsByType.UART.length > 0) {
      const uartFunc = functionsByType.UART[0];
      initFunctions.push(this.generateUARTInit(uartFunc));
      const uartISR = this.generateUARTISR(uartFunc);
      if (uartISR) {
        isrFunctions.push(uartISR);
      }
    }
    if (functionsByType.SPI && functionsByType.SPI.length > 0) {
      const spiFunc = functionsByType.SPI[0];
      initFunctions.push(this.generateSPIInit(spiFunc));
      if (spiFunc.settings?.enableInterrupt) {
        isrFunctions.push(this.generateSPIISR());
      }
    }
    if (functionsByType.I2C && functionsByType.I2C.length > 0) {
      const i2cFunc = functionsByType.I2C[0];
      initFunctions.push(this.generateI2CInit(i2cFunc));
      if (i2cFunc.settings?.enableInterrupt) {
        isrFunctions.push(this.generateI2CISR());
      }
    }
    if (functionsByType.EXTERNAL_INTERRUPT && functionsByType.EXTERNAL_INTERRUPT.length > 0) {
      const extInt = functionsByType.EXTERNAL_INTERRUPT;
      extInt.forEach((func) => {
        initFunctions.push(this.generateExternalInterruptInit(func));
        isrFunctions.push(this.generateExternalInterruptISR(func));
      });
    }
    // Обрабатываем PCINT из настроек GPIO и как отдельную функцию
    const pcintFromGPIO = this.extractPCINTFromGPIO(selectedPins);
    const allPCINT = [
      ...pcintFromGPIO,
      ...(functionsByType.PCINT || []),
    ];
    // Удаляем дубликаты по pinName
    const uniquePCINT = allPCINT.filter(
      (pcint, index, self) =>
        index === self.findIndex((p) => p.pinName === pcint.pinName)
    );
    if (uniquePCINT.length > 0) {
      initFunctions.push(this.generatePCINTInit(uniquePCINT));
      isrFunctions.push(this.generatePCINTISR(uniquePCINT));
    }
    if (functionsByType.TIMER0_PWM && functionsByType.TIMER0_PWM.length > 0) {
      const timer0Func = functionsByType.TIMER0_PWM[0];
      initFunctions.push(this.generateTimer0PWMInit(timer0Func));
      const timer0ISR = this.generateTimer0ISR(timer0Func);
      if (timer0ISR) {
        isrFunctions.push(timer0ISR);
      }
    }
    if (functionsByType.TIMER1_PWM && functionsByType.TIMER1_PWM.length > 0) {
      const timer1Func = functionsByType.TIMER1_PWM[0];
      initFunctions.push(this.generateTimer1PWMInit(timer1Func));
      const timer1ISR = this.generateTimer1ISR(timer1Func);
      if (timer1ISR) {
        isrFunctions.push(timer1ISR);
      }
    }
    if (functionsByType.TIMER2_PWM && functionsByType.TIMER2_PWM.length > 0) {
      const timer2Func = functionsByType.TIMER2_PWM[0];
      initFunctions.push(this.generateTimer2PWMInit(timer2Func));
      const timer2ISR = this.generateTimer2ISR(timer2Func);
      if (timer2ISR) {
        isrFunctions.push(timer2ISR);
      }
    }
    // Обрабатываем независимые таймеры (не привязанные к пинам)
    if (functionsByType.TIMER0 && functionsByType.TIMER0.length > 0) {
      const timer0Func = functionsByType.TIMER0[0];
      initFunctions.push(this.generateTimer0Init(timer0Func));
      const timer0ISR = this.generateTimer0ISR(timer0Func);
      if (timer0ISR) {
        isrFunctions.push(timer0ISR);
      }
    }
    if (functionsByType.TIMER1 && functionsByType.TIMER1.length > 0) {
      const timer1Func = functionsByType.TIMER1[0];
      initFunctions.push(this.generateTimer1Init(timer1Func));
      const timer1ISR = this.generateTimer1ISR(timer1Func);
      if (timer1ISR) {
        isrFunctions.push(timer1ISR);
      }
    }
    if (functionsByType.TIMER2 && functionsByType.TIMER2.length > 0) {
      const timer2Func = functionsByType.TIMER2[0];
      initFunctions.push(this.generateTimer2Init(timer2Func));
      const timer2ISR = this.generateTimer2ISR(timer2Func);
      if (timer2ISR) {
        isrFunctions.push(timer2ISR);
      }
    }
    if (functionsByType.ADC && functionsByType.ADC.length > 0) {
      initFunctions.push(this.generateADCInit(functionsByType.ADC));
      if (functionsByType.ADC[0].settings.mode === "FreeRunning") {
        isrFunctions.push(this.generateADCISR());
      }
    }
    if (functionsByType.ANALOG_COMPARATOR && functionsByType.ANALOG_COMPARATOR.length > 0) {
      const analogComparatorFunc = functionsByType.ANALOG_COMPARATOR[0];
      initFunctions.push(this.generateAnalogComparatorInit(analogComparatorFunc));
      const comparatorISR = this.generateAnalogComparatorISR(analogComparatorFunc);
      if (comparatorISR) {
        isrFunctions.push(comparatorISR);
      }
    }
    if (functionsByType.WATCHDOG && functionsByType.WATCHDOG.length > 0) {
      initFunctions.push(this.generateWatchdogInit(functionsByType.WATCHDOG[0]));
      if (functionsByType.WATCHDOG[0].settings.mode === "Interrupt") {
        isrFunctions.push(this.generateWatchdogISR());
      }
    }

    // Генерируем main функцию
    const mainCode = this.generateMainFunction(initFunctions, selectedPins);

    // Собираем весь код
    return `${includes}

${initFunctions.join("\n\n")}

${mainCode}

${isrFunctions.join("\n\n")}
`;
  }

  /**
   * Генерирует заголовочный файл с объявлениями функций инициализации
   */
  generateInitHeader(selectedPins: SelectedPinFunction[]): string {
    const includes = this.generateIncludes(selectedPins);
    const functionDeclarations: string[] = [];
    const functionsByType = this.groupFunctionsByType(selectedPins);

    // Генерируем объявления функций
    if (functionsByType.GPIO && functionsByType.GPIO.length > 0) {
      functionDeclarations.push("void gpio_init(void);");
    }
    if (functionsByType.UART && functionsByType.UART.length > 0) {
      functionDeclarations.push("void uart_init(unsigned long baud);");
    }
    if (functionsByType.SPI && functionsByType.SPI.length > 0) {
      const spiFunc = functionsByType.SPI[0];
      if (spiFunc.settings?.mode === "Master") {
        functionDeclarations.push("void spi_init_master(void);");
      } else {
        functionDeclarations.push("void spi_init_slave(void);");
      }
    }
    if (functionsByType.I2C && functionsByType.I2C.length > 0) {
      const i2cFunc = functionsByType.I2C[0];
      if (i2cFunc.settings?.mode === "Master") {
        functionDeclarations.push("void i2c_init_master(void);");
      } else {
        functionDeclarations.push("void i2c_init_slave(void);");
      }
    }
    if (functionsByType.EXTERNAL_INTERRUPT && functionsByType.EXTERNAL_INTERRUPT.length > 0) {
      functionsByType.EXTERNAL_INTERRUPT.forEach((func) => {
        const pin = this.findPinByName(func.pinName);
        if (pin) {
          const interrupt = pin.functions.find((f) => f.type === "EXTERNAL_INTERRUPT");
          if (interrupt && interrupt.interrupt) {
            functionDeclarations.push(`void external_interrupt_${interrupt.interrupt.toLowerCase()}_init(void);`);
          }
        }
      });
    }
    // Проверяем PCINT из GPIO и как отдельную функцию
    const pcintFromGPIO = this.extractPCINTFromGPIO(selectedPins);
    const hasPCINT = (functionsByType.PCINT && functionsByType.PCINT.length > 0) || pcintFromGPIO.length > 0;
    if (hasPCINT) {
      functionDeclarations.push("void gpio_pcint_init(void);");
    }
    if (functionsByType.TIMER0_PWM && functionsByType.TIMER0_PWM.length > 0) {
      functionDeclarations.push("void timer0_pwm_init(void);");
    }
    if (functionsByType.TIMER1_PWM && functionsByType.TIMER1_PWM.length > 0) {
      const timer1Func = functionsByType.TIMER1_PWM[0];
      if (timer1Func.settings?.mode === "InputCapture") {
        functionDeclarations.push("void timer1_icp_init(void);");
      } else {
        functionDeclarations.push("void timer1_pwm_init(void);");
      }
    }
    if (functionsByType.TIMER2_PWM && functionsByType.TIMER2_PWM.length > 0) {
      functionDeclarations.push("void timer2_pwm_init(void);");
    }
    if (functionsByType.TIMER0 && functionsByType.TIMER0.length > 0) {
      functionDeclarations.push("void timer0_init(void);");
    }
    if (functionsByType.TIMER1 && functionsByType.TIMER1.length > 0) {
      const timer1Func = functionsByType.TIMER1[0];
      if (timer1Func.settings?.mode === "InputCapture") {
        functionDeclarations.push("void timer1_icp_init(void);");
      } else {
        functionDeclarations.push("void timer1_init(void);");
      }
    }
    if (functionsByType.TIMER2 && functionsByType.TIMER2.length > 0) {
      functionDeclarations.push("void timer2_init(void);");
    }
    if (functionsByType.ADC && functionsByType.ADC.length > 0) {
      functionDeclarations.push("void adc_init_single_channel(uint8_t channel);");
      functionDeclarations.push("void adc_init(void);");
    }
    if (functionsByType.ANALOG_COMPARATOR && functionsByType.ANALOG_COMPARATOR.length > 0) {
      functionDeclarations.push("void analog_comparator_init(void);");
    }
    if (functionsByType.WATCHDOG && functionsByType.WATCHDOG.length > 0) {
      functionDeclarations.push("void wdt_init(void);");
    }

    // Главная функция инициализации
    functionDeclarations.push("void pins_init_all(void);");

    return `#ifndef PINS_INIT_H
#define PINS_INIT_H

${includes}

${functionDeclarations.join("\n")}

#endif // PINS_INIT_H
`;
  }

  /**
   * Генерирует файл реализации с определениями функций инициализации
   */
  generateInitImplementation(selectedPins: SelectedPinFunction[]): string {
    const initFunctions: string[] = [];
    const isrFunctions: string[] = [];
    const functionsByType = this.groupFunctionsByType(selectedPins);

    // Генерируем функции инициализации
    if (functionsByType.GPIO && functionsByType.GPIO.length > 0) {
      initFunctions.push(this.generateGPIOInit(functionsByType.GPIO));
    }
    if (functionsByType.UART && functionsByType.UART.length > 0) {
      const uartFunc = functionsByType.UART[0];
      initFunctions.push(this.generateUARTInit(uartFunc));
      const uartISR = this.generateUARTISR(uartFunc);
      if (uartISR) {
        isrFunctions.push(uartISR);
      }
    }
    if (functionsByType.SPI && functionsByType.SPI.length > 0) {
      const spiFunc = functionsByType.SPI[0];
      initFunctions.push(this.generateSPIInit(spiFunc));
      if (spiFunc.settings?.enableInterrupt) {
        isrFunctions.push(this.generateSPIISR());
      }
    }
    if (functionsByType.I2C && functionsByType.I2C.length > 0) {
      const i2cFunc = functionsByType.I2C[0];
      initFunctions.push(this.generateI2CInit(i2cFunc));
      if (i2cFunc.settings?.enableInterrupt) {
        isrFunctions.push(this.generateI2CISR());
      }
    }
    if (functionsByType.EXTERNAL_INTERRUPT && functionsByType.EXTERNAL_INTERRUPT.length > 0) {
      const extInt = functionsByType.EXTERNAL_INTERRUPT;
      extInt.forEach((func) => {
        initFunctions.push(this.generateExternalInterruptInit(func));
        isrFunctions.push(this.generateExternalInterruptISR(func));
      });
    }
    // Обрабатываем PCINT из настроек GPIO и как отдельную функцию
    const pcintFromGPIO2 = this.extractPCINTFromGPIO(selectedPins);
    const allPCINT2 = [
      ...pcintFromGPIO2,
      ...(functionsByType.PCINT || []),
    ];
    // Удаляем дубликаты по pinName
    const uniquePCINT2 = allPCINT2.filter(
      (pcint, index, self) =>
        index === self.findIndex((p) => p.pinName === pcint.pinName)
    );
    if (uniquePCINT2.length > 0) {
      initFunctions.push(this.generatePCINTInit(uniquePCINT2));
      isrFunctions.push(this.generatePCINTISR(uniquePCINT2));
    }
    if (functionsByType.TIMER0_PWM && functionsByType.TIMER0_PWM.length > 0) {
      const timer0Func = functionsByType.TIMER0_PWM[0];
      initFunctions.push(this.generateTimer0PWMInit(timer0Func));
      const timer0ISR = this.generateTimer0ISR(timer0Func);
      if (timer0ISR) {
        isrFunctions.push(timer0ISR);
      }
    }
    if (functionsByType.TIMER1_PWM && functionsByType.TIMER1_PWM.length > 0) {
      const timer1Func = functionsByType.TIMER1_PWM[0];
      initFunctions.push(this.generateTimer1PWMInit(timer1Func));
      const timer1ISR = this.generateTimer1ISR(timer1Func);
      if (timer1ISR) {
        isrFunctions.push(timer1ISR);
      }
    }
    if (functionsByType.TIMER2_PWM && functionsByType.TIMER2_PWM.length > 0) {
      const timer2Func = functionsByType.TIMER2_PWM[0];
      initFunctions.push(this.generateTimer2PWMInit(timer2Func));
      const timer2ISR = this.generateTimer2ISR(timer2Func);
      if (timer2ISR) {
        isrFunctions.push(timer2ISR);
      }
    }
    // Обрабатываем независимые таймеры (не привязанные к пинам)
    if (functionsByType.TIMER0 && functionsByType.TIMER0.length > 0) {
      const timer0Func = functionsByType.TIMER0[0];
      initFunctions.push(this.generateTimer0Init(timer0Func));
      const timer0ISR = this.generateTimer0ISR(timer0Func);
      if (timer0ISR) {
        isrFunctions.push(timer0ISR);
      }
    }
    if (functionsByType.TIMER1 && functionsByType.TIMER1.length > 0) {
      const timer1Func = functionsByType.TIMER1[0];
      initFunctions.push(this.generateTimer1Init(timer1Func));
      const timer1ISR = this.generateTimer1ISR(timer1Func);
      if (timer1ISR) {
        isrFunctions.push(timer1ISR);
      }
    }
    if (functionsByType.TIMER2 && functionsByType.TIMER2.length > 0) {
      const timer2Func = functionsByType.TIMER2[0];
      initFunctions.push(this.generateTimer2Init(timer2Func));
      const timer2ISR = this.generateTimer2ISR(timer2Func);
      if (timer2ISR) {
        isrFunctions.push(timer2ISR);
      }
    }
    if (functionsByType.ADC && functionsByType.ADC.length > 0) {
      initFunctions.push(this.generateADCInit(functionsByType.ADC));
      if (functionsByType.ADC[0].settings.mode === "FreeRunning") {
        isrFunctions.push(this.generateADCISR());
      }
    }
    if (functionsByType.ANALOG_COMPARATOR && functionsByType.ANALOG_COMPARATOR.length > 0) {
      const analogComparatorFunc = functionsByType.ANALOG_COMPARATOR[0];
      initFunctions.push(this.generateAnalogComparatorInit(analogComparatorFunc));
      const comparatorISR = this.generateAnalogComparatorISR(analogComparatorFunc);
      if (comparatorISR) {
        isrFunctions.push(comparatorISR);
      }
    }
    if (functionsByType.WATCHDOG && functionsByType.WATCHDOG.length > 0) {
      initFunctions.push(this.generateWatchdogInit(functionsByType.WATCHDOG[0]));
      if (functionsByType.WATCHDOG[0].settings.mode === "Interrupt") {
        isrFunctions.push(this.generateWatchdogISR());
      }
    }

    // Генерируем функцию, которая вызывает все функции инициализации
    const initAllFunction = this.generateInitAllFunction(initFunctions, selectedPins);

    return `#include "pins_init.h"

${initFunctions.join("\n\n")}

${initAllFunction}

${isrFunctions.join("\n\n")}
`;
  }

  /**
   * Генерирует функцию, которая вызывает все функции инициализации
   */
  private generateInitAllFunction(initFunctions: string[], selectedPins: SelectedPinFunction[]): string {
    const uartFunc = selectedPins.find((p) => p.functionType === "UART");
    const defaultBaud = this.boardConfig.peripherals.UART?.baudRates?.[0] || 9600;
    const uartBaud = uartFunc?.settings?.baud || defaultBaud;

    const functionCalls: string[] = [];
    const addedFunctions = new Set<string>(); // Для предотвращения дубликатов
    
    // Находим все функции во всех строках инициализации
    initFunctions.forEach((func) => {
      // Используем глобальный поиск, чтобы найти все функции в строке
      const matches = func.matchAll(/void\s+(\w+)\s*\(/g);
      for (const match of matches) {
        const funcName = match[1];
        
        // Пропускаем вспомогательные функции, которые вызываются только из других функций инициализации
        if (funcName === "adc_init_single_channel") {
          continue;
        }
        
        // Пропускаем, если функция уже добавлена
        if (addedFunctions.has(funcName)) {
          continue;
        }
        
        addedFunctions.add(funcName);
        
        // Для uart_init передаём параметр baud
        if (funcName === "uart_init") {
          functionCalls.push(`    ${funcName}(${uartBaud});`);
        } else {
          functionCalls.push(`    ${funcName}();`);
        }
      }
    });

    return `void pins_init_all(void) {
${functionCalls.join("\n")}
}`;
  }

  private generateIncludes(selectedPins: SelectedPinFunction[]): string {
    const includes = new Set<string>();
    includes.add("#include <avr/io.h>");

    // Добавляем определение F_CPU, если используется UART или I2C (нужно для расчётов)
    const needsFCpu = selectedPins.some(
      (p) => p.functionType === "UART" || p.functionType === "I2C"
    );

    if (needsFCpu) {
      includes.add("");
      includes.add(`#ifndef F_CPU`);
      includes.add(`#define F_CPU ${this.fCpu}UL`);
      includes.add(`#endif`);
    }

    // Проверяем, нужны ли прерывания
    const hasInterrupts = selectedPins.some(
      (p) => {
        // Проверяем PCINT из настроек GPIO
        if (p.functionType === "GPIO" && p.settings?.enablePCINT) {
          return true;
        }
        if (
          p.functionType === "EXTERNAL_INTERRUPT" ||
          p.functionType === "PCINT" ||
          p.functionType === "ANALOG_COMPARATOR"
        ) {
          return true;
        }
        // Для ADC прерывания нужны только в режиме FreeRunning
        if (p.functionType === "ADC") {
          return p.settings?.mode === "FreeRunning";
        }
        // Для WATCHDOG прерывания нужны только в режиме Interrupt
        if (p.functionType === "WATCHDOG") {
          return p.settings?.mode === "Interrupt";
        }
        // Для UART проверяем, включены ли прерывания
        if (p.functionType === "UART") {
          return (
            p.settings?.enableRXInterrupt ||
            p.settings?.enableTXInterrupt ||
            p.settings?.enableUDREInterrupt
          );
        }
        // Для SPI проверяем, включены ли прерывания
        if (p.functionType === "SPI") {
          return p.settings?.enableInterrupt || false;
        }
        // Для I2C проверяем, включены ли прерывания
        if (p.functionType === "I2C") {
          return p.settings?.enableInterrupt || false;
        }
        return false;
      }
    );

    if (hasInterrupts) {
      includes.add("#include <avr/interrupt.h>");
    }

    // Проверяем watchdog
    if (selectedPins.some((p) => p.functionType === "WATCHDOG")) {
      includes.add("#include <avr/wdt.h>");
    }

    return Array.from(includes).join("\n");
  }

  private groupFunctionsByType(
    selectedPins: SelectedPinFunction[]
  ): Record<string, SelectedPinFunction[]> {
    const grouped: Record<string, SelectedPinFunction[]> = {};
    selectedPins.forEach((pin) => {
      if (!grouped[pin.functionType]) {
        grouped[pin.functionType] = [];
      }
      grouped[pin.functionType].push(pin);
    });
    return grouped;
  }

  /**
   * Вычисляет номер PCINT на основе порта и номера пина
   * PORTB (PB0-PB5): PCINT0-PCINT5
   * PORTC (PC0-PC5): PCINT8-PCINT13
   * PORTD (PD0-PD7): PCINT16-PCINT23
   */
  private getPCINTNumber(port: string, pinNumber: number): number | null {
    if (port === "PB") {
      return pinNumber; // PCINT0-PCINT5
    } else if (port === "PC") {
      return pinNumber + 8; // PCINT8-PCINT13
    } else if (port === "PD") {
      return pinNumber + 16; // PCINT16-PCINT23
    }
    return null;
  }

  /**
   * Извлекает PCINT из настроек GPIO функций
   * Создает виртуальные SelectedPinFunction для PCINT на основе GPIO с включенным enablePCINT
   */
  private extractPCINTFromGPIO(
    selectedPins: SelectedPinFunction[]
  ): SelectedPinFunction[] {
    const pcintFunctions: SelectedPinFunction[] = [];
    
    selectedPins.forEach((pinFunc) => {
      // Проверяем, является ли это GPIO с включенным PCINT
      if (pinFunc.functionType === "GPIO" && pinFunc.settings?.enablePCINT) {
        const pin = this.findPinByName(pinFunc.pinName);
        if (!pin) return;
        
        // Проверяем, поддерживает ли пин PCINT (если у пина есть GPIO сигналы, значит он может поддерживать PCINT)
        const hasGPIO = pin.signals?.some((s) => s.type === "GPIO");
        if (!hasGPIO) return;
        
        // Проверяем, что пин не является специальным (PB6, PB7, PC6 - не поддерживают PCINT)
        const port = getPortFromPin(pin.pin);
        const pinNumber = pin.number;
        const pcintNumber = this.getPCINTNumber(port, pinNumber);
        if (pcintNumber === null) return;
        
        // Создаем виртуальную функцию PCINT на основе GPIO
        pcintFunctions.push({
          pinName: pinFunc.pinName,
          functionType: "PCINT",
          settings: {},
        });
      }
    });
    
    return pcintFunctions;
  }

  private generateGPIOInit(pins: SelectedPinFunction[]): string {
    const portGroups: Record<string, { port: string; pins: Array<{ bit: number; mode: string; initialState?: string }> }> =
      {};

    pins.forEach((pinFunc) => {
      const pin = this.findPinByName(pinFunc.pinName);
      if (!pin) return;

      const mode = pinFunc.settings.mode || "OUTPUT";
      const initialState = pinFunc.settings.initialState || "LOW";
      const port = getPortFromPin(pin.pin);
      const bit = getBitFromPin(pin.pin);
      if (!portGroups[port]) {
        portGroups[port] = { port, pins: [] };
      }
      portGroups[port].pins.push({ bit, mode, initialState });
    });

    const code: string[] = ["void gpio_init() {"];
    Object.values(portGroups).forEach((group) => {
      // Преобразуем полное имя порта (PB, PC, PD) в букву порта (B, C, D)
      const portLetter = this.getPortLetter(group.port);
      group.pins.forEach((pin) => {
        if (pin.mode === "OUTPUT") {
          code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${pin.bit}); // ${group.port}${pin.bit} как OUTPUT`);
          if (pin.initialState === "HIGH") {
            code.push(`    PORT${portLetter} |= (1 << PORT${portLetter}${pin.bit}); // Установить HIGH`);
          } else {
            code.push(`    PORT${portLetter} &= ~(1 << PORT${portLetter}${pin.bit}); // Установить LOW`);
          }
        } else if (pin.mode === "INPUT") {
          code.push(`    DDR${portLetter} &= ~(1 << DD${portLetter}${pin.bit}); // ${group.port}${pin.bit} как INPUT`);
          code.push(`    PORT${portLetter} &= ~(1 << PORT${portLetter}${pin.bit}); // Отключить подтяжку`);
        } else if (pin.mode === "INPUT_PULLUP") {
          code.push(`    DDR${portLetter} &= ~(1 << DD${portLetter}${pin.bit}); // ${group.port}${pin.bit} как INPUT`);
          code.push(`    PORT${portLetter} |= (1 << PORT${portLetter}${pin.bit}); // Включить подтяжку`);
        }
      });
    });
    code.push("}");

    return code.join("\n");
  }

  private generateUARTInit(func: SelectedPinFunction): string {
    const dataBits = func.settings.dataBits || 8;
    const stopBits = func.settings.stopBits || 1;
    const parity = func.settings.parity || "None";
    const mode = func.settings.mode || "Asynchronous";
    const enableRXInterrupt = func.settings.enableRXInterrupt || false;
    const enableTXInterrupt = func.settings.enableTXInterrupt || false;
    const enableUDREInterrupt = func.settings.enableUDREInterrupt || false;

    // Формируем строку формата для комментария (например, 8N1, 7E2)
    const parityChar = parity === "Even" ? "E" : parity === "Odd" ? "O" : "N";
    const formatString = `${dataBits}${parityChar}${stopBits}`;

    // Согласно документации, функция принимает параметр baud
    const code: string[] = [`void uart_init(unsigned long baud) {`];
    
    // Используем формулу согласно документации
    if (mode === "Asynchronous") {
      code.push(`    UBRR0H = (F_CPU / 16 / baud - 1) >> 8;`);
      code.push(`    UBRR0L = (F_CPU / 16 / baud - 1);`);
    } else {
      code.push(`    UBRR0H = (F_CPU / 2 / baud - 1) >> 8; // Формула для синхронного режима`);
      code.push(`    UBRR0L = (F_CPU / 2 / baud - 1);`);
    }
    
    // Формируем UCSR0B с прерываниями
    const ucsr0bParts: string[] = [
      "(1 << RXEN0)", // Включить RX
      "(1 << TXEN0)", // Включить TX
    ];

    if (enableRXInterrupt) {
      ucsr0bParts.push("(1 << RXCIE0)"); // Включить прерывание при приёме
    }
    if (enableTXInterrupt) {
      ucsr0bParts.push("(1 << TXCIE0)"); // Включить прерывание при завершении передачи
    }
    if (enableUDREInterrupt) {
      ucsr0bParts.push("(1 << UDRIE0)"); // Включить прерывание при пустом регистре данных
    }

    const ucsr0b = ucsr0bParts.join(" | ");
    code.push(`    UCSR0B = ${ucsr0b}; // Включить RX и TX`);

    // Настройка формата данных
    // UCSZ02, UCSZ01, UCSZ00 определяют количество бит данных
    const ucsr0cParts: string[] = [];
    
    if (dataBits === 5) {
      ucsr0cParts.push("(1 << UCSZ00)"); // UCSZ02=0, UCSZ01=0, UCSZ00=1
    } else if (dataBits === 6) {
      ucsr0cParts.push("(1 << UCSZ01)"); // UCSZ02=0, UCSZ01=1, UCSZ00=0
    } else if (dataBits === 7) {
      ucsr0cParts.push("(1 << UCSZ01) | (1 << UCSZ00)"); // UCSZ02=0, UCSZ01=1, UCSZ00=1
    } else if (dataBits === 8) {
      ucsr0cParts.push("(1 << UCSZ01) | (1 << UCSZ00)"); // UCSZ02=0, UCSZ01=1, UCSZ00=1
    } else if (dataBits === 9) {
      ucsr0cParts.push("(1 << UCSZ02) | (1 << UCSZ01) | (1 << UCSZ00)"); // UCSZ02=1, UCSZ01=1, UCSZ00=1
    } else {
      // Защита от неверного значения - используем 8 бит по умолчанию
      ucsr0cParts.push("(1 << UCSZ01) | (1 << UCSZ00)");
    }

    if (parity === "Even") {
      ucsr0cParts.push("(1 << UPM01)");
    } else if (parity === "Odd") {
      ucsr0cParts.push("(1 << UPM01) | (1 << UPM00)");
    }

    if (stopBits === 2) {
      ucsr0cParts.push("(1 << USBS0)");
    }

    if (mode === "Synchronous") {
      ucsr0cParts.push("(1 << UMSEL01) | (1 << UMSEL00)"); // Синхронный режим
      ucsr0cParts.push("(1 << UCPOL0)"); // Полярность такта (согласно документации)
    }

    const ucsr0c = ucsr0cParts.join(" | ");
    code.push(`    UCSR0C = ${ucsr0c}; // ${formatString}`);
    
    // Включаем глобальные прерывания, если используются прерывания UART
    if (enableRXInterrupt || enableTXInterrupt || enableUDREInterrupt) {
      code.push("    sei(); // Enable global interrupts");
    }
    
    code.push("}");

    return code.join("\n");
  }

  private generateUARTISR(func: SelectedPinFunction): string | null {
    const enableRXInterrupt = func.settings.enableRXInterrupt || false;
    const enableTXInterrupt = func.settings.enableTXInterrupt || false;
    const enableUDREInterrupt = func.settings.enableUDREInterrupt || false;

    // Если ни одно прерывание не включено, не генерируем ISR
    if (!enableRXInterrupt && !enableTXInterrupt && !enableUDREInterrupt) {
      return null;
    }

    const isrs: string[] = [];

    if (enableRXInterrupt) {
      isrs.push(`ISR(USART_RX_vect) {
    // Прерывание при приёме данных
    uint8_t received_byte = UDR0; // Прочитать принятый байт
    // TODO: Обработать полученные данные
    // Например, добавить в буфер или обработать команду
}`);
    }

    if (enableTXInterrupt) {
      isrs.push(`ISR(USART_TX_vect) {
    // Прерывание при завершении передачи
    // TODO: Отправить следующий байт из буфера, если есть
}`);
    }

    if (enableUDREInterrupt) {
      isrs.push(`ISR(USART_UDRE_vect) {
    // Прерывание при пустом регистре данных (готов к записи)
    // TODO: Записать следующий байт в UDR0 для передачи
    // UDR0 = next_byte_to_send;
}`);
    }

    return isrs.join("\n\n");
  }

  private generateSPIInit(func: SelectedPinFunction): string {
    const mode = func.settings.mode || "Master";
    const cpol = func.settings.cpol || 0;
    const cpha = func.settings.cpha || 0;
    const speed = func.settings.speed || "fosc/16";
    const enableInterrupt = func.settings.enableInterrupt || false;

    const speedMap: Record<string, string> = {
      "fosc/4": "0",
      "fosc/16": "(1 << SPR0)",
      "fosc/64": "(1 << SPR1)",
      "fosc/128": "(1 << SPR1) | (1 << SPR0)",
    };

    const code: string[] = [];
    if (mode === "Master") {
      code.push("void spi_init_master() {");
      code.push("    DDRB |= (1 << DDB2) | (1 << DDB3) | (1 << DDB5); // SS, MOSI, SCK как OUTPUT");
      code.push("    DDRB &= ~(1 << DDB4); // MISO как INPUT");
      const spcrParts = ["(1 << SPE)", "(1 << MSTR)", speedMap[speed]];
      if (enableInterrupt) {
        spcrParts.push("(1 << SPIE)");
      }
      code.push(`    SPCR = ${spcrParts.join(" | ")}; // Enable SPI, Master${enableInterrupt ? ", Interrupt" : ""}`);
      if (cpol === 1) {
        code.push("    SPCR |= (1 << CPOL); // Clock idle high");
      }
      if (cpha === 1) {
        code.push("    SPCR |= (1 << CPHA); // Sample on trailing edge");
      }
      if (enableInterrupt) {
        code.push("    sei(); // Enable global interrupts");
      }
      code.push("}");
    } else {
      code.push("void spi_init_slave() {");
      code.push("    DDRB &= ~(1 << DDB2); // SS как INPUT");
      code.push("    DDRB &= ~(1 << DDB3); // MOSI как INPUT");
      code.push("    DDRB |= (1 << DDB4); // MISO как OUTPUT");
      code.push("    DDRB &= ~(1 << DDB5); // SCK как INPUT");
      const spcrParts = ["(1 << SPE)"];
      if (enableInterrupt) {
        spcrParts.push("(1 << SPIE)");
      }
      code.push(`    SPCR = ${spcrParts.join(" | ")}; // Enable SPI, Slave mode${enableInterrupt ? ", Interrupt" : ""}`);
      if (cpol === 1) {
        code.push("    SPCR |= (1 << CPOL);");
      }
      if (cpha === 1) {
        code.push("    SPCR |= (1 << CPHA);");
      }
      if (enableInterrupt) {
        code.push("    sei(); // Enable global interrupts");
      }
      code.push("}");
    }

    return code.join("\n");
  }

  private generateSPIISR(): string {
    return `ISR(SPI_STC_vect) {
    // Прерывание при завершении передачи/приёма SPI
    uint8_t received_data = SPDR; // Прочитать принятый байт
    // TODO: Обработать полученные данные
    // Например, отправить следующий байт:
    // SPDR = next_byte_to_send;
}`;
  }

  private generateI2CInit(func: SelectedPinFunction): string {
    const mode = func.settings.mode || "Master";
    const speed = func.settings.speed || 100000;
    const enableInterrupt = func.settings.enableInterrupt || false;

    const code: string[] = [];
    if (mode === "Master") {
      code.push("void i2c_init_master() {");
      code.push("    TWSR = 0; // Prescaler 1");
      code.push(`    TWBR = (F_CPU / ${speed}UL - 16) / 2; // ${speed / 1000}kHz`);
      if (enableInterrupt) {
        code.push("    TWCR = (1 << TWEN) | (1 << TWIE); // Enable TWI, Interrupt");
        code.push("    sei(); // Включить глобальные прерывания");
      } else {
        code.push("    TWCR = (1 << TWEN); // Enable TWI");
      }
      code.push("}");
    } else {
      const address = func.settings.slaveAddress || 0x08;
      code.push("void i2c_init_slave() {");
      code.push(`    TWAR = ${address} << 1; // Установить собственный адрес`);
      if (enableInterrupt) {
        code.push("    TWCR = (1 << TWEN) | (1 << TWIE) | (1 << TWEA); // Enable TWI, Interrupt");
        code.push("    sei(); // Включить глобальные прерывания");
      } else {
        code.push("    TWCR = (1 << TWEN) | (1 << TWEA); // Enable TWI");
      }
      code.push("}");
    }

    return code.join("\n");
  }

  private generateI2CISR(): string {
    return `ISR(TWI_vect) {
    // Прерывание при событии на шине I2C
    uint8_t status = TWSR & 0xF8; // Статус TWI (маска битов состояния)
    
    // Обработка различных состояний TWI:
    // - START отправлен
    // - SLA+W/R отправлен/принят
    // - DATA отправлен/принят
    // - STOP отправлен
    // - Ошибки (NACK, bus error и т.д.)
    
    switch (status) {
        // TODO: Добавить обработку состояний TWI
        // Примеры состояний:
        // 0x08: START отправлен
        // 0x18: SLA+W отправлен, получен ACK
        // 0x28: DATA отправлен, получен ACK
        // 0x60: SLA+W принят, ACK отправлен
        // 0x80: DATA принят, ACK отправлен
        // 0xA0: STOP или повторный START принят
        default:
            // Неизвестное состояние или ошибка
            break;
    }
}`;
  }

  private generateExternalInterruptInit(func: SelectedPinFunction): string {
    const pin = this.findPinByName(func.pinName);
    if (!pin) return "";

    const interrupt = pin.functions.find((f) => f.type === "EXTERNAL_INTERRUPT");
    if (!interrupt || !interrupt.interrupt) return "";

    const trigger = func.settings.trigger || "RISING";
    const intNum = interrupt.interrupt === "INT0" ? 0 : 1;

    const triggerMap: Record<string, string> = {
      LOW: "0",
      CHANGE: "(1 << ISC" + intNum + "0)",
      RISING: "(1 << ISC" + intNum + "1) | (1 << ISC" + intNum + "0)",
      FALLING: "(1 << ISC" + intNum + "1)",
    };

    const code: string[] = [`void external_interrupt_${interrupt.interrupt.toLowerCase()}_init() {`];
    code.push(`    EICRA |= ${triggerMap[trigger]}; // ${trigger} на ${interrupt.interrupt}`);
    code.push(`    EIMSK |= (1 << INT${intNum}); // Enable ${interrupt.interrupt}`);
    code.push("    sei(); // Включить глобальные прерывания");
    code.push("}");

    return code.join("\n");
  }

  private generateExternalInterruptISR(func: SelectedPinFunction): string {
    const pin = this.findPinByName(func.pinName);
    if (!pin) return "";

    const interrupt = pin.functions.find((f) => f.type === "EXTERNAL_INTERRUPT");
    if (!interrupt || !interrupt.interrupt) return "";

    return `ISR(${interrupt.interrupt}_vect) {
    // Обработка прерывания ${interrupt.interrupt}
}`;
  }

  private generatePCINTInit(pins: SelectedPinFunction[]): string {
    const portGroups: Record<string, Array<{ bit: number; pcintNumber: number; pinName: string }>> = {};

    pins.forEach((pinFunc) => {
      const pin = this.findPinByName(pinFunc.pinName);
      if (!pin) return;

      const port = getPortFromPin(pin.pin);
      const pcintNumber = this.getPCINTNumber(port, pin.number);
      if (pcintNumber === null) return;

      let portGroup: string;
      if (port === "PB") {
        portGroup = "PCIE0";
      } else if (port === "PC") {
        portGroup = "PCIE1";
      } else {
        portGroup = "PCIE2";
      }

      if (!portGroups[portGroup]) {
        portGroups[portGroup] = [];
      }
      portGroups[portGroup].push({
        bit: getBitFromPin(pin.pin),
        pcintNumber: pcintNumber,
        pinName: pin.pin,
      });
    });

    const code: string[] = ["void gpio_pcint_init() {"];
    Object.entries(portGroups).forEach(([group, pinData]) => {
      const port = group === "PCIE0" ? "B" : group === "PCIE1" ? "C" : "D";
      
      // Настраиваем каждый пин как INPUT с подтяжкой
      pinData.forEach((pin) => {
        const pinConfig = this.findPinByName(pin.pinName);
        if (!pinConfig) return;
        const portLetter = this.getPortLetter(getPortFromPin(pinConfig.pin));
        code.push(`    DDR${portLetter} &= ~(1 << DD${portLetter}${pin.bit}); // ${pin.pinName} как INPUT`);
        code.push(`    PORT${portLetter} |= (1 << PORT${portLetter}${pin.bit}); // Включить подтяжку на ${pin.pinName}`);
      });
      
      // Включаем Pin Change Interrupt для порта
      code.push(`    PCICR |= (1 << ${group}); // Включить Pin Change Interrupt для PORT${port}`);
      
      // Настраиваем маску прерываний для всех пинов порта
      const pcintMask = pinData.map((pin) => `(1 << PCINT${pin.pcintNumber})`).join(" | ");
      code.push(`    PCMSK${group.slice(-1)} |= ${pcintMask}; // Включить PCINT для выбранных пинов`);
    });
    code.push("    sei(); // Enable global interrupts");
    code.push("}");

    return code.join("\n");
  }

  private generatePCINTISR(pins: SelectedPinFunction[]): string {
    const portGroups: Record<string, Array<{ bit: number; pcintNumber: number; pinName: string }>> = {};

    pins.forEach((pinFunc) => {
      const pin = this.findPinByName(pinFunc.pinName);
      if (!pin) return;

      const port = getPortFromPin(pin.pin);
      const pcintNumber = this.getPCINTNumber(port, pin.number);
      if (pcintNumber === null) return;

      let portGroup: string;
      if (port === "PB") {
        portGroup = "PCINT0";
      } else if (port === "PC") {
        portGroup = "PCINT1";
      } else {
        portGroup = "PCINT2";
      }

      if (!portGroups[portGroup]) {
        portGroups[portGroup] = [];
      }
      portGroups[portGroup].push({
        bit: getBitFromPin(pin.pin),
        pcintNumber: pcintNumber,
        pinName: pin.pin,
      });
    });

    const isrs: string[] = [];
    Object.entries(portGroups).forEach(([group, pinData]) => {
      const port = group === "PCINT0" ? "B" : group === "PCINT1" ? "C" : "D";
      const portLetter = port;
      
      const isrCode: string[] = [`ISR(${group}_vect) {`];
      isrCode.push(`    // Обработчик изменения пинов PORT${port}`);
      isrCode.push(`    uint8_t pin_state = PIN${portLetter}; // Текущее состояние порта`);
      isrCode.push("");
      
      // Генерируем проверки для каждого настроенного пина
      pinData.forEach((pin) => {
        isrCode.push(`    // Проверка изменения ${pin.pinName} - PCINT${pin.pcintNumber}`);
        isrCode.push(`    if (pin_state & (1 << PIN${portLetter}${pin.bit})) {`);
        isrCode.push(`        // ${pin.pinName} стал HIGH`);
        isrCode.push(`    } else {`);
        isrCode.push(`        // ${pin.pinName} стал LOW`);
        isrCode.push(`    }`);
        if (pinData.length > 1 && pin !== pinData[pinData.length - 1]) {
          isrCode.push("");
        }
      });
      
      isrCode.push("}");
      isrs.push(isrCode.join("\n"));
    });

    return isrs.join("\n\n");
  }

  private generateTimer0PWMInit(func: SelectedPinFunction): string {
    const pin = this.findPinByName(func.pinName);
    if (!pin) return "";

    const channel = pin.functions.find((f) => f.type === "TIMER0_PWM")?.channel || "OC0A";
    const mode = func.settings.mode || "FastPWM";
    const prescaler = func.settings.prescaler || 64;
    const dutyCycle = func.settings.dutyCycle || 128;
    const topValue = func.settings.topValue || 128;
    const enableInterrupt = func.settings.enableInterrupt || false;

    const prescalerMap: Record<number, string> = {
      1: "(1 << CS00)",
      8: "(1 << CS01)",
      64: "(1 << CS01) | (1 << CS00)",
      256: "(1 << CS02)",
      1024: "(1 << CS02) | (1 << CS00)",
    };

    const code: string[] = ["void timer0_pwm_init() {"];
    const port = getPortFromPin(pin.pin);
    const bit = getBitFromPin(pin.pin);
    const portLetter = this.getPortLetter(port);

    if (mode === "Normal") {
      // Normal Mode 0: WGM02=0, WGM01=0, WGM00=0
      code.push(`    TCCR0A = 0; // Normal mode`);
      code.push(`    TCCR0B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (enableInterrupt) {
        code.push(`    TIMSK0 |= (1 << TOIE0); // Enable overflow interrupt`);
        code.push(`    sei(); // Enable global interrupts`);
      }
    } else if (mode === "CTC") {
      // CTC Mode 2: WGM02=0, WGM01=1, WGM00=0
      code.push(`    TCCR0A = (1 << WGM01); // CTC mode`);
      code.push(`    TCCR0B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR0A = ${topValue}; // TOP value`);
      const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || enableInterrupt;
      const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;
      if (enableCOMPAInterrupt) {
        code.push(`    TIMSK0 |= (1 << OCIE0A); // Enable compare match A interrupt`);
      }
      if (enableCOMPBInterrupt) {
        code.push(`    TIMSK0 |= (1 << OCIE0B); // Enable compare match B interrupt`);
        code.push(`    OCR0B = ${func.settings.ocr0b || 64}; // OCR0B value`);
      }
      if (enableCOMPAInterrupt || enableCOMPBInterrupt) {
        code.push(`    sei(); // Enable global interrupts`);
      }
    } else if (mode === "FastPWM") {
      // Fast PWM Mode 3: WGM02=0, WGM01=1, WGM00=1
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR0A = (1 << WGM01) | (1 << WGM00) | (1 << COM0${channel.slice(-1)}1); // Fast PWM, Clear on compare match`);
      code.push(`    TCCR0B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR0${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    } else if (mode === "PhaseCorrectPWM") {
      // Phase Correct PWM Mode 1: WGM02=0, WGM01=0, WGM00=1
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR0A = (1 << WGM00) | (1 << COM0${channel.slice(-1)}1); // Phase Correct PWM, Clear on compare match when up-counting`);
      code.push(`    TCCR0B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR0${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    } else if (mode === "PhaseFrequencyCorrectPWM") {
      // Phase and Frequency Correct PWM Mode 1: WGM02=0, WGM01=0, WGM00=1
      // Для Timer0 это то же самое, что Phase Correct PWM
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR0A = (1 << WGM00) | (1 << COM0${channel.slice(-1)}1); // Phase and Frequency Correct PWM`);
      code.push(`    TCCR0B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR0${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    }
    
    code.push("}");
    return code.join("\n");
  }

  private generateTimer1PWMInit(func: SelectedPinFunction): string {
    const pin = this.findPinByName(func.pinName);
    if (!pin) return "";

    const mode = func.settings.mode || "FastPWM";
    const prescaler = func.settings.prescaler || 8;
    const dutyCycle = func.settings.dutyCycle || 32768;
    const topValue = func.settings.topValue || 65535;
    const enableInterrupt = func.settings.enableInterrupt || false;
    const trigger = func.settings.trigger || "RISING";
    const noiseCanceler = func.settings.noiseCanceler || false;

    const prescalerMap: Record<number, string> = {
      1: "(1 << CS10)",
      8: "(1 << CS11)",
      64: "(1 << CS11) | (1 << CS10)",
      256: "(1 << CS12)",
      1024: "(1 << CS12) | (1 << CS10)",
    };

    if (mode === "InputCapture") {
      // Input Capture Mode - пин ICP1 (PD0/Arduino pin 8)
      const code: string[] = ["void timer1_icp_init() {"];
      if (trigger === "RISING") {
        code.push(`    TCCR1B |= (1 << ICES1); // Capture на RISING edge`);
      } else {
        code.push(`    // Capture на FALLING edge (ICES1 не установлен)`);
      }
      code.push(`    TCCR1B |= ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (noiseCanceler) {
        code.push(`    TCCR1B |= (1 << ICNC1); // Noise Canceler`);
      }
      if (enableInterrupt) {
        code.push(`    TIMSK1 |= (1 << ICIE1); // Enable Input Capture Interrupt`);
        code.push(`    sei(); // Enable global interrupts`);
      }
      code.push("}");
      return code.join("\n");
    }

    const channel = pin.functions.find((f) => f.type === "TIMER1_PWM")?.channel || "OC1A";
    const code: string[] = ["void timer1_pwm_init() {"];
    const port = getPortFromPin(pin.pin);
    const bit = getBitFromPin(pin.pin);
    const portLetter = this.getPortLetter(port);

    if (mode === "Normal") {
      // Normal Mode 0: WGM13=0, WGM12=0, WGM11=0, WGM10=0
      code.push(`    TCCR1A = 0; // Normal mode`);
      code.push(`    TCCR1B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (enableInterrupt) {
        code.push(`    TIMSK1 |= (1 << TOIE1); // Enable overflow interrupt`);
        code.push(`    sei(); // Enable global interrupts`);
      }
    } else if (mode === "CTC") {
      // CTC Mode 4: WGM13=0, WGM12=1, WGM11=0, WGM10=0
      code.push(`    TCCR1A = 0; // CTC mode`);
      code.push(`    TCCR1B |= (1 << WGM12); // CTC`);
      code.push(`    TCCR1B |= ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR1A = ${topValue}; // TOP value`);
      const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || enableInterrupt;
      const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;
      if (enableCOMPAInterrupt) {
        code.push(`    TIMSK1 |= (1 << OCIE1A); // Enable compare match A interrupt`);
      }
      if (enableCOMPBInterrupt) {
        code.push(`    TIMSK1 |= (1 << OCIE1B); // Enable compare match B interrupt`);
        code.push(`    OCR1B = ${func.settings.ocr1b || 32768}; // OCR1B value`);
      }
      if (enableCOMPAInterrupt || enableCOMPBInterrupt) {
        code.push(`    sei(); // Enable global interrupts`);
      }
    } else if (mode === "FastPWM") {
      // Fast PWM Mode 14 (10-bit): WGM13=1, WGM12=1, WGM11=1, WGM10=0
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR1A = (1 << COM1${channel.slice(-1)}1) | (1 << WGM11); // Fast PWM 10-bit, Clear on compare match`);
      code.push(`    TCCR1B = (1 << WGM13) | (1 << WGM12) | ${prescalerMap[prescaler]}; // Fast PWM Mode 14, Prescaler ${prescaler}`);
      code.push(`    OCR1${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    } else if (mode === "PhaseCorrectPWM") {
      // Phase Correct PWM Mode 1 (8-bit): WGM13=0, WGM12=0, WGM11=0, WGM10=1
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR1A = (1 << COM1${channel.slice(-1)}1) | (1 << WGM10); // Phase Correct PWM 8-bit`);
      code.push(`    TCCR1B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR1${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    } else if (mode === "PhaseFrequencyCorrectPWM") {
      // Phase and Frequency Correct PWM Mode 8: WGM13=1, WGM12=0, WGM11=0, WGM10=1
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR1A = (1 << COM1${channel.slice(-1)}1) | (1 << WGM10); // Phase and Frequency Correct PWM`);
      code.push(`    TCCR1B = (1 << WGM13) | ${prescalerMap[prescaler]}; // TOP = ICR1, Prescaler ${prescaler}`);
      code.push(`    ICR1 = ${topValue}; // TOP value (частота ШИМ)`);
      code.push(`    OCR1${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    }

    code.push("}");
    return code.join("\n");
  }

  private generateTimer2PWMInit(func: SelectedPinFunction): string {
    const pin = this.findPinByName(func.pinName);
    if (!pin) return "";

    const channel = pin.functions.find((f) => f.type === "TIMER2_PWM")?.channel || "OC2A";
    const mode = func.settings.mode || "FastPWM";
    const prescaler = func.settings.prescaler || 64;
    const dutyCycle = func.settings.dutyCycle || 128;
    const topValue = func.settings.topValue || 128;
    const enableInterrupt = func.settings.enableInterrupt || false;

    const prescalerMap: Record<number, string> = {
      1: "(1 << CS20)",
      8: "(1 << CS21)",
      32: "(1 << CS21) | (1 << CS20)",
      64: "(1 << CS22)",
      128: "(1 << CS22) | (1 << CS20)",
      256: "(1 << CS22) | (1 << CS21)",
      1024: "(1 << CS22) | (1 << CS21) | (1 << CS20)",
    };

    const code: string[] = ["void timer2_pwm_init() {"];
    const port = getPortFromPin(pin.pin);
    const bit = getBitFromPin(pin.pin);
    const portLetter = this.getPortLetter(port);

    if (mode === "Normal") {
      // Normal Mode 0: WGM22=0, WGM21=0, WGM20=0
      code.push(`    TCCR2A = 0; // Normal mode`);
      code.push(`    TCCR2B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (enableInterrupt) {
        code.push(`    TIMSK2 |= (1 << TOIE2); // Enable overflow interrupt`);
        code.push(`    sei(); // Enable global interrupts`);
      }
    } else if (mode === "CTC") {
      // CTC Mode 2: WGM22=0, WGM21=1, WGM20=0
      code.push(`    TCCR2A = (1 << WGM21); // CTC mode`);
      code.push(`    TCCR2B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR2A = ${topValue}; // TOP value`);
      const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || enableInterrupt;
      const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;
      if (enableCOMPAInterrupt) {
        code.push(`    TIMSK2 |= (1 << OCIE2A); // Enable compare match A interrupt`);
      }
      if (enableCOMPBInterrupt) {
        code.push(`    TIMSK2 |= (1 << OCIE2B); // Enable compare match B interrupt`);
        code.push(`    OCR2B = ${func.settings.ocr2b || 64}; // OCR2B value`);
      }
      if (enableCOMPAInterrupt || enableCOMPBInterrupt) {
        code.push(`    sei(); // Enable global interrupts`);
      }
    } else if (mode === "FastPWM") {
      // Fast PWM Mode 3: WGM22=0, WGM21=1, WGM20=1
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR2A |= (1 << WGM21) | (1 << WGM20); // Fast PWM`);
      code.push(`    TCCR2A |= (1 << COM2${channel.slice(-1)}1); // Clear on compare match`);
      code.push(`    TCCR2B |= ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR2${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    } else if (mode === "PhaseCorrectPWM") {
      // Phase Correct PWM Mode 1: WGM22=0, WGM21=0, WGM20=1
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR2A = (1 << WGM20) | (1 << COM2${channel.slice(-1)}1); // Phase Correct PWM, Clear on compare match when up-counting`);
      code.push(`    TCCR2B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR2${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    } else if (mode === "PhaseFrequencyCorrectPWM") {
      // Phase and Frequency Correct PWM Mode 5: WGM22=1, WGM21=1, WGM20=1
      code.push(`    DDR${portLetter} |= (1 << DD${portLetter}${bit}); // ${channel} как OUTPUT`);
      code.push(`    TCCR2B = (1 << WGM22); // Phase and Frequency Correct PWM`);
      code.push(`    TCCR2A = (1 << WGM21) | (1 << WGM20); // TOP = OCR2A`);
      code.push(`    TCCR2A |= (1 << COM2${channel.slice(-1)}1); // Clear OC2${channel.slice(-1)} on Compare Match when up-counting`);
      code.push(`    TCCR2B |= ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR2A = ${topValue}; // TOP value (частота ШИМ)`);
      code.push(`    OCR2${channel.slice(-1)} = ${dutyCycle}; // Duty cycle`);
    }

    code.push("}");
    return code.join("\n");
  }

  private generateTimer0ISR(func: SelectedPinFunction): string | null {
    const mode = func.settings.mode || "FastPWM";
    const enableInterrupt = func.settings.enableInterrupt || false;
    const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || false;
    const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;
    
    // Для PWM режимов прерывания не используются (только для Normal и CTC)
    if (mode.includes("PWM")) return null;
    
    if (!enableInterrupt && !enableCOMPAInterrupt && !enableCOMPBInterrupt) return null;
    
    const isrs: string[] = [];
    
    if (mode === "Normal" && enableInterrupt) {
      isrs.push(`ISR(TIMER0_OVF_vect) {
    // Прерывание по переполнению Timer0
    // TODO: Обработать событие переполнения
}`);
    } else if (mode === "CTC") {
      if (enableCOMPAInterrupt || enableInterrupt) {
        isrs.push(`ISR(TIMER0_COMPA_vect) {
    // Прерывание по совпадению Timer0 (CTC режим) - OCR0A
    // TODO: Обработать событие совпадения с OCR0A
}`);
      }
      if (enableCOMPBInterrupt) {
        isrs.push(`ISR(TIMER0_COMPB_vect) {
    // Прерывание по совпадению Timer0 (CTC режим) - OCR0B
    // TODO: Обработать событие совпадения с OCR0B
}`);
      }
    }
    
    return isrs.length > 0 ? isrs.join("\n\n") : null;
  }

  private generateTimer1ISR(func: SelectedPinFunction): string | null {
    const mode = func.settings.mode || "FastPWM";
    const enableInterrupt = func.settings.enableInterrupt || false;
    const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || false;
    const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;
    
    // Для PWM режимов прерывания не используются (только для Normal, CTC и InputCapture)
    if (mode.includes("PWM")) return null;
    
    if (!enableInterrupt && !enableCOMPAInterrupt && !enableCOMPBInterrupt && mode !== "InputCapture") return null;
    
    const isrs: string[] = [];
    
    if (mode === "Normal" && enableInterrupt) {
      isrs.push(`ISR(TIMER1_OVF_vect) {
    // Прерывание по переполнению Timer1
    // TODO: Обработать событие переполнения
}`);
    } else if (mode === "CTC") {
      if (enableCOMPAInterrupt || enableInterrupt) {
        isrs.push(`ISR(TIMER1_COMPA_vect) {
    // Прерывание по совпадению Timer1 (CTC режим) - OCR1A
    // TODO: Обработать событие совпадения с OCR1A
}`);
      }
      if (enableCOMPBInterrupt) {
        isrs.push(`ISR(TIMER1_COMPB_vect) {
    // Прерывание по совпадению Timer1 (CTC режим) - OCR1B
    // TODO: Обработать событие совпадения с OCR1B
}`);
      }
    } else if (mode === "InputCapture" && enableInterrupt) {
      isrs.push(`ISR(TIMER1_CAPT_vect) {
    // Прерывание Input Capture Timer1
    uint16_t capture = ICR1; // Считать значение захваченного таймера
    // TODO: Обработать захваченное значение
    // Например, измерить длительность импульса
}`);
    }
    
    return isrs.length > 0 ? isrs.join("\n\n") : null;
  }

  private generateTimer2ISR(func: SelectedPinFunction): string | null {
    const mode = func.settings.mode || "FastPWM";
    const enableInterrupt = func.settings.enableInterrupt || false;
    const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || false;
    const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;
    
    // Для PWM режимов прерывания не используются (только для Normal и CTC)
    if (mode.includes("PWM")) return null;
    
    if (!enableInterrupt && !enableCOMPAInterrupt && !enableCOMPBInterrupt) return null;
    
    const isrs: string[] = [];
    
    if (mode === "Normal" && enableInterrupt) {
      isrs.push(`ISR(TIMER2_OVF_vect) {
    // Прерывание по переполнению Timer2
    // TODO: Обработать событие переполнения
}`);
    } else if (mode === "CTC") {
      if (enableCOMPAInterrupt || enableInterrupt) {
        isrs.push(`ISR(TIMER2_COMPA_vect) {
    // Прерывание по совпадению Timer2 (CTC режим) - OCR2A
    // TODO: Обработать событие совпадения с OCR2A
}`);
      }
      if (enableCOMPBInterrupt) {
        isrs.push(`ISR(TIMER2_COMPB_vect) {
    // Прерывание по совпадению Timer2 (CTC режим) - OCR2B
    // TODO: Обработать событие совпадения с OCR2B
}`);
      }
    }
    
    return isrs.length > 0 ? isrs.join("\n\n") : null;
  }

  private generateADCInit(adcFunctions: SelectedPinFunction[]): string {
    if (adcFunctions.length === 0) return "";

    // Собираем все уникальные каналы ADC
    const channelsSet = new Set<number>();
    for (const func of adcFunctions) {
      const pin = this.findPinByName(func.pinName);
      if (!pin) continue;

      const adcFunc = pin.functions.find((f) => f.type === "ADC");
      if (!adcFunc) continue;
      
      // Для ADC channel может быть числом (channel) или channelNumber
      const channel = (adcFunc.channelNumber !== undefined) 
        ? adcFunc.channelNumber 
        : (typeof adcFunc.channel === 'number' ? adcFunc.channel : undefined);
      
      if (channel !== undefined) {
        channelsSet.add(channel);
      }
    }

    const channels = Array.from(channelsSet).sort();
    if (channels.length === 0) return "";

    // Настройки берем из первой функции (они должны быть одинаковыми для всех каналов)
    const firstFunc = adcFunctions[0];
    const reference = firstFunc.settings.reference || "AVcc";
    // Если prescaler не выбран или равен 0, используем значение по умолчанию 128
    let prescaler = firstFunc.settings.prescaler;
    if (!prescaler || prescaler === 0) {
      prescaler = 128;
    }
    const mode = firstFunc.settings.mode || "Single";

    const refMap: Record<string, string> = {
      AVcc: "(1 << REFS0)",
      AREF: "0",
      "Internal1.1V": "(1 << REFS1) | (1 << REFS0)",
    };

    const prescalerMap: Record<number, string> = {
      2: "(1 << ADPS0)",
      4: "(1 << ADPS1)",
      8: "(1 << ADPS1) | (1 << ADPS0)",
      16: "(1 << ADPS2)",
      32: "(1 << ADPS2) | (1 << ADPS0)",
      64: "(1 << ADPS2) | (1 << ADPS1)",
      128: "(1 << ADPS2) | (1 << ADPS1) | (1 << ADPS0)",
    };

    // Проверяем, что prescaler валиден
    if (!prescalerMap[prescaler]) {
      prescaler = 128; // Используем значение по умолчанию, если prescaler невалиден
    }

    // Генерируем функцию adc_init_single_channel
    const singleChannelCode: string[] = [];
    singleChannelCode.push("void adc_init_single_channel(uint8_t channel) {");
    singleChannelCode.push("    if (channel > 7) return; // Только каналы 0–7 для ATmega328P");
    singleChannelCode.push("");
    singleChannelCode.push("    // Маска для настройки DDRC");
    singleChannelCode.push("    uint8_t pin_mask = 0;");
    singleChannelCode.push("");
    singleChannelCode.push("    switch (channel) {");
    singleChannelCode.push("        case 0: pin_mask = (1 << DDC0); break;");
    singleChannelCode.push("        case 1: pin_mask = (1 << DDC1); break;");
    singleChannelCode.push("        case 2: pin_mask = (1 << DDC2); break;");
    singleChannelCode.push("        case 3: pin_mask = (1 << DDC3); break;");
    singleChannelCode.push("        case 4: pin_mask = (1 << DDC4); break;");
    singleChannelCode.push("        case 5: pin_mask = (1 << DDC5); break;");
    singleChannelCode.push("        default: break; // Каналы 6 и 7 не требуют настройки PORTC");
    singleChannelCode.push("    }");
    singleChannelCode.push("");
    singleChannelCode.push("    if (pin_mask != 0) {");
    singleChannelCode.push("        DDRC &= ~pin_mask;      // Установить пин как INPUT");
    singleChannelCode.push("        PORTC &= ~pin_mask;     // Отключить подтягивающий резистор");
    singleChannelCode.push("    }");
    singleChannelCode.push("");
    singleChannelCode.push(`    // Установка опорного напряжения ${reference}`);
    singleChannelCode.push(`    ADMUX = ${refMap[reference]};`);
    singleChannelCode.push("");
    singleChannelCode.push("    // Включение АЦП и установка предделителя");
    singleChannelCode.push(`    ADCSRA = (1 << ADEN) | ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
    singleChannelCode.push("}");

    // Генерируем функцию adc_init, которая инициализирует все каналы
    const code: string[] = [];
    code.push(singleChannelCode.join("\n"));
    code.push("");
    code.push("void adc_init() {");
    
    // Вызываем adc_init_single_channel для каждого канала
    for (const channel of channels) {
      code.push(`    adc_init_single_channel(${channel});`);
    }
    
    // Дополнительные настройки для FreeRunning режима
    if (mode === "FreeRunning") {
      code.push("    ADCSRA |= (1 << ADATE) | (1 << ADIE); // Auto Triggering, Interrupt");
      code.push("    ADCSRA |= (1 << ADSC); // Start conversion");
      code.push("    sei(); // Enable global interrupts");
    }
    code.push("}");

    return code.join("\n");
  }

  private generateADCISR(): string {
    return `ISR(ADC_vect) {
    uint16_t adc_value = ADC; // Считать результат
    // Обработка значения
}`;
  }

  private generateAnalogComparatorInit(func: SelectedPinFunction): string {
    const mode = func.settings?.mode || "Interrupt";
    
    const code: string[] = ["void analog_comparator_init() {"];
    
    if (mode === "Timer1Capture") {
      // Режим с Timer1 Input Capture - компаратор используется как источник для Timer1
      code.push("    ACSR = (1 << ACIC); // Включить Input Capture на компараторе");
      code.push("    // Теперь Timer1 будет захватывать значение при срабатывании компаратора");
      code.push("    // Необходимо настроить Timer1 в режиме Input Capture");
    } else {
      // Обычный режим - прерывание при изменении результата компаратора
      code.push("    ACSR = (1 << ACIE); // Enable interrupt");
      code.push("    sei(); // Включить глобальные прерывания");
    }
    
    code.push("}");

    return code.join("\n");
  }

  private generateAnalogComparatorISR(func?: SelectedPinFunction): string {
    const mode = func?.settings?.mode || "Interrupt";
    
    // ISR генерируется только для режима Interrupt
    // Для режима Timer1Capture используется ISR(TIMER1_CAPT_vect)
    if (mode === "Timer1Capture") {
      return "";
    }
    
    return `ISR(ANALOG_COMP_vect) {
    // Обработка изменения результата компаратора
}`;
  }

  private generateWatchdogInit(func: SelectedPinFunction): string {
    const timeout = func.settings.timeout || 2000;
    const mode = func.settings.mode || "Reset";

    const timeoutMap: Record<number, string> = {
      16: "(1 << WDP0)",
      32: "(1 << WDP1)",
      64: "(1 << WDP1) | (1 << WDP0)",
      125: "(1 << WDP2)",
      250: "(1 << WDP2) | (1 << WDP0)",
      500: "(1 << WDP2) | (1 << WDP1)",
      1000: "(1 << WDP2) | (1 << WDP1) | (1 << WDP0)",
      2000: "(1 << WDP3)",
      4000: "(1 << WDP3) | (1 << WDP0)",
      8000: "(1 << WDP3) | (1 << WDP1)",
    };

    const code: string[] = ["void wdt_init() {"];
    code.push("    MCUSR &= ~(1 << WDRF); // Сбросить флаг срабатывания WDT");
    code.push("    WDTCSR |= (1 << WDCE) | (1 << WDE); // Разрешить изменение");
    if (mode === "Interrupt") {
      // Режим "Прерывание + сброс": устанавливаем и WDIE, и WDE
      // Сначала прерывание, затем сброс (если не вызвать wdt_reset() в ISR)
      code.push(`    WDTCSR = (1 << WDIE) | (1 << WDE) | ${timeoutMap[timeout]}; // Прерывание + сброс, ${timeout}ms`);
      code.push("    sei(); // Включить глобальные прерывания");
    } else {
      code.push(`    WDTCSR = (1 << WDE) | ${timeoutMap[timeout]}; // Просто сброс, ${timeout}ms`);
    }
    code.push("}");

    return code.join("\n");
  }

  private generateWatchdogISR(): string {
    return `ISR(WDT_vect) {
    // Обработчик прерывания WDT
    // Можно выполнить действия перед сбросом
    wdt_reset(); // Сбросить таймер, если нужно избежать сброса
}`;
  }

  private generateMainFunction(initFunctions: string[], selectedPins: SelectedPinFunction[]): string {
    // Находим настройки UART для передачи параметра baud
    const uartFunc = selectedPins.find((p) => p.functionType === "UART");
    const defaultBaud = this.boardConfig.peripherals.UART?.baudRates?.[0] || 9600;
    const uartBaud = uartFunc?.settings?.baud || defaultBaud;

    const functionCalls = initFunctions.map((func) => {
      const match = func.match(/void\s+(\w+)\s*\(/);
      if (!match) return "";
      
      const funcName = match[1];
      
      // Для uart_init передаём параметр baud согласно документации
      if (funcName === "uart_init") {
        return `    ${funcName}(${uartBaud});`;
      }
      
      return `    ${funcName}();`;
    }).filter(Boolean);

    return `int main(void) {
${functionCalls.join("\n")}
    
    while(1) {
        // основной цикл
    }
}`;
  }

  private findPinByName(pinName: string): PinConfig | undefined {
    return this.boardConfig.pins.find((p) => p.pin === pinName);
  }

  /**
   * Преобразует полное имя порта (PB, PC, PD) в букву порта (B, C, D)
   * для использования в именах регистров (DDRB, PORTB и т.д.)
   */
  private getPortLetter(port: string): string {
    // Убираем префикс "P" из имени порта
    // PB -> B, PC -> C, PD -> D
    if (port.startsWith("P")) {
      return port.substring(1);
    }
    return port;
  }

  // Методы для независимых таймеров (не привязанных к пинам)
  private generateTimer0Init(func: SelectedPinFunction): string {
    const mode = func.settings.mode || "Normal";
    const prescaler = func.settings.prescaler || 64;
    const topValue = func.settings.topValue || 128;
    const enableInterrupt = func.settings.enableInterrupt || false;
    const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || false;
    const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;

    const prescalerMap: Record<number, string> = {
      1: "(1 << CS00)",
      8: "(1 << CS01)",
      64: "(1 << CS01) | (1 << CS00)",
      256: "(1 << CS02)",
      1024: "(1 << CS02) | (1 << CS00)",
    };

    const code: string[] = ["void timer0_init() {"];

    if (mode === "Normal") {
      code.push(`    TCCR0A = 0; // Normal mode`);
      code.push(`    TCCR0B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (enableInterrupt) {
        code.push(`    TIMSK0 |= (1 << TOIE0); // Enable overflow interrupt`);
      }
    } else if (mode === "CTC") {
      code.push(`    TCCR0A = (1 << WGM01); // CTC mode`);
      code.push(`    TCCR0B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR0A = ${topValue}; // TOP value`);
      if (enableCOMPAInterrupt) {
        code.push(`    TIMSK0 |= (1 << OCIE0A); // Enable compare match A interrupt`);
      }
      if (enableCOMPBInterrupt) {
        code.push(`    TIMSK0 |= (1 << OCIE0B); // Enable compare match B interrupt`);
        code.push(`    OCR0B = ${func.settings.ocr0b || 64}; // OCR0B value`);
      }
    }
    
    if (enableInterrupt || enableCOMPAInterrupt || enableCOMPBInterrupt) {
      code.push(`    sei(); // Enable global interrupts`);
    }
    
    code.push("}");
    return code.join("\n");
  }

  private generateTimer1Init(func: SelectedPinFunction): string {
    const mode = func.settings.mode || "Normal";
    const prescaler = func.settings.prescaler || 8;
    const topValue = func.settings.topValue || 65535;
    const enableInterrupt = func.settings.enableInterrupt || false;
    const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || false;
    const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;
    const trigger = func.settings.trigger || "RISING";
    const noiseCanceler = func.settings.noiseCanceler || false;

    const prescalerMap: Record<number, string> = {
      1: "(1 << CS10)",
      8: "(1 << CS11)",
      64: "(1 << CS11) | (1 << CS10)",
      256: "(1 << CS12)",
      1024: "(1 << CS12) | (1 << CS10)",
    };

    if (mode === "InputCapture") {
      const code: string[] = ["void timer1_icp_init() {"];
      if (trigger === "RISING") {
        code.push(`    TCCR1B |= (1 << ICES1); // Capture на RISING edge`);
      } else {
        code.push(`    // Capture на FALLING edge (ICES1 не установлен)`);
      }
      code.push(`    TCCR1B |= ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (noiseCanceler) {
        code.push(`    TCCR1B |= (1 << ICNC1); // Noise Canceler`);
      }
      if (enableInterrupt) {
        code.push(`    TIMSK1 |= (1 << ICIE1); // Enable Input Capture Interrupt`);
        code.push(`    sei(); // Enable global interrupts`);
      }
      code.push("}");
      return code.join("\n");
    }

    const code: string[] = ["void timer1_init() {"];

    if (mode === "Normal") {
      code.push(`    TCCR1A = 0; // Normal mode`);
      code.push(`    TCCR1B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (enableInterrupt) {
        code.push(`    TIMSK1 |= (1 << TOIE1); // Enable overflow interrupt`);
      }
    } else if (mode === "CTC") {
      code.push(`    TCCR1A = 0; // CTC mode`);
      code.push(`    TCCR1B |= (1 << WGM12); // CTC`);
      code.push(`    TCCR1B |= ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR1A = ${topValue}; // TOP value`);
      if (enableCOMPAInterrupt) {
        code.push(`    TIMSK1 |= (1 << OCIE1A); // Enable compare match A interrupt`);
      }
      if (enableCOMPBInterrupt) {
        code.push(`    TIMSK1 |= (1 << OCIE1B); // Enable compare match B interrupt`);
        code.push(`    OCR1B = ${func.settings.ocr1b || 32768}; // OCR1B value`);
      }
    }
    
    if (enableInterrupt || enableCOMPAInterrupt || enableCOMPBInterrupt) {
      code.push(`    sei(); // Enable global interrupts`);
    }
    
    code.push("}");
    return code.join("\n");
  }

  private generateTimer2Init(func: SelectedPinFunction): string {
    const mode = func.settings.mode || "Normal";
    const prescaler = func.settings.prescaler || 64;
    const topValue = func.settings.topValue || 128;
    const enableInterrupt = func.settings.enableInterrupt || false;
    const enableCOMPAInterrupt = func.settings.enableCOMPAInterrupt || false;
    const enableCOMPBInterrupt = func.settings.enableCOMPBInterrupt || false;

    const prescalerMap: Record<number, string> = {
      1: "(1 << CS20)",
      8: "(1 << CS21)",
      32: "(1 << CS21) | (1 << CS20)",
      64: "(1 << CS22)",
      128: "(1 << CS22) | (1 << CS20)",
      256: "(1 << CS22) | (1 << CS21)",
      1024: "(1 << CS22) | (1 << CS21) | (1 << CS20)",
    };

    const code: string[] = ["void timer2_init() {"];

    if (mode === "Normal") {
      code.push(`    TCCR2A = 0; // Normal mode`);
      code.push(`    TCCR2B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      if (enableInterrupt) {
        code.push(`    TIMSK2 |= (1 << TOIE2); // Enable overflow interrupt`);
      }
    } else if (mode === "CTC") {
      code.push(`    TCCR2A = (1 << WGM21); // CTC mode`);
      code.push(`    TCCR2B = ${prescalerMap[prescaler]}; // Prescaler ${prescaler}`);
      code.push(`    OCR2A = ${topValue}; // TOP value`);
      if (enableCOMPAInterrupt) {
        code.push(`    TIMSK2 |= (1 << OCIE2A); // Enable compare match A interrupt`);
      }
      if (enableCOMPBInterrupt) {
        code.push(`    TIMSK2 |= (1 << OCIE2B); // Enable compare match B interrupt`);
        code.push(`    OCR2B = ${func.settings.ocr2b || 64}; // OCR2B value`);
      }
    }
    
    if (enableInterrupt || enableCOMPAInterrupt || enableCOMPBInterrupt) {
      code.push(`    sei(); // Enable global interrupts`);
    }
    
    code.push("}");
    return code.join("\n");
  }
}


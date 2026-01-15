import { app } from "electron";
import path from "path";
import { promises as fs } from "fs";

/**
 * Интерфейс для результата генерации кода
 */
export interface GeneratedCode {
  header: string;
  implementation: string;
  includes: string[];
}

// ============================================================
// Новый генератор (портирован из src/config/test/test.ts)
// Работает с:
// - state.interrupts: { RX: { enabled: true } }
// - флагами enableRXInterrupt: true (на уровне периферии или пинов)
// ============================================================

type CGPeripheralKind = "pin" | "global";

type CGPeripheralConfig = {
  id: string;
  kind: CGPeripheralKind;
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

type CGJsonConfig = {
  meta?: { defaultFcpu?: number };
  [peripheralName: string]: CGPeripheralConfig | any;
};

type CGUIState = {
  peripherals: {
    [id: string]: {
      enabled?: boolean;
      pins?: Record<string, Record<string, any>>;
      interrupts?: Record<string, { enabled?: boolean }>;
      [key: string]: any;
    };
  };
};

function getPackagedConfigDirNearApp(): string {
  // Требование (prod): конфиг берём строго из:
  // /<папка где лежит IDE.app>/CONFIG/atmega328.json
  //
  // app.getPath("exe") на macOS: .../IDE.app/Contents/MacOS/IDE
  const exePath = app.getPath("exe");
  const appBundlePath = path.resolve(exePath, "..", "..", ".."); // -> IDE.app
  const appContainerDir = path.dirname(appBundlePath); // -> папка, где лежит IDE.app
  return path.join(appContainerDir, "CONFIG");
}

function getCodegenConfigPath(): string {
  // Dev: строго из src/config/atmega328.json
  if (!app.isPackaged) {
    return path.join(process.cwd(), "src", "config", "atmega328.json");
  }
  // Prod: строго рядом с IDE.app
  return path.join(getPackagedConfigDirNearApp(), "atmega328.json");
}

async function loadCodegenConfig(): Promise<CGJsonConfig> {
  const configPath = getCodegenConfigPath();
  const raw = await fs.readFile(configPath, "utf-8");
  return JSON.parse(raw) as CGJsonConfig;
}

function cgApplyTemplate(
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

function cgApplyValueMapping(
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

function cgResolveMode(
  state: Record<string, any>,
  modeKey?: string,
  modeMapping?: Record<string, string>
): string | null {
  if (!modeKey || !(modeKey in state)) return null;

  const modeValue = state[modeKey];
  if (!modeValue) return null;

  if (modeMapping && modeValue in modeMapping) {
    return modeMapping[modeValue];
  }

  return String(modeValue).toLowerCase().replace(/\s+/g, "_");
}

function cgGetInitTemplates(
  initConfig: Record<string, string[] | Record<string, string[]>>,
  mode: string | null
): string[] | null {
  if (mode && "$mode" in initConfig) {
    const modeConfig = initConfig["$mode"];

    if (typeof modeConfig === "object" && !Array.isArray(modeConfig)) {
      if (mode in modeConfig) {
        const templates = (modeConfig as Record<string, any>)[mode];
        return Array.isArray(templates) ? templates : null;
      }
    }
  }

  if (!mode) {
    for (const key in initConfig) {
      const value = initConfig[key];
      if (Array.isArray(value)) return value;
    }
  }

  return null;
}

function cgGetPortFromPin(pin: string): string {
  // "PB0" -> "B"
  return pin.substring(1, 2);
}

function cgGetBitFromPin(pin: string): number {
  // "PB0" -> 0
  return parseInt(pin.substring(2), 10);
}

function cgGetPinPortInfo(
  pinName: string,
  ports?: Array<{
    id: string;
    name: string;
    pins: number[];
    registers?: { ddr: string; port: string; pin: string };
  }>
): { port: string; pin: number; registers?: { ddr: string; port: string; pin: string } } | null {
  const portLetter = cgGetPortFromPin(pinName);
  const bit = cgGetBitFromPin(pinName);

  if (ports) {
    const portConfig = ports.find((p) => p.id === portLetter);
    if (portConfig) {
      return { port: portLetter, pin: bit, registers: portConfig.registers };
    }
  }

  return { port: portLetter, pin: bit };
}

function cgGetPCINTParams(pinName: string): Record<string, string | number> {
  const portLetter = cgGetPortFromPin(pinName);

  let pcicr = "0";
  if (portLetter === "B") pcicr = "0";
  else if (portLetter === "C") pcicr = "1";
  else if (portLetter === "D") pcicr = "2";

  return { pcicr };
}

function cgGeneratePinPeripheral(
  spec: CGPeripheralConfig,
  state: { pins?: Record<string, Record<string, any>>; [key: string]: any },
  defaultFcpu?: number
): string[] {
  const lines: string[] = [];
  const codeGen = spec.codeGenerator;

  if (state.pins && Object.keys(state.pins).length > 0) {
    for (const pinName in state.pins) {
      const pinState = state.pins[pinName];
      const pinInfo = cgGetPinPortInfo(pinName, codeGen.ports);
      if (!pinInfo) continue;

      const mode = cgResolveMode(pinState, codeGen.modeKey, codeGen.modeMapping);
      const templates = cgGetInitTemplates(codeGen.init, mode);
      if (!templates) continue;

      const params = cgApplyValueMapping(pinState, codeGen.valueMapping);
      (params as any).port = pinInfo.port;
      (params as any).pin = pinInfo.pin;

      if (spec.id === "gpio") {
        Object.assign(params, cgGetPCINTParams(pinName));

        if (codeGen.ports) {
          const portConfig = codeGen.ports.find((p) => p.id === pinInfo.port);
          if (portConfig && portConfig.registers) {
            (params as any).ddr = portConfig.registers.ddr;
            (params as any).portReg = portConfig.registers.port;
            (params as any).pinReg = portConfig.registers.pin;

            (params as any).ddrBit = `DDD${pinInfo.pin}`;
            (params as any).portBit = `PORT${pinInfo.port}${pinInfo.pin}`;
            (params as any).pinBit = `PIN${pinInfo.port}${pinInfo.pin}`;
          }
        }
      }

      if (defaultFcpu && templates.some((t) => t.includes("F_CPU"))) {
        (params as any).F_CPU = defaultFcpu;
      }

      lines.push(`// ${spec.id.toUpperCase()} ${pinName}`);
      for (const tpl of templates) {
        lines.push(cgApplyTemplate(tpl, params));
      }
    }
  } else {
    let templates: string[] | null = null;

    if (state.interrupt && codeGen.init[state.interrupt]) {
      const value = codeGen.init[state.interrupt];
      if (Array.isArray(value)) templates = value;
    } else {
      const mode = cgResolveMode(state, codeGen.modeKey, codeGen.modeMapping);
      templates = cgGetInitTemplates(codeGen.init, mode);
    }

    if (templates) {
      const params = cgApplyValueMapping(state, codeGen.valueMapping);
      if (defaultFcpu && templates.some((t) => t.includes("F_CPU"))) {
        (params as any).F_CPU = defaultFcpu;
      }

      lines.push(`// ${spec.id.toUpperCase()}`);
      for (const tpl of templates) {
        lines.push(cgApplyTemplate(tpl, params));
      }
    }
  }

  return lines;
}

function cgGenerateGlobalPeripheral(
  spec: CGPeripheralConfig,
  state: Record<string, any>,
  defaultFcpu?: number
): string[] {
  if (state.enabled === false) return [];

  const codeGen = spec.codeGenerator;
  const mode = cgResolveMode(state, codeGen.modeKey, codeGen.modeMapping);

  let templates: string[] | null = null;

  if (state.interrupt && codeGen.init[state.interrupt]) {
    const value = codeGen.init[state.interrupt];
    if (Array.isArray(value)) templates = value;
  } else {
    templates = cgGetInitTemplates(codeGen.init, mode);
  }

  if (!templates || templates.length === 0) return [];

  const params = cgApplyValueMapping(state, codeGen.valueMapping);
  if (defaultFcpu && templates.some((t) => t.includes("F_CPU"))) {
    (params as any).F_CPU = defaultFcpu;
  }

  const lines: string[] = [];
  lines.push(`// ${spec.id.toUpperCase()}`);
  for (const tpl of templates) {
    lines.push(cgApplyTemplate(tpl, params));
  }

  return lines;
}

function cgGenerateInterrupts(
  spec: CGPeripheralConfig,
  state: {
    pins?: Record<string, Record<string, any>>;
    interrupts?: Record<string, { enabled?: boolean }>;
    [key: string]: any;
  }
): { enable: string[]; isr: string[] } {
  const enableLines: string[] = [];
  const isrLines: string[] = [];

  const codeGen = spec.codeGenerator;
  if (!codeGen.interrupts) return { enable: enableLines, isr: isrLines };

  // Поддержка двух форматов:
  // 1) state.interrupts: { RX: { enabled: true } }
  // 2) флаги в настройках: enableRXInterrupt: true (либо на уровне периферии, либо в настройках пинов)
  const resolveInterruptEnabled = (interruptName: string): boolean => {
    if (state.interrupts && interruptName in state.interrupts) {
      return !!state.interrupts[interruptName]?.enabled;
    }

    const flagKey = `enable${interruptName}Interrupt`;

    if (spec.kind === "pin" && state.pins && Object.keys(state.pins).length > 0) {
      for (const pinName in state.pins) {
        const pinState = state.pins[pinName];
        if (pinState && pinState[flagKey] === true) return true;
      }
      return false;
    }

    if (state[flagKey] === true) return true;

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
        if (state.pins && spec.kind === "pin" && Object.keys(state.pins).length > 0) {
          if (spec.id === "gpio" && interruptName === "PCINT") {
            for (const pinName in state.pins) {
              const pinInfo = cgGetPinPortInfo(pinName, codeGen.ports);
              if (!pinInfo) continue;

              const params: Record<string, string | number> = {
                port: pinInfo.port,
                pin: pinInfo.pin,
                ...cgGetPCINTParams(pinName),
              };

              if (codeGen.ports) {
                const portConfig = codeGen.ports.find((p) => p.id === pinInfo.port);
                if (portConfig && portConfig.registers) {
                  params.ddr = portConfig.registers.ddr;
                  params.portReg = portConfig.registers.port;
                  params.pinReg = portConfig.registers.pin;

                  (params as any).ddrBit = `DDD${pinInfo.pin}`;
                  (params as any).portBit = `PORT${pinInfo.port}${pinInfo.pin}`;
                  (params as any).pinBit = `PIN${pinInfo.port}${pinInfo.pin}`;
                }
              }

              enableLines.push(cgApplyTemplate(enableLine, params));
            }
          } else {
            const params = cgApplyValueMapping(state, codeGen.valueMapping);
            enableLines.push(cgApplyTemplate(enableLine, params));
          }
        } else {
          const params = cgApplyValueMapping(state, codeGen.valueMapping);
          enableLines.push(cgApplyTemplate(enableLine, params));
        }
      }
    }

    if (interruptConfig.code.isr) {
      if (state.pins && spec.kind === "pin" && Object.keys(state.pins).length > 0) {
        if (spec.id === "gpio" && interruptName === "PCINT") {
          for (const pinName in state.pins) {
            const pinInfo = cgGetPinPortInfo(pinName, codeGen.ports);
            if (!pinInfo) continue;

            const params: Record<string, string | number> = {
              port: pinInfo.port,
              pin: pinInfo.pin,
              ...cgGetPCINTParams(pinName),
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
              isrLines.push(cgApplyTemplate(isrLine, params));
            }
          }
        } else {
          const params = cgApplyValueMapping(state, codeGen.valueMapping);
          for (const isrLine of interruptConfig.code.isr) {
            isrLines.push(cgApplyTemplate(isrLine, params));
          }
        }
      } else {
        const params = cgApplyValueMapping(state, codeGen.valueMapping);
        for (const isrLine of interruptConfig.code.isr) {
          isrLines.push(cgApplyTemplate(isrLine, params));
        }
      }
    }
  }

  return { enable: enableLines, isr: isrLines };
}

function cgGenerateFromConfig(
  jsonConfig: CGJsonConfig,
  uiState: CGUIState,
  fCpuOverride?: number
): {
  includes: string[];
  initLines: string[];
  interruptEnableLines: string[];
  isrLines: string[];
} {
  const initLines: string[] = [];
  const interruptEnableLines: string[] = [];
  const isrLines: string[] = [];
  const includes = new Set<string>();

  const defaultFcpu = fCpuOverride ?? jsonConfig.meta?.defaultFcpu;

  for (const peripheralName in jsonConfig) {
    if (peripheralName === "meta") continue;
    // UI_PIN и прочие нерелевантные ключи в тестовом конфиге
    if (peripheralName === "UI_PIN") continue;

    const peripheralConfig = jsonConfig[peripheralName] as CGPeripheralConfig;
    if (!peripheralConfig || !peripheralConfig.codeGenerator) continue;

    // Поддержка двух вариантов ключей в uiState.peripherals:
    // - новый: по peripheralConfig.id (например, "gpio", "watchdog_timer")
    // - UI/старый: по имени секции в конфиге (например, "GPIO", "WATCHDOG_TIMER")
    const state =
      uiState.peripherals[peripheralConfig.id] ?? uiState.peripherals[peripheralName];
    if (!state) continue;

    if (peripheralConfig.codeGenerator.globalIncludes) {
      for (const inc of peripheralConfig.codeGenerator.globalIncludes) {
        includes.add(inc);
      }
    }

    let peripheralInitLines: string[] = [];
    if (peripheralConfig.kind === "pin") {
      peripheralInitLines = cgGeneratePinPeripheral(peripheralConfig, state, defaultFcpu);
    } else if (peripheralConfig.kind === "global") {
      peripheralInitLines = cgGenerateGlobalPeripheral(peripheralConfig, state, defaultFcpu);
    }

    if (peripheralInitLines.length > 0) {
      initLines.push(...peripheralInitLines);
      initLines.push("");
    }

    const interruptCode = cgGenerateInterrupts(peripheralConfig, state);
    if (interruptCode.enable.length > 0) interruptEnableLines.push(...interruptCode.enable);
    if (interruptCode.isr.length > 0) {
      isrLines.push(...interruptCode.isr);
      includes.add("<avr/interrupt.h>");
    }
  }

  return {
    includes: Array.from(includes).sort(),
    initLines,
    interruptEnableLines,
    isrLines,
  };
}

/**
 * Главная функция генерации кода
 */
export function generateInitCode(
  uiState: CGUIState,
  fCpu?: number
): Promise<GeneratedCode> {
  // 1) Берём конфиг и uiState напрямую (как в src/config/test/test.ts)
  const configPromise = loadCodegenConfig();

  // 2) Генерируем наборы строк
  return configPromise.then((config) => {
    const { includes, initLines, interruptEnableLines, isrLines } =
      cgGenerateFromConfig(config, uiState, fCpu);

    // 3) Формируем pins_init.h / pins_init.cpp (как ожидает projectHandlers.ts)
    const finalIncludes = new Set<string>(["<Arduino.h>", ...includes]);

    const headerCode = `#ifndef PINS_INIT_H
#define PINS_INIT_H

${Array.from(finalIncludes)
  .map((inc) => `#include ${inc}`)
  .join("\n")}

void pins_init_all(void);

#endif // PINS_INIT_H
`;

    const bodyLines: string[] = [];
    // Пустые строки оставляем как есть (не удаляем) — чтобы сохранять читаемость, как в test.ts
    bodyLines.push(...initLines);
    if (interruptEnableLines.length > 0) {
      if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] !== "") bodyLines.push("");
      bodyLines.push(...interruptEnableLines);
      bodyLines.push("sei(); // Enable global interrupts");
    }

    const implementationCode = `${Array.from(finalIncludes)
    .map((inc) => `#include ${inc}`)
    .join("\n")}
#include "pins_init.h"

void pins_init_all(void) {
${bodyLines.map((line) => `    ${line}`).join("\n")}
}

${isrLines.length > 0 ? "\n" + isrLines.join("\n") + "\n" : ""}
`;

    return {
      header: headerCode,
      implementation: implementationCode,
      includes: Array.from(finalIncludes),
    };
  });
}

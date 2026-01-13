type PeripheralConfig = {
  id: string;
  kind: "pin" | "global";
  pinMapping: Record<string, string[]>;
  ui: {
    name: string;
    requiresAllPins?: boolean;
    alerts?: { severity: string; message: string; showWhen: string }[];
    config?: Record<
      string,
      {
        name: string;
        type: "select" | "number";
        values?: any[];
        defaultValue: any;
        appliesTo?: { mode?: string[] };
        ui: { component: string; valueType: string | number };
        inputProps?: { min?: number; max?: number };
        helperText?: string;
      }
    >;
    interrupts?: Record<
      string,
      {
        name: string;
        description: string;
        defaultEnabled?: boolean;
      }
    >;
  };
  codeGenerator: {
    globalIncludes: string[];
    modeKey?: string;
    modeMapping?: Record<string, string>;
    valueMapping?: Record<string, Record<string | number, number>>;
    init: Record<string, string[] | Record<string, string[]>>;
    interrupts?: Record<
      string,
      {
        code: {
          enable: string[];
          isr: string[];
        };
      }
    >;
  };
  conflicts?: {
    pins: string[];
    peripherals: string[];
    message: string;
  }[];
};

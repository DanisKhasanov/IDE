// Типы для конфигурации плат и пинов

export interface PinFunction {
  type: string;
  modes?: string[];
  pcintNumber?: number;
  channel?: string;
  role?: string;
  interrupt?: string;
  triggers?: string[];
  input?: string;
  channelNumber?: number;
}

export interface PinConfig {
  port: string;
  bit: number;
  arduinoPin: number;
  name: string;
  arduinoName: string;
  functions: PinFunction[];
}

export interface PeripheralConfig {
  available: boolean;
  pins?: string[];
  channels?: number[];
  defaultBaud?: number;
  baudRates?: number[];
  dataBits?: number[];
  stopBits?: number[];
  parity?: string[];
  modes?: string[];
  cpol?: number[];
  cpha?: number[];
  speeds?: string[] | number[];
  slaveAddressRange?: number[];
  reference?: string[];
  prescalers?: number[];
  interrupts?: string[];
  triggers?: string[];
  timeouts?: number[];
}

export interface ConflictRule {
  description: string;
  when: string;
  conflictsWith: string[];
  pins: string[];
}

export interface BoardConfig {
  id: string;
  name: string;
  fCpu: string;
  pins: PinConfig[];
  peripherals: Record<string, PeripheralConfig>;
  conflicts: ConflictRule[];
}

// Настройки выбранной функции пина
export interface SelectedPinFunction {
  pinName: string;
  functionType: string;
  settings: Record<string, any>;
}

// Настройки проекта для генерации кода
export interface ProjectPinConfig {
  boardId: string;
  fCpu: string;
  selectedPins: SelectedPinFunction[];
}





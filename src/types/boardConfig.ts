// Типы для конфигурации плат и пинов

// Новый формат сигнала из pins.json
export interface PinSignal {
  type: string;
  mode: string;
  metadata: Record<string, any>;
}

// Новый формат пина из pins.json
export interface PinConfig {
  id: string;
  port: string;
  number: number;
  position: {
    x: number;
    y: number;
  };
  signals: PinSignal[];
  // Для обратной совместимости - вычисляемое поле
  pin?: string;
  // Для обратной совместимости - преобразованные signals в functions
  functions?: PinFunction[];
}

// Старый формат PinFunction (для обратной совместимости)
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

export interface PeripheralConfig {
  available?: boolean;
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
  enableInterrupt?: boolean;
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
  frequency: string;
  image?: string;
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





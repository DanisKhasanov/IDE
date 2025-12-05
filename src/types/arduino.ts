// Типы для Arduino компиляции

export interface CompileResult {
  success: boolean;
  hexFile?: string;
  elfFile?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export interface BoardConfig {
  name: string;
  mcu: string;
  fCpu: string;
  variant: string;
  boardDefine?: string; // Для макроса ARDUINO_AVR_* (например AVR_UNO, AVR_NG)
}

export interface PlatformConfig {
  compilerCppCmd: string;
  compilerCppFlags: string;
  compilerCCmd: string;
  compilerCFlags: string;
  compilerElfFlags: string;
  objcopyCmd: string;
  objcopyHexFlags: string;
}

export interface ArduinoProjectInfo {
  isArduino: boolean;
  mainCppPath?: string;
  projectPath: string;
}

// Типы для работы с COM-портами
export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
  friendlyName?: string;
}

// Типы для заливки прошивки
export interface UploadResult {
  success: boolean;
  message?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
}


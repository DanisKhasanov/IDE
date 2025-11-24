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


import { exec } from "child_process";
import { promisify } from "util";
import path from "node:path";
import fs from "fs/promises";
import { existsSync } from "fs";
import type {
  CompileResult,
  BoardConfig,
  PlatformConfig,
  ArduinoProjectInfo,
} from "@/types/arduino";

const execAsync = promisify(exec);

// Вспомогательная функция для проверки наличия ошибок в выводе компилятора
// Охватывает все типы ошибок AVR-GCC компилятора:
// 1. Синтаксические ошибки (syntax errors)
// 2. Ошибки типов (type errors)
// 3. Ошибки неопределенных ссылок (undefined reference/symbol)
// 4. Ошибки множественных определений (multiple definition)
// 5. Ошибки отсутствующих файлов (file not found)
// 6. Ошибки линковки (linking errors)
// 7. Ошибки препроцессора (preprocessor errors)
// 8. Ошибки несовместимости типов (type mismatch)
// 9. Ошибки переполнения памяти (memory overflow)
// 10. Ошибки несовместимости архитектуры (architecture mismatch)
function hasCompilationErrors(output: string): boolean {
  if (!output) return false;
  const lowerOutput = output.toLowerCase();
  
  // Проверяем различные форматы ошибок компилятора
  return (
    // Основные форматы ошибок компилятора
    lowerOutput.includes("error:") ||
    lowerOutput.includes("fatal error:") ||
    lowerOutput.includes("internal compiler error") ||
    
    // Ошибки линковки
    lowerOutput.includes("undefined reference") ||
    lowerOutput.includes("undefined symbol") ||
    lowerOutput.includes("multiple definition") ||
    lowerOutput.includes("duplicate symbol") ||
    lowerOutput.includes("relocation truncated") ||
    lowerOutput.includes("cannot resolve") ||
    lowerOutput.includes("unresolved symbol") ||
    
    // Ошибки файловой системы
    lowerOutput.includes("cannot find") ||
    lowerOutput.includes("no such file") ||
    lowerOutput.includes("file not found") ||
    lowerOutput.includes("no such file or directory") ||
    lowerOutput.includes("cannot open") ||
    lowerOutput.includes("permission denied") ||
    
    // Ошибки препроцессора
    lowerOutput.includes("#error") ||
    lowerOutput.includes("preprocessor error") ||
    lowerOutput.includes("macro redefinition") ||
    
    // Ошибки типов и несовместимости
    lowerOutput.includes("type mismatch") ||
    lowerOutput.includes("incompatible type") ||
    lowerOutput.includes("invalid conversion") ||
    lowerOutput.includes("cannot convert") ||
    lowerOutput.includes("no matching function") ||
    lowerOutput.includes("ambiguous") ||
    
    // Ошибки памяти
    lowerOutput.includes("section .text will not fit") ||
    lowerOutput.includes("section .data will not fit") ||
    lowerOutput.includes("section .bss will not fit") ||
    lowerOutput.includes("region") && lowerOutput.includes("overflowed") ||
    
    // Ошибки архитектуры
    lowerOutput.includes("architecture") && lowerOutput.includes("not supported") ||
    lowerOutput.includes("instruction not supported") ||
    
    // Ошибки компилятора (внутренние)
    lowerOutput.includes("compiler error") ||
    lowerOutput.includes("internal error") ||
    lowerOutput.includes("compilation terminated") ||
    
    // Формат "error 123" или "error C1234"
    /error\s+\d+/.test(lowerOutput) ||
    /error\s+[a-z]\d+/.test(lowerOutput) ||
    
    // Ошибки линкера (ld)
    (lowerOutput.includes("ld:") && (
      lowerOutput.includes("error") ||
      lowerOutput.includes("undefined") ||
      lowerOutput.includes("cannot")
    )) ||
    
    // Ошибки objcopy
    (lowerOutput.includes("objcopy:") && lowerOutput.includes("error"))
  );
}

// Проверка: это Arduino проект?
export async function isArduinoProject(
  projectPath: string
): Promise<ArduinoProjectInfo> {
  try {
    const mainCppPath = path.join(projectPath, "src", "main.cpp");
    if (!existsSync(mainCppPath)) {
      return { isArduino: false, projectPath };
    }

    const content = await fs.readFile(mainCppPath, "utf-8");
    
    // Проверяем наличие Arduino.h (Arduino проект)
    if (content.includes("#include <Arduino.h>")) {
      return { isArduino: true, mainCppPath, projectPath };
    }
    
    // Проверяем наличие AVR заголовков (чистый AVR C++ проект для Arduino плат)
    const avrHeaders = [
      "#include <avr/io.h>",
      "#include <avr/interrupt.h>",
      "#include <avr/wdt.h>",
      "#include <avr/power.h>",
      "#include <avr/sleep.h>",
      "#include \"avr/io.h\"",
      "#include \"avr/interrupt.h\"",
    ];
    
    const hasAvrHeaders = avrHeaders.some(header => content.includes(header));
    // Также проверяем наличие функции main (характерно для AVR проектов)
    const hasMainFunction = content.includes("int main(") || content.includes("void main(");
    
    if (hasAvrHeaders && hasMainFunction) {
      return { isArduino: true, mainCppPath, projectPath };
    }

    return { isArduino: false, projectPath };
  } catch (error) {
    console.error("Ошибка проверки Arduino проекта:", error);
    return { isArduino: false, projectPath };
  }
}

// Получение конфигурации платформы (настройки компилятора)
// Используются значения по умолчанию, без зависимости от resources
export async function parsePlatformTxt(): Promise<PlatformConfig> {
  // Возвращаем значения по умолчанию согласно документации
  return {
    compilerCppCmd: "avr-g++",
    compilerCppFlags:
      "-c -g -Os -w -std=gnu++11 -ffunction-sections -fdata-sections -fno-threadsafe-statics -MMD -MP",
    compilerCCmd: "avr-gcc",
    compilerCFlags:
      "-c -g -Os -w -std=gnu11 -ffunction-sections -fdata-sections -MMD -MP",
    compilerElfFlags: "-Os -g -Wl,--gc-sections",
    objcopyCmd: "avr-objcopy",
    objcopyHexFlags: "-O ihex -R .eeprom",
  };
}

// Получение конфигурации платы
// Используются значения по умолчанию или хардкод для известных плат, без зависимости от resources
export async function parseBoardConfig(
  boardName = "uno"
): Promise<BoardConfig> {
  // Конфигурации для известных плат
  const boardConfigs: Record<string, Partial<BoardConfig>> = {
    uno: {
      mcu: "atmega328p",
      fCpu: "16000000L",
      variant: "standard",
      boardDefine: "AVR_UNO",
    },
    nano: {
      mcu: "atmega328p",
      fCpu: "16000000L",
      variant: "standard",
      boardDefine: "AVR_NANO",
    },
    mega: {
      mcu: "atmega2560",
      fCpu: "16000000L",
      variant: "mega",
      boardDefine: "AVR_MEGA",
    },
    leonardo: {
      mcu: "atmega32u4",
      fCpu: "16000000L",
      variant: "leonardo",
      boardDefine: "AVR_LEONARDO",
    },
    micro: {
      mcu: "atmega32u4",
      fCpu: "16000000L",
      variant: "micro",
      boardDefine: "AVR_MICRO",
    },
  };

  const config = boardConfigs[boardName.toLowerCase()] || {};

  // Валидация MCU - должен начинаться с atmega или attiny
  let mcu = config.mcu || "atmega328p";
  if (!mcu.match(/^(atmega|attiny)\d+/i)) {
    console.warn(
      `Некорректный MCU для платы ${boardName}: ${mcu}, используется atmega328p`
    );
    // Для таких плат как "atmegang" используем atmega168 как более подходящий
    if (boardName.toLowerCase().includes("ng")) {
      mcu = "atmega168";
    } else {
      mcu = "atmega328p";
    }
  }

  // Возвращаем конфигурацию с дефолтными значениями
  return {
    name: boardName,
    mcu,
    fCpu: config.fCpu || "16000000L",
    variant: config.variant || "standard",
    boardDefine: config.boardDefine || `AVR_${boardName.toUpperCase()}`,
  };
}

// Получение списка доступных плат
// Возвращает хардкодный список плат, без зависимости от resources
export async function getAvailableBoards(): Promise<string[]> {
  return ["uno", "nano", "mega", "leonardo", "micro"];
}

// Поиск всех файлов для компиляции
async function findCoreFiles(
  coreDir: string,
  extensions: Array<string> = [".cpp", ".c"]
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(coreDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(coreDir, entry.name);
      if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error("Ошибка поиска файлов ядра:", error);
  }

  return files;
}

// Поиск всех файлов проекта в директории src/ (рекурсивно)
async function findProjectFiles(
  srcDir: string,
  excludeMainCpp = true,
  extensions: Array<string> = [".cpp", ".c"]
): Promise<string[]> {
  const files: string[] = [];

  try {
    if (!existsSync(srcDir)) {
      return files;
    }

    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(srcDir, entry.name);
      
      if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          // Исключаем main.cpp, так как он компилируется отдельно
          if (excludeMainCpp && entry.name === "main.cpp") {
            continue;
          }
          files.push(fullPath);
        }
      } else if (entry.isDirectory()) {
        // Рекурсивно ищем файлы в поддиректориях
        const subFiles = await findProjectFiles(fullPath, false, extensions);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error("Ошибка поиска файлов проекта:", error);
  }

  return files;
}

// Основная функция компиляции
export async function compileArduinoProject(
  projectPath: string,
  boardName = "uno"
): Promise<CompileResult> {
  try {
    // 1. Проверка проекта
    const projectInfo = await isArduinoProject(projectPath);
    if (!projectInfo.isArduino || !projectInfo.mainCppPath) {
      return {
        success: false,
        error: "Проект не является Arduino проектом или main.cpp не найден",
      };
    }

    // 2. Проверяем, использует ли проект Arduino.h
    const mainCppContent = await fs.readFile(projectInfo.mainCppPath, "utf-8");
    const usesArduinoLib = mainCppContent.includes("#include <Arduino.h>");

    // 3. Загрузка конфигурации
    const platformConfig = await parsePlatformTxt();
    const boardConfig = await parseBoardConfig(boardName);

    // 4. Определение путей
    const mainCpp = projectInfo.mainCppPath;
    const buildDir = path.join(projectPath, "build");
    await fs.mkdir(buildDir, { recursive: true });

    // Используем cores и variants только из проекта (согласно документации)
    const coreDir = path.join(projectPath, "cores", "arduino");
    const variantDir = path.join(projectPath, "variants", boardConfig.variant);
    
    // Проверяем существование директории ядра (для проектов с Arduino.h)
    if (usesArduinoLib && !existsSync(coreDir)) {
      return {
        success: false,
        error: `Директория ядра Arduino не найдена в проекте: ${coreDir}\nУбедитесь, что папка cores скопирована в проект.`,
      };
    }
    
    // Проверяем существование директории варианта (для проектов с Arduino.h)
    if (usesArduinoLib && !existsSync(variantDir)) {
      return {
        success: false,
        error: `Директория варианта платы не найдена в проекте: ${variantDir}\nУбедитесь, что папка variants скопирована в проект.`,
      };
    }

    // 5. Подготовка флагов компиляции
    const warningFlags = "-w";
    const baseFlags = `-g -Os ${warningFlags} -std=gnu++11 -ffunction-sections -fdata-sections -fno-threadsafe-statics -MMD -MP`;
    
    // Для проектов с Arduino.h включаем директории ядра, для чистых AVR - только базовые флаги
    const includeFlags = usesArduinoLib 
      ? `-I"${coreDir}" -I"${variantDir}"`
      : "";
    
    // Используем boardDefine из конфигурации, или генерируем из имени платы
    const boardDefine =
      boardConfig.boardDefine || `AVR_${boardConfig.name.toUpperCase()}`;
    
    // Для проектов с Arduino.h добавляем Arduino defines, для чистых AVR - только базовые
    const defineFlags = usesArduinoLib
      ? `-mmcu=${boardConfig.mcu} -DF_CPU=${boardConfig.fCpu} -DARDUINO=10809 -DARDUINO_${boardDefine} -DARDUINO_ARCH_AVR`
      : `-mmcu=${boardConfig.mcu} -DF_CPU=${boardConfig.fCpu}`;
    
    const cxxFlags = `${baseFlags} ${includeFlags} ${defineFlags}`.replace(
      /\s+/g,
      " "
    ).trim();

    const cBaseFlags = `-g -Os ${warningFlags} -std=gnu11 -ffunction-sections -fdata-sections -MMD -MP`;
    const cFlags = `${cBaseFlags} ${includeFlags} ${defineFlags}`.replace(
      /\s+/g,
      " "
    ).trim();

    // 6. Компиляция main.cpp
    const appObj = path.join(buildDir, "app_main.o");
    console.log("Компиляция main.cpp...");
    const compileMainCmd = `${platformConfig.compilerCppCmd} ${cxxFlags} -c "${mainCpp}" -o "${appObj}"`;

    try {
      const { stderr, stdout } = await execAsync(compileMainCmd, {
        cwd: projectPath,
      });
      // Проверяем наличие ошибок в выводе (даже если команда завершилась успешно)
      const output = (stderr || stdout || "").trim();
      if (hasCompilationErrors(output)) {
        return {
          success: false,
          error: `Ошибка компиляции main.cpp:\n${output}`,
          stderr: output,
        };
      }
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string; message: string };
      // Объединяем stdout и stderr для полной информации об ошибке
      // Удаляем из message команду компиляции, если она там есть
      let fullError = err.stderr || err.stdout || err.message;
      
      // Если в сообщении есть команда компиляции, удаляем её
      if (fullError.includes("Command failed:")) {
        const lines = fullError.split("\n");
        fullError = lines
          .filter(line => !line.trim().startsWith("Command failed:"))
          .join("\n");
      }
      
      return {
        success: false,
        error: `Ошибка компиляции main.cpp: ${fullError}`,
        stderr: fullError,
      };
    }

    // 6.5. Компиляция остальных файлов проекта из src/
    const srcDir = path.join(projectPath, "src");
    const projectFiles = await findProjectFiles(srcDir, true, [".cpp", ".c"]);
    const objectFiles: string[] = [appObj];
    
    if (projectFiles.length > 0) {
      console.log(`Компиляция файлов проекта (${projectFiles.length} файлов)...`);
      const projectCompilationErrors: string[] = [];
      
      for (const file of projectFiles) {
        const ext = path.extname(file);
        const compiler =
          ext === ".cpp"
            ? platformConfig.compilerCppCmd
            : platformConfig.compilerCCmd;
        const flags = ext === ".cpp" ? cxxFlags : cFlags;
        
        // Создаем уникальное имя объектного файла на основе относительного пути от src/
        const relativePath = path.relative(srcDir, file);
        const objFileName = relativePath.replace(/[/\\]/g, "_").replace(ext, ".o");
        const objFile = path.join(buildDir, objFileName);

        const compileCmd = `${compiler} ${flags} -c "${file}" -o "${objFile}"`;

        try {
          const { stderr, stdout } = await execAsync(compileCmd, { cwd: projectPath });
          // Проверяем наличие ошибок компиляции в выводе
          const output = (stderr || stdout || "").trim();
          if (hasCompilationErrors(output)) {
            projectCompilationErrors.push(`${path.basename(file)}: ${output}`);
          } else {
            objectFiles.push(objFile);
          }
        } catch (error) {
          const err = error as Error & { stderr?: string; stdout?: string; message: string };
          const errorMsg = err.stderr || err.stdout || err.message;
          projectCompilationErrors.push(`${path.basename(file)}: ${errorMsg}`);
        }
      }
      
      // Если есть критические ошибки компиляции файлов проекта, прерываем процесс
      if (projectCompilationErrors.length > 0) {
        return {
          success: false,
          error: `Ошибки компиляции файлов проекта:\n${projectCompilationErrors.join("\n")}`,
          stderr: projectCompilationErrors.join("\n"),
        };
      }
    }

    // 7. Компиляция файлов ядра (только для проектов с Arduino.h)
    
    if (usesArduinoLib) {
      // Проверяем существование директории ядра
      if (!existsSync(coreDir)) {
        return {
          success: false,
          error: `Директория ядра Arduino не найдена: ${coreDir}`,
        };
      }
      
      console.log("Компиляция ядра Arduino...");
      const coreFiles = await findCoreFiles(coreDir);
      
      if (coreFiles.length === 0) {
        return {
          success: false,
          error: `Не найдены файлы для компиляции в директории ядра: ${coreDir}`,
        };
      }

      const coreCompilationErrors: string[] = [];
      
      for (const file of coreFiles) {
        const ext = path.extname(file);
        const compiler =
          ext === ".cpp"
            ? platformConfig.compilerCppCmd
            : platformConfig.compilerCCmd;
        const flags = ext === ".cpp" ? cxxFlags : cFlags;
        const objFile = path.join(buildDir, path.basename(file, ext) + ".o");

        const compileCmd = `${compiler} ${flags} -c "${file}" -o "${objFile}"`;

        try {
          const { stderr, stdout } = await execAsync(compileCmd, { cwd: projectPath });
          // Проверяем наличие ошибок компиляции в выводе
          const output = (stderr || stdout || "").trim();
          if (hasCompilationErrors(output)) {
            coreCompilationErrors.push(`${path.basename(file)}: ${output}`);
          } else {
            objectFiles.push(objFile);
          }
        } catch (error) {
          const err = error as Error & { stderr?: string; stdout?: string; message: string };
          const errorMsg = err.stderr || err.stdout || err.message;
          coreCompilationErrors.push(`${path.basename(file)}: ${errorMsg}`);
        }
      }
      
      // Если есть критические ошибки компиляции ядра, прерываем процесс
      if (coreCompilationErrors.length > 0) {
        return {
          success: false,
          error: `Ошибки компиляции файлов ядра Arduino:\n${coreCompilationErrors.join("\n")}`,
          stderr: coreCompilationErrors.join("\n"),
        };
      }
    } else {
      console.log("Чистый AVR проект - компиляция ядра не требуется");
    }

    // 7. Линковка
    console.log("Линковка...");
    const elfFile = path.join(buildDir, "firmware.elf");
    const ldFlags = `-Wl,--gc-sections -mmcu=${boardConfig.mcu}`;
    const objectFilesStr = objectFiles.map((f) => `"${f}"`).join(" ");
    const linkCmd = `avr-gcc ${ldFlags} -o "${elfFile}" ${objectFilesStr} -lm`;

    try {
      const { stderr, stdout } = await execAsync(linkCmd, { cwd: projectPath });
      // Проверяем наличие ошибок линковки в выводе
      const output = (stderr || stdout || "").trim();
      if (hasCompilationErrors(output)) {
        return {
          success: false,
          error: `Ошибка линковки:\n${output}`,
          stderr: output,
        };
      }
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string; message: string };
      // Объединяем stdout и stderr для полной информации об ошибке
      // Удаляем из message команду компиляции, если она там есть
      let fullError = err.stderr || err.stdout || err.message;
      
      // Если в сообщении есть команда компиляции, удаляем её
      if (fullError.includes("Command failed:")) {
        const lines = fullError.split("\n");
        fullError = lines
          .filter(line => !line.trim().startsWith("Command failed:"))
          .join("\n");
      }
      
      return {
        success: false,
        error: `Ошибка линковки: ${fullError}`,
        stderr: fullError,
      };
    }

    // 8. Генерация HEX файла
    console.log("Создание HEX файла...");
    const hexFile = path.join(buildDir, "firmware.hex");
    const objcopyCmd = `${platformConfig.objcopyCmd} ${platformConfig.objcopyHexFlags} "${elfFile}" "${hexFile}"`;

    try {
      await execAsync(objcopyCmd, { cwd: projectPath });
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string; message: string };
      // Объединяем stdout и stderr для полной информации об ошибке
      // Удаляем из message команду компиляции, если она там есть
      let fullError = err.stderr || err.stdout || err.message;
      
      // Если в сообщении есть команда компиляции, удаляем её
      if (fullError.includes("Command failed:")) {
        const lines = fullError.split("\n");
        fullError = lines
          .filter(line => !line.trim().startsWith("Command failed:"))
          .join("\n");
      }
      
      return {
        success: false,
        error: `Ошибка создания HEX файла: ${fullError}`,
        stderr: fullError,
      };
    }

    return {
      success: true,
      hexFile,
      elfFile,
      message: "Компиляция завершена успешно!",
    };
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string; message: string };
    // Объединяем stdout и stderr для полной информации об ошибке
    // Удаляем из message команду компиляции, если она там есть
    let fullError = err.stderr || err.stdout || err.message;
    
    // Если в сообщении есть команда компиляции, удаляем её
    if (fullError.includes("Command failed:")) {
      const lines = fullError.split("\n");
      fullError = lines
        .filter(line => !line.trim().startsWith("Command failed:"))
        .join("\n");
    }
    
    return {
      success: false,
      error: `Ошибка компиляции: ${fullError}`,
      stderr: fullError,
    };
  }
}

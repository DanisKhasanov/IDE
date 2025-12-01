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

// Путь к Arduino библиотеке в IDE
const getArduinoCorePath = () => {
  // В production это будет в resources/arduino-core
  // В development может быть относительный путь
  const devPath = path.join(__dirname, "../../resources/arduino-core");
  if (existsSync(devPath)) {
    return devPath;
  }
};

const ARDUINO_CORE_PATH = getArduinoCorePath();

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

// Парсинг platform.txt
export async function parsePlatformTxt(): Promise<PlatformConfig> {
  try {
    const platformTxtPath = path.join(ARDUINO_CORE_PATH, "platform.txt");
    const content = await fs.readFile(platformTxtPath, "utf-8");

    // Простой парсер для platform.txt
    const lines = content.split("\n");
    const config: Partial<PlatformConfig> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();

      switch (key.trim()) {
        case "compiler.cpp.cmd":
          config.compilerCppCmd = value;
          break;
        case "compiler.cpp.flags":
          config.compilerCppFlags = value;
          break;
        case "compiler.c.cmd":
          config.compilerCCmd = value;
          break;
        case "compiler.c.flags":
          config.compilerCFlags = value;
          break;
        case "compiler.c.elf.flags":
          config.compilerElfFlags = value;
          break;
        case "compiler.elf2hex.cmd":
          config.objcopyCmd = value;
          break;
        case "compiler.elf2hex.flags":
          config.objcopyHexFlags = value;
          break;
      }
    }

    // Значения по умолчанию
    return {
      compilerCppCmd: config.compilerCppCmd || "avr-g++",
      compilerCppFlags: config.compilerCppFlags || "-c -g -Os -w -std=gnu++11",
      compilerCCmd: config.compilerCCmd || "avr-gcc",
      compilerCFlags: config.compilerCFlags || "-c -g -Os -w -std=gnu11",
      compilerElfFlags: config.compilerElfFlags || "-Os -g -Wl,--gc-sections",
      objcopyCmd: config.objcopyCmd || "avr-objcopy",
      objcopyHexFlags: config.objcopyHexFlags || "-O ihex -R .eeprom",
    };
  } catch (error) {
    console.error("Ошибка парсинга platform.txt:", error);
    // Возвращаем значения по умолчанию
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
}

// Парсинг boards.txt для получения конфигурации платы
export async function parseBoardConfig(
  boardName = "uno"
): Promise<BoardConfig> {
  try {
    const boardsTxtPath = path.join(ARDUINO_CORE_PATH, "boards.txt");
    const content = await fs.readFile(boardsTxtPath, "utf-8");

    const lines = content.split("\n");
    const config: Partial<BoardConfig> = { name: boardName };

    let inBoardSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      if (trimmed.startsWith(`${boardName}.`)) {
        inBoardSection = true;
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim();
        const property = key.trim().replace(`${boardName}.`, "");

        switch (property) {
          case "build.mcu":
            config.mcu = value;
            break;
          case "build.f_cpu":
            config.fCpu = value;
            break;
          case "build.variant":
            config.variant = value;
            break;
          case "build.board":
            config.boardDefine = value;
            break;
        }
      } else if (inBoardSection && !trimmed.startsWith(`${boardName}.`)) {
        // Выходим из секции платы
        break;
      }
    }

    // Валидация MCU - должен начинаться с atmega или attiny
    // Если MCU неправильный (например "atmegang"), используем значения по умолчанию
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

    // Значения по умолчанию для Arduino UNO
    return {
      name: boardName,
      mcu,
      fCpu: config.fCpu || "16000000L",
      variant: config.variant || "standard",
      boardDefine: config.boardDefine || `AVR_${boardName.toUpperCase()}`,
    };
  } catch (error) {
    console.error("Ошибка парсинга boards.txt:", error);
    return {
      name: boardName,
      mcu: "atmega328p",
      fCpu: "16000000L",
      variant: "standard",
      boardDefine: `AVR_${boardName.toUpperCase()}`,
    };
  }
}

// Получение списка доступных плат
export async function getAvailableBoards(): Promise<string[]> {
  try {
    const boardsTxtPath = path.join(ARDUINO_CORE_PATH, "boards.txt");
    const content = await fs.readFile(boardsTxtPath, "utf-8");

    const lines = content.split("\n");
    const boards = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      // Ищем строки вида "board.name=Board Name"
      const match = trimmed.match(/^([^.]+)\.name=/);
      if (match) {
        boards.add(match[1]);
      }
    }

    return Array.from(boards).sort();
  } catch (error) {
    console.error("Ошибка получения списка плат:", error);
    return ["uno", "nano", "mega", "leonardo"];
  }
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

    const coreDir = path.join(ARDUINO_CORE_PATH, "cores", "arduino");
    const variantDir = path.join(
      ARDUINO_CORE_PATH,
      "variants",
      boardConfig.variant
    );

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
      const { stderr } = await execAsync(compileMainCmd, {
        cwd: projectPath,
      });
      if (stderr && !stderr.includes("warning")) {
        return {
          success: false,
          error: `Ошибка компиляции main.cpp: ${stderr}`,
          stderr,
        };
      }
    } catch (error) {
      const err = error as Error & { stderr?: string; message: string };
      return {
        success: false,
        error: `Ошибка компиляции main.cpp: ${err.message}`,
        stderr: err.stderr || err.message,
      };
    }

    // 7. Компиляция файлов ядра (только для проектов с Arduino.h)
    const objectFiles: string[] = [appObj];
    
    if (usesArduinoLib) {
      console.log("Компиляция ядра Arduino...");
      const coreFiles = await findCoreFiles(coreDir);

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
          await execAsync(compileCmd, { cwd: projectPath });
          objectFiles.push(objFile);
        } catch (error) {
          // Пропускаем ошибки компиляции отдельных файлов (может быть устаревший файл)
          const err = error as Error;
          console.warn(`Предупреждение при компиляции ${file}:`, err.message);
        }
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
      const { stderr } = await execAsync(linkCmd, { cwd: projectPath });
      if (stderr && !stderr.includes("warning")) {
        return {
          success: false,
          error: `Ошибка линковки: ${stderr}`,
          stderr,
        };
      }
    } catch (error) {
      const err = error as Error & { stderr?: string; message: string };
      return {
        success: false,
        error: `Ошибка линковки: ${err.message}`,
        stderr: err.stderr || err.message,
      };
    }

    // 8. Генерация HEX файла
    console.log("Создание HEX файла...");
    const hexFile = path.join(buildDir, "firmware.hex");
    const objcopyCmd = `${platformConfig.objcopyCmd} ${platformConfig.objcopyHexFlags} "${elfFile}" "${hexFile}"`;

    try {
      await execAsync(objcopyCmd, { cwd: projectPath });
    } catch (error) {
      const err = error as Error & { stderr?: string; message: string };
      return {
        success: false,
        error: `Ошибка создания HEX файла: ${err.message}`,
        stderr: err.stderr || err.message,
      };
    }

    return {
      success: true,
      hexFile,
      elfFile,
      message: "Компиляция завершена успешно!",
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: `Ошибка компиляции: ${err.message}`,
      stderr: err.message,
    };
  }
}

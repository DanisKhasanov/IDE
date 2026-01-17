import fs from "fs/promises";
import path from "node:path";
import { existsSync } from "fs";
import type { GeneratedCode } from "./CodeGenUtils";

/**
 * Обновляет секцию между маркерами в файле
 */
function updateMarkedSection(
  content: string,
  startMarker: string,
  endMarker: string,
  newContent: string
): string {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  // Если маркеры не найдены, добавляем их
  if (startIndex === -1 || endIndex === -1) {
    // Пытаемся вставить после определенных мест
    if (content.includes("// АВТО-ГЕНЕРАЦИЯ")) {
      // Если есть другие маркеры, вставляем в конец файла
      return `${content}\n\n${startMarker}\n${newContent}\n${endMarker}\n`;
    }
    // Иначе добавляем в конец
    return `${content}\n\n${startMarker}\n${newContent}\n${endMarker}\n`;
  }

  // Заменяем секцию между маркерами
  const before = content.substring(0, startIndex + startMarker.length);
  const after = content.substring(endIndex);

  return `${before}\n${newContent}\n${after}`;
}

/**
 * Обновляет pins_init.h с сохранением пользовательского кода
 */
export async function updatePinsInitHeader(
  filePath: string,
  generatedCode: GeneratedCode
): Promise<void> {
  let content = "";

  if (existsSync(filePath)) {
    content = await fs.readFile(filePath, "utf-8");
  } else {
    // Создаем базовую структуру
    content = `#ifndef PINS_INIT_H
#define PINS_INIT_H

// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ
// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ

// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ОБЪЯВЛЕНИЙ
// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ОБЪЯВЛЕНИЙ

#endif // PINS_INIT_H
`;
  }

  // Обновляем includes
  const includesContent = Array.from(generatedCode.includes)
    .map((inc) => `#include ${inc}`)
    .join("\n");

  content = updateMarkedSection(
    content,
    "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ",
    "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ",
    includesContent
  );

  // Обновляем объявления
  content = updateMarkedSection(
    content,
    "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ОБЪЯВЛЕНИЙ",
    "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ОБЪЯВЛЕНИЙ",
    "void pins_init_all(void);"
  );

  // Убеждаемся, что есть guard'ы
  if (!content.includes("#ifndef PINS_INIT_H")) {
    content = `#ifndef PINS_INIT_H
#define PINS_INIT_H

${content}

#endif // PINS_INIT_H
`;
  }

  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Обновляет pins_init.cpp с сохранением пользовательского кода
 */
export async function updatePinsInitImplementation(
  filePath: string,
  generatedCode: GeneratedCode
): Promise<void> {
  let content = "";

  if (existsSync(filePath)) {
    content = await fs.readFile(filePath, "utf-8");
  } else {
    // Создаем базовую структуру
    content = `// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ
// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ

// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ФУНКЦИИ_PINS_INIT
// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ФУНКЦИИ_PINS_INIT

`;
  }

  // Извлекаем тело функции и ISR из сгенерированного кода
  const generatedImpl = generatedCode.implementation;

  // Парсим includes
  const includesStart = generatedImpl.indexOf("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ");
  const includesEnd = generatedImpl.indexOf("// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ");
  let includesContent = "";
  if (includesStart !== -1 && includesEnd !== -1) {
    includesContent = generatedImpl
      .substring(includesStart + "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ".length, includesEnd)
      .trim();
  }

  // Парсим тело функции pins_init_all
  const functionStart = generatedImpl.indexOf("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ФУНКЦИИ_PINS_INIT");
  const functionEnd = generatedImpl.indexOf("// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ФУНКЦИИ_PINS_INIT");
  let functionContent = "";
  if (functionStart !== -1 && functionEnd !== -1) {
    functionContent = generatedImpl
      .substring(
        functionStart + "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ФУНКЦИИ_PINS_INIT".length,
        functionEnd
      )
      .trim();
  }

  // Парсим ISR (если есть)
  const isrStart = generatedImpl.indexOf("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ISR");
  const isrEnd = generatedImpl.indexOf("// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ISR");
  let isrContent = "";
  if (isrStart !== -1 && isrEnd !== -1) {
    isrContent = generatedImpl
      .substring(isrStart + "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ISR".length, isrEnd)
      .trim();
  }

  // Обновляем includes
  if (includesContent) {
    content = updateMarkedSection(
      content,
      "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ",
      "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ",
      includesContent
    );
  }

  // Обновляем функцию
  if (functionContent) {
    content = updateMarkedSection(
      content,
      "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ФУНКЦИИ_PINS_INIT",
      "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ФУНКЦИИ_PINS_INIT",
      functionContent
    );
  }

  // Обновляем ISR (если есть)
  if (isrContent) {
    // Если секции ISR нет, добавляем её после функции
    if (!content.includes("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ISR")) {
      content = `${content}\n\n// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ISR\n// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ISR\n`;
    }
    content = updateMarkedSection(
      content,
      "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ISR",
      "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ISR",
      isrContent
    );
  } else {
    // Если ISR нет в сгенерированном коде, но есть в файле - удаляем секцию
    if (content.includes("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ISR")) {
      const isrStartIdx = content.indexOf("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ISR");
      const isrEndIdx = content.indexOf("// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ISR");
      if (isrEndIdx !== -1) {
        const beforeIsr = content.substring(0, isrStartIdx).trimEnd();
        const afterIsr = content.substring(isrEndIdx + "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ISR".length).trimStart();
        content = `${beforeIsr}${afterIsr ? "\n\n" + afterIsr : ""}`;
      }
    }
  }

  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Обновляет main.cpp с сохранением пользовательского кода
 */
export async function updateMainCpp(
  filePath: string,
  generatedIncludes: string[]
): Promise<void> {
  let content = "";

  if (existsSync(filePath)) {
    content = await fs.readFile(filePath, "utf-8");
  } else {
    // Создаем базовый шаблон
    content = `// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ
// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ

void setup() {
  // АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНИТ_ПИНОВ
  // АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНИТ_ПИНОВ
  
}

void loop() {
  
}
`;
  }

  // Обновляем includes
  const includesContent = Array.from(generatedIncludes)
    .filter((inc) => {
      // Исключаем <Arduino.h>, если он уже есть вне маркеров
      if (inc === "<Arduino.h>") {
        return !content.includes("#include <Arduino.h>");
      }
      return true;
    })
    .map((inc) => `#include ${inc}`)
    .join("\n");

  // Если секции includes нет, добавляем её в начало
  if (!content.includes("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ")) {
    content = `// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ
// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ

${content}`;
  }

  content = updateMarkedSection(
    content,
    "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ",
    "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ",
    includesContent
  );

  // Убеждаемся, что есть pins_init.h в includes
  if (!content.includes(`#include "pins_init.h"`)) {
    // Добавляем pins_init.h в секцию includes
    const includesMarkerStart = content.indexOf("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ");
    const includesMarkerEnd = content.indexOf("// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ");
    if (includesMarkerStart !== -1 && includesMarkerEnd !== -1) {
      const includesSection = content.substring(
        includesMarkerStart + "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ".length,
        includesMarkerEnd
      );
      if (!includesSection.includes(`pins_init.h`)) {
        const updatedIncludes = `${includesSection.trim()}\n#include "pins_init.h"`;
        content = updateMarkedSection(
          content,
          "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНКЛУДОВ",
          "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ",
          updatedIncludes.trim()
        );
      }
    }
  }

  // Обновляем вызов pins_init_all() в setup()
  if (!content.includes("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНИТ_ПИНОВ")) {
    // Если секции нет, добавляем её в setup()
    const setupMatch = content.match(/void setup\(\)\s*\{([^}]*)\}/s);
    if (setupMatch) {
      const setupBody = setupMatch[1];
      const newSetupBody = `\n  // АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНИТ_ПИНОВ\n  pins_init_all();\n  // АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНИТ_ПИНОВ${setupBody}`;
      content = content.replace(setupMatch[0], `void setup() {${newSetupBody}\n}`);
    } else {
      // Если setup() не найден, создаем его
      if (!content.includes("void setup()")) {
        const includesEnd = content.indexOf("// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ");
        if (includesEnd !== -1) {
          const afterIncludes = content.substring(includesEnd + "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ".length);
          content = `${content.substring(0, includesEnd + "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНКЛУДОВ".length)}\n\nvoid setup() {\n  // АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНИТ_ПИНОВ\n  pins_init_all();\n  // АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНИТ_ПИНОВ\n\n}\n\nvoid loop() {\n\n}\n${afterIncludes}`;
        }
      }
    }
  } else {
    // Обновляем секцию, если она существует
    const pinsInitStart = content.indexOf("// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНИТ_ПИНОВ");
    const pinsInitEnd = content.indexOf("// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНИТ_ПИНОВ");
    if (pinsInitStart !== -1 && pinsInitEnd !== -1) {
      // Проверяем, есть ли вызов pins_init_all()
      const pinsInitSection = content.substring(
        pinsInitStart + "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНИТ_ПИНОВ".length,
        pinsInitEnd
      );
      if (!pinsInitSection.includes("pins_init_all()")) {
        content = updateMarkedSection(
          content,
          "// АВТО-ГЕНЕРАЦИЯ: НАЧАЛО_ИНИТ_ПИНОВ",
          "// АВТО-ГЕНЕРАЦИЯ: КОНЕЦ_ИНИТ_ПИНОВ",
          "pins_init_all();"
        );
      }
    }
  }

  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Главная функция для регенерации файлов с сохранением пользовательского кода
 */
export async function regenerateProjectFiles(
  projectPath: string,
  generatedCode: GeneratedCode
): Promise<void> {
  const srcPath = path.join(projectPath, "src");
  await fs.mkdir(srcPath, { recursive: true });

  const pinsInitHeaderPath = path.join(srcPath, "pins_init.h");
  const pinsInitCppPath = path.join(srcPath, "pins_init.cpp");
  const mainCppPath = path.join(srcPath, "main.cpp");

  // Обновляем pins_init.h
  await updatePinsInitHeader(pinsInitHeaderPath, generatedCode);

  // Обновляем pins_init.cpp
  await updatePinsInitImplementation(pinsInitCppPath, generatedCode);

  // Обновляем main.cpp
  await updateMainCpp(mainCppPath, generatedCode.includes);

  console.log(`Регенерированы файлы проекта с сохранением пользовательского кода: ${projectPath}`);
}

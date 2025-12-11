import type { CompilationProblem } from "@/components/terminal/ProblemsTab";

/**
 * Парсит ошибки компиляции из stderr
 * Поддерживает форматы:
 * - file:line:column: error: message
 * - file:line:column: warning: message
 * - file:line: error: message
 * - file:line: message (ошибки линковки)
 * - error: message
 * - warning: message
 * - undefined reference to (ошибки линковки)
 */
export function parseCompilationErrors(
  stderr: string | undefined
): CompilationProblem[] {
  if (!stderr) {
    return [];
  }

  const problems: CompilationProblem[] = [];
  const lines = stderr.split("\n");
  
  // Удаляем строки с командами компиляции (начинаются с "Command failed:" или содержат полный путь к компилятору)
  // Но сохраняем строки, которые могут содержать ошибки линковки (содержат "undefined reference" или "ld:")
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    // Пропускаем строки с командами
    if (trimmed.startsWith("Command failed:")) return false;
    if (trimmed.match(/^avr-gcc\s|^avr-g\+\+\s|^avr-objcopy\s/)) return false;
    
    // Сохраняем все остальные строки (включая ошибки линковки)
    return true;
  });

  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Паттерн для ошибок вида: file:line:column: error: message
    // или file:line:column: warning: message
    const detailedPattern =
      /^(.+?):(\d+)(?::(\d+))?:\s*(error|warning):\s*(.+)$/i;
    const match = trimmed.match(detailedPattern);

    if (match) {
      const [, file, lineStr, columnStr, type, message] = match;
      problems.push({
        type: type.toLowerCase() as "error" | "warning",
        file: file.trim(),
        line: parseInt(lineStr, 10),
        column: columnStr ? parseInt(columnStr, 10) : undefined,
        message: message.trim(),
        raw: trimmed,
      });
      continue;
    }

    // Паттерн для ошибок вида: file:line: error: message
    const simplePattern = /^(.+?):(\d+):\s*(error|warning):\s*(.+)$/i;
    const simpleMatch = trimmed.match(simplePattern);

    if (simpleMatch) {
      const [, file, lineStr, type, message] = simpleMatch;
      problems.push({
        type: type.toLowerCase() as "error" | "warning",
        file: file.trim(),
        line: parseInt(lineStr, 10),
        message: message.trim(),
        raw: trimmed,
      });
      continue;
    }

    // Паттерн для простых ошибок: error: message или warning: message
    const basicPattern = /^(error|warning):\s*(.+)$/i;
    const basicMatch = trimmed.match(basicPattern);

    if (basicMatch) {
      const [, type, message] = basicMatch;
      problems.push({
        type: type.toLowerCase() as "error" | "warning",
        message: message.trim(),
        raw: trimmed,
      });
      continue;
    }

    // Паттерн для ошибок линковки вида: file:line: message
    // Например: /home/danis/2/src/main.cpp:6:(.text.setup+0x0): undefined reference to `_Z13pins_init_allv'
    // Или: /usr/lib/gcc/avr/14.2.0/../../../avr/bin/ld: /home/danis/2/build/app_main.o: в функции «setup»: /home/danis/2/src/main.cpp:6:(.text.setup+0x0): undefined reference to `_Z13pins_init_allv'
    const linkerErrorPattern = /(?:^|\s)([^:]+\.(cpp|c|h|hpp)):(\d+):[^:]*:\s*(.+)$/;
    const linkerMatch = trimmed.match(linkerErrorPattern);
    
    if (linkerMatch) {
      const [, file, , lineStr, message] = linkerMatch;
      // Проверяем, что это исходный файл (не .o файл)
      if (file && !file.endsWith('.o') && message) {
        problems.push({
          type: "error",
          file: file.trim(),
          line: parseInt(lineStr, 10),
          message: message.trim(),
          raw: trimmed,
        });
        continue;
      }
    }
    
    // Альтернативный паттерн для ошибок линковки с путем к исходному файлу в середине строки
    // Например: .../app_main.o: в функции «setup»: /home/danis/2/src/main.cpp:6:(.text.setup+0x0): undefined reference
    const linkerErrorPattern2 = /([^:]+\.(cpp|c|h|hpp)):(\d+):[^:]*undefined reference/;
    const linkerMatch2 = trimmed.match(linkerErrorPattern2);
    
    if (linkerMatch2) {
      const [, file, , lineStr] = linkerMatch2;
      if (file && !file.endsWith('.o')) {
        problems.push({
          type: "error",
          file: file.trim(),
          line: parseInt(lineStr, 10),
          message: trimmed.includes("undefined reference") 
            ? trimmed.substring(trimmed.indexOf("undefined reference"))
            : trimmed,
          raw: trimmed,
        });
        continue;
      }
    }

    // Паттерн для ошибок линковки с undefined reference
    // Например: undefined reference to `_Z13pins_init_allv'
    if (trimmed.includes("undefined reference")) {
      // Пытаемся найти файл и строку из предыдущих строк
      let file: string | undefined;
      let lineNumber: number | undefined;
      
      // Ищем предыдущую строку с информацией о файле
      if (i > 0) {
        const prevLine = filteredLines[i - 1].trim();
        const fileLineMatch = prevLine.match(/^(.+?):(\d+):/);
        if (fileLineMatch) {
          file = fileLineMatch[1].trim();
          lineNumber = parseInt(fileLineMatch[2], 10);
        }
      }
      
      problems.push({
        type: "error",
        file,
        line: lineNumber,
        message: trimmed,
        raw: trimmed,
      });
      continue;
    }

    // Если строка содержит "error" или "warning", но не соответствует паттернам,
    // добавляем как общую ошибку
    if (
      trimmed.toLowerCase().includes("error") ||
      trimmed.toLowerCase().includes("warning")
    ) {
      const isError = trimmed.toLowerCase().includes("error");
      problems.push({
        type: isError ? "error" : "warning",
        message: trimmed,
        raw: trimmed,
      });
    }
  }

  return problems;
}


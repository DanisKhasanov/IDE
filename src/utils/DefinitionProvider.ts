/**
 * Утилита для поиска определений функций в C/C++ коде
 */

export interface DefinitionLocation {
  uri: string; // Путь к файлу
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface FunctionDefinition {
  name: string;
  location: DefinitionLocation;
  signature?: string; // Сигнатура функции для отображения
}

/**
 * Парсит C/C++ код и находит определения функций
 */
export function findFunctionDefinitions(
  content: string,
  filePath: string
): FunctionDefinition[] {
  const definitions: FunctionDefinition[] = [];
  const lines = content.split("\n");

  // Ключевые слова, которые не являются именами функций
  const keywords = new Set([
    "if",
    "while",
    "for",
    "switch",
    "catch",
    "else",
    "do",
    "try",
    "return",
    "break",
    "continue",
  ]);

  // Регулярное выражение для поиска определений функций
  // Поддерживает различные форматы:
  // - void function() { ... }
  // - int function() { ... }
  // - void function(int param) { ... }
  // - static void function() { ... }
  // - inline void function() { ... }
  // - void Class::function() { ... }
  // - int* function() { ... }
  // - void function() const { ... }
  const functionPattern =
    /^\s*(?:(?:static|inline|extern|virtual)\s+)?(?:\w+(?:\s*\*|\s*&)?\s+)*(?:(\w+)::)?(\w+)\s*\([^)]*\)\s*(?:const\s*)?\{/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(functionPattern);

    if (match) {
      // match[1] - имя класса (если есть), match[2] - имя функции
      const functionName = match[2];

      if (!functionName || keywords.has(functionName)) {
        continue;
      }

      // Находим позицию имени функции в строке
      let startColumn = line.indexOf(functionName);
      
      // Если имя функции не найдено в текущей строке (многострочное определение),
      // ищем в предыдущих строках
      if (startColumn === -1) {
        // Объединяем предыдущие строки для поиска
        let combinedLines = line;
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          combinedLines = lines[j] + " " + combinedLines;
          const nameIndex = combinedLines.indexOf(functionName);
          if (nameIndex !== -1) {
            // Вычисляем позицию в исходной строке
            let charCount = 0;
            for (let k = j; k <= i; k++) {
              if (k === i) {
                startColumn = nameIndex - charCount;
                break;
              }
              charCount += lines[k].length + 1; // +1 для пробела между строками
            }
            break;
          }
        }
      }

      if (startColumn !== -1) {
        const endColumn = startColumn + functionName.length;
        definitions.push({
          name: functionName,
          location: {
            uri: filePath,
            range: {
              startLineNumber: i + 1, // Monaco использует 1-based индексы
              startColumn: startColumn + 1,
              endLineNumber: i + 1,
              endColumn: endColumn + 1,
            },
          },
          signature: line.trim(),
        });
      }
    }
  }

  return definitions;
}

/**
 * Находит определение функции по имени в списке файлов
 */
export async function findDefinition(
  functionName: string,
  files: Array<{ path: string; content: string }>,
  currentFilePath?: string
): Promise<DefinitionLocation | null> {
  // Сначала ищем в текущем файле
  if (currentFilePath) {
    const currentFile = files.find((f) => f.path === currentFilePath);
    if (currentFile) {
      const definitions = findFunctionDefinitions(
        currentFile.content,
        currentFilePath
      );
      const definition = definitions.find((d) => d.name === functionName);
      if (definition) {
        return definition.location;
      }
    }
  }

  // Затем ищем в других файлах
  for (const file of files) {
    if (file.path === currentFilePath) {
      continue; // Уже проверили
    }

    const definitions = findFunctionDefinitions(file.content, file.path);
    const definition = definitions.find((d) => d.name === functionName);
    if (definition) {
      return definition.location;
    }
  }

  return null;
}

/**
 * Извлекает имя функции из позиции курсора в коде
 */
export function extractFunctionNameAtPosition(
  content: string,
  lineNumber: number,
  column: number
): string | null {
  const lines = content.split("\n");
  const line = lines[lineNumber - 1]; // lineNumber 1-based

  if (!line) {
    return null;
  }

  // Ищем слово под курсором
  const beforeCursor = line.substring(0, column - 1);
  const afterCursor = line.substring(column - 1);

  // Извлекаем идентификатор перед курсором
  const beforeMatch = beforeCursor.match(/(\w+)$/);
  const afterMatch = afterCursor.match(/^(\w*)/);

  if (beforeMatch) {
    const name = beforeMatch[1] + (afterMatch ? afterMatch[1] : "");
    // Проверяем, что это не ключевое слово
    const keywords = [
      "if",
      "else",
      "while",
      "for",
      "switch",
      "case",
      "return",
      "void",
      "int",
      "char",
      "float",
      "double",
      "bool",
      "const",
      "static",
      "extern",
      "inline",
      "class",
      "struct",
      "enum",
      "typedef",
      "namespace",
      "using",
      "public",
      "private",
      "protected",
      "virtual",
      "override",
      "final",
    ];
    if (!keywords.includes(name)) {
      return name;
    }
  }

  return null;
}


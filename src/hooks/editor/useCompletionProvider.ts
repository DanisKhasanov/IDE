import { useEffect, useRef } from "react";
import type * as monaco from "monaco-editor";
import { findFunctionDefinitions } from "@utils/editor/DefinitionProvider";

type Monaco = typeof import("monaco-editor");

interface UseCompletionProviderOptions {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  monaco: Monaco | null;
  isEditorReady: boolean;
  getProjectFiles: () => Array<{ path: string; content: string }>;
}

/**
 * Хук для регистрации провайдера автодополнения для C/C++
 */
export function useCompletionProvider({
  editor,
  monaco,
  isEditorReady,
  getProjectFiles,
}: UseCompletionProviderOptions) {
  const disposablesRef = useRef<monaco.IDisposable[]>([]);

  useEffect(() => {
    if (!isEditorReady || !editor || !monaco) {
      return;
    }

    // Проверяем, что редактор еще существует и не уничтожен
    try {
      const model = editor.getModel();
      if (!model) {
        return;
      }
      // Проверяем, что редактор не уничтожен, пытаясь получить его layout
      editor.getLayoutInfo();
    } catch {
      return;
    }

    const languages = ["c", "cpp"];

    const disposables = languages.map((language) => {
      return monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: (
          model: monaco.editor.ITextModel,
          position: monaco.Position
        ) => {
          // Проверяем, что модель не уничтожена
          if (model.isDisposed()) {
            return { suggestions: [] };
          }

          try {
            // Получаем текст строки до курсора
            const lineContent = model.getLineContent(position.lineNumber);
            const textUntilPosition = lineContent.substring(
              0,
              position.column - 1
            );

            // Находим слово, которое пользователь начал вводить
            const wordMatch = textUntilPosition.match(/(\w*)$/);
            const wordStart = wordMatch
              ? position.column - wordMatch[1].length
              : position.column;
            const word = wordMatch ? wordMatch[1] : "";

            // Создаем диапазон для замены
            const wordRange: monaco.IRange = {
              startLineNumber: position.lineNumber,
              startColumn: wordStart,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            };

            const projectFiles = getProjectFiles();

            // Собираем все функции из всех файлов проекта
            const allFunctions = new Map<
              string,
              monaco.languages.CompletionItem
            >();
            let totalDefinitions = 0;

            projectFiles.forEach((file) => {
              const definitions = findFunctionDefinitions(
                file.content,
                file.path
              );
              totalDefinitions += definitions.length;

              definitions.forEach((def) => {
                // Фильтруем по введенному тексту (если есть)
                if (
                  word &&
                  !def.name.toLowerCase().startsWith(word.toLowerCase())
                ) {
                  return;
                }

                // Используем имя функции как ключ, чтобы избежать дубликатов
                if (!allFunctions.has(def.name)) {
                  const completionItem: monaco.languages.CompletionItem = {
                    label: def.name,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: def.name,
                    detail: def.signature || `Функция из ${file.path}`,
                    documentation: def.signature
                      ? `Определение: ${def.signature}`
                      : undefined,
                    range: wordRange,
                    sortText: `0_${def.name}`, // Приоритет для функций проекта
                  };
                  allFunctions.set(def.name, completionItem);
                }
              });
            });

            // Также добавляем стандартные ключевые слова C/C++
            const keywords = [
              "if",
              "else",
              "while",
              "for",
              "switch",
              "case",
              "break",
              "continue",
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
              "true",
              "false",
              "nullptr",
              "NULL",
              "sizeof",
              "new",
              "delete",
              "this",
              "auto",
              "volatile",
              "mutable",
              "explicit",
              "operator",
              "template",
              "typename",
              "try",
              "catch",
              "throw",
            ];

            keywords.forEach((keyword) => {
              // Фильтруем по введенному тексту (если есть)
              if (
                word &&
                !keyword.toLowerCase().startsWith(word.toLowerCase())
              ) {
                return;
              }

              if (!allFunctions.has(keyword)) {
                const completionItem: monaco.languages.CompletionItem = {
                  label: keyword,
                  kind: monaco.languages.CompletionItemKind.Keyword,
                  insertText: keyword,
                  range: wordRange,
                  sortText: `1_${keyword}`, // Меньший приоритет для ключевых слов
                };
                allFunctions.set(keyword, completionItem);
              }
            });

            const suggestions = Array.from(allFunctions.values());

            return {
              suggestions,
              incomplete: false, // Указываем, что список полный
            };
          } catch (error) {
            return { suggestions: [] };
          }
        },
        triggerCharacters: [".", "->", "::"],
      });
    });

    disposablesRef.current = disposables;

    return () => {
      disposables.forEach((disposable) => {
        try {
          disposable.dispose();
        } catch {
          // Игнорируем ошибки при очистке
        }
      });
      disposablesRef.current = [];
    };
  }, [isEditorReady, editor, monaco, getProjectFiles]);
}

import { useEffect, useRef, useCallback } from "react";
import type * as monaco from "monaco-editor";
import {
  findDefinition,
  extractFunctionNameAtPosition,
} from "@utils/editor/DefinitionProvider";

type Monaco = typeof import("monaco-editor");

interface UseGoToDefinitionOptions {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  monaco: Monaco | null;
  isEditorReady: boolean;
  getProjectFiles: () => Array<{ path: string; content: string }>;
  onOpenFile: (filePath: string) => Promise<void>;
}

/**
 * Хук для реализации функциональности "Go to Definition" (F12, Ctrl+Click)
 */
export function useGoToDefinition({
  editor,
  monaco,
  isEditorReady,
  getProjectFiles,
  onOpenFile,
}: UseGoToDefinitionOptions) {
  const isCommandInvocationRef = useRef(false);
  const commandDisposablesRef = useRef<monaco.IDisposable[]>([]);
  const mouseHandlersRef = useRef<monaco.IDisposable[]>([]);

  const navigateToDefinition = useCallback(
    async (
      currentEditor: monaco.editor.IStandaloneCodeEditor,
      currentMonaco: Monaco,
      position: monaco.Position,
      model: monaco.editor.ITextModel
    ) => {
      // Проверяем, что модель не уничтожена
      if (model.isDisposed()) {
        return;
      }

      const functionName = extractFunctionNameAtPosition(
        model.getValue(),
        position.lineNumber,
        position.column
      );

      if (!functionName) {
        return;
      }

      const projectFiles = getProjectFiles();
      const currentFilePath = model.uri.fsPath || model.uri.path;

      const definition = await findDefinition(
        functionName,
        projectFiles,
        currentFilePath
      );

      if (!definition) {
        return;
      }

      // Если определение в другом файле, открываем его
      if (definition.uri !== currentFilePath) {
        await onOpenFile(definition.uri);
        // Ждем немного, чтобы файл успел открыться
        setTimeout(() => {
          if (!editor || !monaco) {
            return;
          }
          
          // Проверяем, что редактор не уничтожен
          try {
            editor.getLayoutInfo();
          } catch {
            return;
          }
          
          const targetModel = monaco.editor
            .getModels()
            .find((m) => {
              if (m.isDisposed()) {
                return false;
              }
              const modelPath = m.uri.fsPath || m.uri.path;
              return modelPath === definition.uri;
            });
          if (targetModel && editor) {
            try {
              editor.setModel(targetModel);
              editor.setPosition({
                lineNumber: definition.range.startLineNumber,
                column: definition.range.startColumn,
              });
              editor.revealLineInCenter(definition.range.startLineNumber);
            } catch (error) {
              console.warn("Ошибка перехода к определению:", error);
            }
          }
        }, 200);
      } else {
        // Определение в том же файле
        try {
          // Проверяем, что редактор не уничтожен
          currentEditor.getLayoutInfo();
          currentEditor.setPosition({
            lineNumber: definition.range.startLineNumber,
            column: definition.range.startColumn,
          });
          currentEditor.revealLineInCenter(definition.range.startLineNumber);
        } catch (error) {
          console.warn("Ошибка перехода к определению:", error);
        }
      }
    },
    [editor, monaco, getProjectFiles, onOpenFile]
  );

  // Регистрация команд F12 и Ctrl+F12
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

    const goToDefinition = async () => {
      if (!editor || !monaco) {
        return;
      }

      try {
        const model = editor.getModel();
        if (!model) {
          return;
        }
        // Проверяем, что редактор не уничтожен
        editor.getLayoutInfo();
      } catch {
        return;
      }

      const position = editor.getPosition();
      const model = editor.getModel();
      if (!position || !model || model.isDisposed()) {
        return;
      }

      isCommandInvocationRef.current = true;
      try {
        await navigateToDefinition(editor, monaco, position, model);
      } finally {
        setTimeout(() => {
          isCommandInvocationRef.current = false;
        }, 100);
      }
    };

    // Обработка F12
    const f12Disposable = editor.addCommand(
      monaco.KeyCode.F12,
      goToDefinition
    );

    // Обработка Ctrl+F12 (или Cmd+F12 на Mac)
    const ctrlF12Disposable = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.F12,
      goToDefinition
    );

    // addCommand может возвращать IDisposable или string, проверяем тип
    if (f12Disposable && typeof f12Disposable !== 'string') {
      commandDisposablesRef.current.push(f12Disposable as monaco.IDisposable);
    }
    if (ctrlF12Disposable && typeof ctrlF12Disposable !== 'string') {
      commandDisposablesRef.current.push(ctrlF12Disposable as monaco.IDisposable);
    }

    return () => {
      commandDisposablesRef.current.forEach((disposable) => {
        try {
          disposable.dispose();
        } catch {
          // Игнорируем ошибки при очистке
        }
      });
      commandDisposablesRef.current = [];
    };
  }, [isEditorReady, editor, monaco, navigateToDefinition]);

  // Регистрация провайдера определений для Monaco
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
      return monaco.languages.registerDefinitionProvider(language, {
        provideDefinition: async (
          model: monaco.editor.ITextModel,
          position: monaco.Position
        ) => {
          // Если провайдер вызван не из команды (например, при наведении), возвращаем пустой массив
          if (!isCommandInvocationRef.current) {
            return [];
          }

          // Проверяем, что модель не уничтожена
          if (model.isDisposed()) {
            return [];
          }

          try {
            const functionName = extractFunctionNameAtPosition(
              model.getValue(),
              position.lineNumber,
              position.column
            );

            if (!functionName) {
              return [];
            }

            const projectFiles = getProjectFiles();
            const currentFilePath = model.uri.fsPath || model.uri.path;

            const definition = await findDefinition(
              functionName,
              projectFiles,
              currentFilePath
            );

            if (!definition) {
              return [];
            }

            const uri = monaco.Uri.file(definition.uri);

            // Если определение в другом файле, открываем его
            if (definition.uri !== currentFilePath) {
              onOpenFile(definition.uri).then(() => {
                setTimeout(() => {
                  if (!editor || !monaco) {
                    return;
                  }
                  
                  // Проверяем, что редактор не уничтожен
                  try {
                    editor.getLayoutInfo();
                  } catch {
                    return;
                  }
                  
                  const targetModel = monaco.editor
                    .getModels()
                    .find((m) => {
                      if (m.isDisposed()) {
                        return false;
                      }
                      const modelPath = m.uri.fsPath || m.uri.path;
                      return modelPath === definition.uri;
                    });
                  if (targetModel && editor) {
                    try {
                      editor.setModel(targetModel);
                      editor.setPosition({
                        lineNumber: definition.range.startLineNumber,
                        column: definition.range.startColumn,
                      });
                      editor.revealLineInCenter(definition.range.startLineNumber);
                    } catch (error) {
                      console.warn("Ошибка перехода к определению:", error);
                    }
                  }
                }, 100);
              });
            }

            return [
              {
                uri,
                range: {
                  startLineNumber: definition.range.startLineNumber,
                  startColumn: definition.range.startColumn,
                  endLineNumber: definition.range.endLineNumber,
                  endColumn: definition.range.endColumn,
                },
              },
            ];
          } catch (error) {
            console.error("Ошибка поиска определения:", error);
            return [];
          }
        },
      });
    });

    return () => {
      disposables.forEach((disposable) => {
        try {
          disposable.dispose();
        } catch {
          // Игнорируем ошибки при очистке
        }
      });
    };
  }, [isEditorReady, editor, monaco, getProjectFiles, onOpenFile]);

  // Обработка Ctrl+Click
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

    let isMouseDown = false;

    const mouseDownHandler = editor.onMouseDown((e) => {
      if (!editor || !monaco) {
        return;
      }

      // Проверяем, что редактор не уничтожен
      try {
        editor.getLayoutInfo();
      } catch {
        return;
      }

      isMouseDown = true;

      // Если нажат Ctrl/Cmd и клик по тексту, выполняем переход к определению
      if (
        (e.event.ctrlKey || e.event.metaKey) &&
        e.target &&
        e.target.position
      ) {
        const position = e.target.position;
        const model = editor.getModel();

        if (model && position && !model.isDisposed()) {
          setTimeout(async () => {
            if (!editor || !monaco || !isMouseDown) {
              return;
            }

            try {
              editor.getLayoutInfo();
              const currentModel = editor.getModel();
              if (!currentModel || currentModel.isDisposed()) {
                return;
              }
            } catch {
              return;
            }

            await navigateToDefinition(editor, monaco, position, model);
          }, 50);
        }
      }
    });

    const mouseUpHandler = editor.onMouseUp(() => {
      isMouseDown = false;
    });

    mouseHandlersRef.current.push(mouseDownHandler, mouseUpHandler);

    // Переопределяем стандартную команду Monaco для перехода при наведении
    const shiftF12Disposable = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.F12,
      () => {
        // Пустая команда, чтобы переопределить стандартное поведение
      }
    );

    // addCommand может возвращать IDisposable или string, проверяем тип
    if (shiftF12Disposable && typeof shiftF12Disposable !== 'string') {
      commandDisposablesRef.current.push(shiftF12Disposable);
    }

    return () => {
      mouseHandlersRef.current.forEach((disposable) => {
        try {
          disposable.dispose();
        } catch {
          // Игнорируем ошибки при очистке
        }
      });
      mouseHandlersRef.current = [];
    };
  }, [isEditorReady, editor, monaco, navigateToDefinition]);
}


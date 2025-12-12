import { useEffect, useRef } from "react";
import type * as monaco from "monaco-editor";
import type { EditorFile } from "@/types/editor";

interface UseMonacoModelOptions {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  monaco: Monaco | null;
  activeFile: EditorFile | undefined;
  isEditorReady: boolean;
}

type Monaco = typeof import("monaco-editor");

/**
 * Хук для управления моделями Monaco Editor
 */
export function useMonacoModel({
  editor,
  monaco,
  activeFile,
  isEditorReady,
}: UseMonacoModelOptions) {
  const modelsRef = useRef<Map<string, monaco.editor.ITextModel>>(new Map());
  const isDisposedRef = useRef(false);

  useEffect(() => {
    if (!isEditorReady || !editor || !monaco || !activeFile?.path) {
      return;
    }

    // Проверяем флаг уничтожения
    if (isDisposedRef.current) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    // Функция для проверки готовности DOM редактора
    const isEditorDOMReady = (): boolean => {
      try {
        if (!editor) return false;
        
        // Проверяем наличие DOM-узла редактора
        const container = editor.getContainerDomNode();
        if (!container || !container.parentElement) {
          return false;
        }

        // Проверяем, что контейнер видим
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          return false;
        }

        // Проверяем layoutInfo
        const layoutInfo = editor.getLayoutInfo();
        if (!layoutInfo) {
          return false;
        }

        return true;
      } catch (error) {
        return false;
      }
    };

    // Функция для установки модели с повторными попытками
    const trySetModel = (attempt = 0): void => {
      if (!editor || !monaco || !activeFile?.path || isDisposedRef.current) {
        return;
      }

      // Максимум 5 попыток
      if (attempt > 5) {
        console.warn("Не удалось установить модель после нескольких попыток");
        return;
      }

      // Проверяем готовность DOM
      if (!isEditorDOMReady()) {
        // Если DOM не готов, откладываем попытку
        timeoutId = setTimeout(() => {
          trySetModel(attempt + 1);
        }, 50);
        return;
      }

      try {
        // Проверяем, что редактор еще существует и не уничтожен
        let currentModel: monaco.editor.ITextModel | null = null;
        try {
          currentModel = editor.getModel();
          editor.getLayoutInfo();
        } catch (error) {
          // Редактор уничтожен или не готов
          return;
        }

        const uri = monaco.Uri.file(activeFile.path);

        // Получаем или создаем модель
        let model = modelsRef.current.get(activeFile.path);
        if (!model) {
          model = monaco.editor.getModel(uri);
          if (!model) {
            try {
              model = monaco.editor.createModel(
                activeFile.content,
                activeFile.language,
                uri
              );
              modelsRef.current.set(activeFile.path, model);
            } catch (error) {
              console.warn("Ошибка создания модели:", error);
              return;
            }
          } else {
            modelsRef.current.set(activeFile.path, model);
          }
        }

        // Проверяем, что модель не уничтожена
        if (model.isDisposed()) {
          modelsRef.current.delete(activeFile.path);
          try {
            model = monaco.editor.createModel(
              activeFile.content,
              activeFile.language,
              uri
            );
            modelsRef.current.set(activeFile.path, model);
          } catch (error) {
            console.warn("Ошибка пересоздания модели:", error);
            return;
          }
        }

        // Обновляем содержимое модели, если оно изменилось
        if (model.getValue() !== activeFile.content) {
          try {
            model.setValue(activeFile.content);
          } catch (error) {
            console.warn("Ошибка обновления содержимого модели:", error);
            return;
          }
        }

        // Устанавливаем модель в редактор только если она отличается от текущей
        if (currentModel !== model) {
          editor.setModel(model);
        }
      } catch (error) {
        // Редактор был уничтожен во время операции
        console.warn("Ошибка установки модели в редактор:", error);
        if (attempt < 3) {
          // Повторяем попытку через небольшую задержку
          timeoutId = setTimeout(() => {
            trySetModel(attempt + 1);
          }, 100);
        } else {
          isDisposedRef.current = true;
        }
      }
    };

    // Используем requestAnimationFrame для установки модели после полной готовности DOM
    const rafId = requestAnimationFrame(() => {
      // Дополнительная задержка для гарантии готовности DOM
      timeoutId = setTimeout(() => {
        trySetModel();
      }, 50);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    editor,
    monaco,
    activeFile?.path,
    activeFile?.content,
    activeFile?.language,
    isEditorReady,
  ]);

  // Сброс флага при изменении редактора
  useEffect(() => {
    if (editor && isEditorReady) {
      isDisposedRef.current = false;
    }
  }, [editor, isEditorReady]);

  // Очистка моделей при размонтировании
  useEffect(() => {
    return () => {
      isDisposedRef.current = true;
      modelsRef.current.forEach((model) => {
        try {
          if (!model.isDisposed()) {
            model.dispose();
          }
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      });
      modelsRef.current.clear();
    };
  }, []);

  return {
    getModel: (filePath: string) => modelsRef.current.get(filePath),
  };
}


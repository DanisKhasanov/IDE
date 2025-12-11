import { useState, useEffect, useRef, useCallback } from "react";
import type { EditorFile } from "@/types/editor";

interface ProjectFile {
  path: string;
  content: string;
}

/**
 * Хук для загрузки и кэширования файлов проекта
 */
export function useProjectFiles(
  currentProjectPath: string | null | undefined,
  openFiles: EditorFile[]
) {
  const [projectFilesCache, setProjectFilesCache] = useState<
    Map<string, ProjectFile>
  >(new Map());
  const isLoadingRef = useRef(false);

  const loadProjectFiles = useCallback(async () => {
    if (!currentProjectPath || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    try {
      const sourceFiles =
        await window.electronAPI.getProjectSourceFiles(currentProjectPath);

      const filesData = await Promise.all(
        sourceFiles.map(async (filePath: string) => {
          try {
            // Проверяем, не открыт ли файл уже в редакторе
            const openFile = openFiles.find((f) => f.path === filePath);
            if (openFile) {
              return {
                path: filePath,
                content: openFile.content,
              };
            }

            // Загружаем файл с диска
            const fileData = await window.electronAPI.readFile(filePath);
            return {
              path: filePath,
              content: fileData.content,
            };
          } catch (error) {
            console.error(`Ошибка загрузки файла ${filePath}:`, error);
            return null;
          }
        })
      );

      const newCache = new Map<string, ProjectFile>();
      filesData.forEach((file) => {
        if (file) {
          newCache.set(file.path, file);
        }
      });
      setProjectFilesCache(newCache);
    } catch (error) {
      console.error("Ошибка загрузки файлов проекта:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [currentProjectPath, openFiles]);

  // Загрузка файлов при изменении проекта или открытых файлов
  useEffect(() => {
    loadProjectFiles();
  }, [loadProjectFiles]);

  // Обновление кэша при изменении содержимого открытых файлов
  useEffect(() => {
    setProjectFilesCache((prevCache) => {
      const newCache = new Map(prevCache);
      openFiles.forEach((file) => {
        if (file.path) {
          const cached = newCache.get(file.path);
          if (!cached || cached.content !== file.content) {
            newCache.set(file.path, {
              path: file.path,
              content: file.content,
            });
          }
        }
      });
      return newCache;
    });
  }, [openFiles]);

  const getProjectFiles = useCallback((): ProjectFile[] => {
    return Array.from(projectFilesCache.values());
  }, [projectFilesCache]);

  return {
    projectFilesCache,
    getProjectFiles,
    reload: loadProjectFiles,
  };
}


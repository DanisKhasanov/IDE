import { useRef, useCallback } from "react";

export const useFileHandler = () => {
  const openFileHandlerRef = useRef<
    ((filePath: string) => Promise<void>) | null
  >(null);

  const handleFileOpen = useCallback(async (filePath: string) => {
    if (openFileHandlerRef.current) {
      await openFileHandlerRef.current(filePath);
    } else {
      throw new Error("Обработчик открытия файлов еще не готов");
    }
  }, []);

  const setFileHandler = useCallback(
    (handler: (filePath: string) => Promise<void>) => {
      openFileHandlerRef.current = handler;
    },
    []
  );

  return {
    handleFileOpen,
    setFileHandler,
  };
};





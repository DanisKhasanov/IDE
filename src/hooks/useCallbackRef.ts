import { useRef, useEffect, useCallback } from "react";

/**
 * Хук для создания ref с callback, который вызывается при изменении значения
 * Заменяет паттерн useRef + useEffect для случаев, когда нужно синхронизировать ref с внешним API
 */
export function useCallbackRef<T>(
  callback: ((value: T | null) => void) | null | undefined,
  deps: React.DependencyList = []
): React.MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(callback);

  // Обновляем ref callback при изменении
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (callbackRef.current) {
      callbackRef.current(ref.current);
    }
  }, deps);

  return ref;
}


import { useCallback, useRef, useState, useEffect } from "react";

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingArgsRef.current = null;
    if (isMountedRef.current) {
      setIsPending(false);
    }
  }, []);

  const run = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      pendingArgsRef.current = args;
      if (isMountedRef.current) {
        setIsPending(true);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        pendingArgsRef.current = null;

        const result = callback(...args);

        if (result && typeof result.then === "function") {
          result.then(
            () => {
              if (isMountedRef.current) setIsPending(false);
            },
            () => {
              if (isMountedRef.current) setIsPending(false);
            }
          );
        } else {
          if (isMountedRef.current) setIsPending(false);
        }
      }, delay);
    },
    [callback, delay]
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (pendingArgsRef.current) {
      const args = pendingArgsRef.current;
      pendingArgsRef.current = null;

      const result = callback(...args);

      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (isMountedRef.current) setIsPending(false);
          },
          () => {
            if (isMountedRef.current) setIsPending(false);
          }
        );
      } else {
        if (isMountedRef.current) setIsPending(false);
      }
    }
  }, [callback]);

  return {
    run,
    flush,
    cancel,
    isPending,
  };
}

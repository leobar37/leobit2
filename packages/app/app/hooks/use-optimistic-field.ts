import { useCallback, useRef, useState, useEffect } from "react";
import { useDebouncedCallback } from "./use-debounced-callback";

interface UseOptimisticFieldOptions<T> {
  initialValue: T;
  onUpdate: (value: T) => Promise<void>;
  debounceMs?: number;
  onError?: (error: Error, value: T) => void;
  onSuccess?: (value: T) => void;
}

interface UseOptimisticFieldResult<T> {
  value: T;
  setValue: (value: T) => void;
  isSaving: boolean;
  isError: boolean;
  error: Error | null;
  flush: () => void;
  revert: () => void;
  lastSavedValue: T;
}

export function useOptimisticField<T>(
  options: UseOptimisticFieldOptions<T>
): UseOptimisticFieldResult<T> {
  const { initialValue, onUpdate, debounceMs = 400, onError, onSuccess } = options;

  const [localValue, setLocalValue] = useState<T>(initialValue);
  const [lastSavedValue, setLastSavedValue] = useState<T>(initialValue);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeUpdate = useCallback(
    async (valueToSave: T) => {
      if (!isMountedRef.current) return;

      try {
        await onUpdate(valueToSave);

        if (isMountedRef.current) {
          setLastSavedValue(valueToSave);
          setIsError(false);
          setError(null);
          isDirtyRef.current = false;
          onSuccess?.(valueToSave);
        }
      } catch (err) {
        if (isMountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setIsError(true);
          setError(error);
          setLocalValue(lastSavedValue);
          isDirtyRef.current = false;
          onError?.(error, valueToSave);
        }
      }
    },
    [onUpdate, onSuccess, onError, lastSavedValue]
  );

  const debounced = useDebouncedCallback(executeUpdate, debounceMs);

  const setValue = useCallback(
    (newValue: T) => {
      isDirtyRef.current = true;
      setLocalValue(newValue);
      setIsError(false);
      setError(null);
      debounced.run(newValue);
    },
    [debounced]
  );

  const flush = useCallback(() => {
    debounced.flush();
  }, [debounced]);

  const revert = useCallback(() => {
    debounced.cancel();
    setLocalValue(lastSavedValue);
    setIsError(false);
    setError(null);
    isDirtyRef.current = false;
  }, [debounced, lastSavedValue]);

  useEffect(() => {
    const isExternallyChanged = JSON.stringify(initialValue) !== JSON.stringify(lastSavedValue);
    const hasPendingChanges = debounced.isPending || isDirtyRef.current;

    if (isExternallyChanged && !hasPendingChanges) {
      setLocalValue(initialValue);
      setLastSavedValue(initialValue);
      setIsError(false);
      setError(null);
      isDirtyRef.current = false;
    }
  }, [initialValue, debounced.isPending, lastSavedValue]);

  return {
    value: localValue,
    setValue,
    isSaving: debounced.isPending,
    isError,
    error,
    flush,
    revert,
    lastSavedValue,
  };
}
